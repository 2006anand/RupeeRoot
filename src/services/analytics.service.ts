import { prisma } from "@/lib/db";
import {
  getCurrentYearMonthInTimezone,
  getDayRangeInTimezone,
  getDaysInMonth,
  getMonthLabel,
  getMonthRangeInTimezone,
  getPreviousMonth,
  roundMoney,
  toISODateInTimezone,
  toMoneyNumber,
} from "@/lib/utils";
import {
  calculateCashFlowSummary,
  calculateWellnessScore,
  summarizeByCategory,
} from "@/services/finance-math";
import { listBudgetsWithUsage } from "@/services/budget.service";

export type AnalyticsPeriod =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "custom";

export function resolvePeriodRange(
  period: AnalyticsPeriod,
  timezone = "Asia/Kolkata",
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date; label: string; monthsCount: number } {
  const { year, month } = getCurrentYearMonthInTimezone(timezone);

  if (period === "custom" && customStart && customEnd) {
    return {
      start: getDayRangeInTimezone(customStart, timezone).start,
      end: getDayRangeInTimezone(customEnd, timezone).end,
      label: `${customStart} to ${customEnd}`,
      monthsCount: 1,
    };
  }

  if (period === "previous_month") {
    const prev = getPreviousMonth(year, month);
    const range = getMonthRangeInTimezone(prev.year, prev.month, timezone);
    return { ...range, label: getMonthLabel(prev.year, prev.month), monthsCount: 1 };
  }

  if (
    period === "last_3_months" ||
    period === "last_6_months" ||
    period === "last_12_months"
  ) {
    const count =
      period === "last_3_months" ? 3 : period === "last_6_months" ? 6 : 12;
    let startY = year;
    let startM = month;
    for (let i = 1; i < count; i++) {
      const p = getPreviousMonth(startY, startM);
      startY = p.year;
      startM = p.month;
    }
    const { start } = getMonthRangeInTimezone(startY, startM, timezone);
    const { end } = getMonthRangeInTimezone(year, month, timezone);
    return { start, end, label: `Last ${count} Months`, monthsCount: count };
  }

  const range = getMonthRangeInTimezone(year, month, timezone);
  return { ...range, label: getMonthLabel(year, month), monthsCount: 1 };
}

export async function getAnalyticsSummary(
  userId: string,
  period: AnalyticsPeriod = "current_month",
  timezone = "Asia/Kolkata",
  customStart?: string,
  customEnd?: string
) {
  const { start, end, label } = resolvePeriodRange(period, timezone, customStart, customEnd);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
    include: { category: { select: { name: true, color: true, icon: true } } },
    orderBy: { date: "asc" },
  });

  const numeric = transactions.map((t) => ({
    amount: toMoneyNumber(t.amount),
    type: t.type,
    categoryId: t.categoryId,
    categoryName: t.category.name,
    categoryColor: t.category.color,
    categoryIcon: t.category.icon,
    date: t.date,
  }));

  const cashFlow = calculateCashFlowSummary(numeric);
  const expenseCategories = summarizeByCategory(numeric, "EXPENSE");
  const incomeCategories = summarizeByCategory(numeric, "INCOME");

  const msPerDay = 86_400_000;
  const { year, month, day } = getCurrentYearMonthInTimezone(timezone);
  let activeDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
  if (period === "current_month") {
    activeDays = Math.max(1, day);
  }
  const averageDailyExpense = roundMoney(cashFlow.totalExpenses / activeDays);

  // Month-over-month comparison
  const currentRange = getMonthRangeInTimezone(year, month, timezone);
  const prevYm = getPreviousMonth(year, month);
  const prevRange = getMonthRangeInTimezone(prevYm.year, prevYm.month, timezone);

  const [currMonthAgg, prevMonthAgg, budgets] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: currentRange.start, lte: currentRange.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: prevRange.start, lte: prevRange.end } },
      _sum: { amount: true },
    }),
    listBudgetsWithUsage(userId, month, year, timezone),
  ]);

  const currMonthExp = toMoneyNumber(currMonthAgg._sum.amount);
  const prevMonthExp = toMoneyNumber(prevMonthAgg._sum.amount);
  const momExpenseChangePercent =
    prevMonthExp > 0
      ? roundMoney(((currMonthExp - prevMonthExp) / prevMonthExp) * 100)
      : null;

  const overallBudget = budgets.find((b) => b.isOverall) ?? null;

  return {
    periodLabel: label,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    transactionCount: transactions.length,
    ...cashFlow,
    averageDailyExpense,
    highestCategory: expenseCategories[0] ?? null,
    momExpenseChangePercent,
    previousMonthExpenses: prevMonthExp,
    currentMonthExpenses: currMonthExp,
    overallBudget,
    expenseCategories,
    incomeCategories,
  };
}

export async function getAnalyticsTrends(
  userId: string,
  period: AnalyticsPeriod = "current_month",
  timezone = "Asia/Kolkata",
  customStart?: string,
  customEnd?: string
) {
  const { start, end } = resolvePeriodRange(period, timezone, customStart, customEnd);
  const { year, month } = getCurrentYearMonthInTimezone(timezone);

  // Daily series for selected period
  const periodTx = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { amount: true, type: true, date: true },
    orderBy: { date: "asc" },
  });

  const dailyMap = new Map<string, { date: string; income: number; expense: number }>();
  for (const tx of periodTx) {
    const key = toISODateInTimezone(tx.date, timezone);
    const entry = dailyMap.get(key) ?? { date: key, income: 0, expense: 0 };
    const amt = toMoneyNumber(tx.amount);
    if (tx.type === "INCOME") entry.income = roundMoney(entry.income + amt);
    else entry.expense = roundMoney(entry.expense + amt);
    dailyMap.set(key, entry);
  }
  const dailyTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Monthly series for last 6 months (for Income vs Expense & Monthly Expense Comparison)
  const monthlySeries: Array<{
    month: number;
    year: number;
    label: string;
    income: number;
    expense: number;
    net: number;
  }> = [];

  let curY = year;
  let curM = month;
  const ymList: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < 6; i++) {
    ymList.push({ year: curY, month: curM });
    const prev = getPreviousMonth(curY, curM);
    curY = prev.year;
    curM = prev.month;
  }
  ymList.reverse();

  const sixMonthStart = getMonthRangeInTimezone(ymList[0].year, ymList[0].month, timezone).start;
  const sixMonthEnd = getMonthRangeInTimezone(
    ymList[ymList.length - 1].year,
    ymList[ymList.length - 1].month,
    timezone
  ).end;

  const sixMonthTx = await prisma.transaction.findMany({
    where: { userId, date: { gte: sixMonthStart, lte: sixMonthEnd } },
    include: { category: { select: { name: true, color: true } } },
  });

  const monthBuckets = new Map<string, { income: number; expense: number }>();
  for (const ym of ymList) {
    monthBuckets.set(`${ym.year}-${ym.month}`, { income: 0, expense: 0 });
  }

  for (const tx of sixMonthTx) {
    const txYm = getCurrentYearMonthInTimezone(timezone, tx.date);
    const bucket = monthBuckets.get(`${txYm.year}-${txYm.month}`);
    if (!bucket) continue;
    const amt = toMoneyNumber(tx.amount);
    if (tx.type === "INCOME") bucket.income = roundMoney(bucket.income + amt);
    else bucket.expense = roundMoney(bucket.expense + amt);
  }

  for (const ym of ymList) {
    const bucket = monthBuckets.get(`${ym.year}-${ym.month}`)!;
    monthlySeries.push({
      year: ym.year,
      month: ym.month,
      label: getMonthLabel(ym.year, ym.month),
      income: bucket.income,
      expense: bucket.expense,
      net: roundMoney(bucket.income - bucket.expense),
    });
  }

  // Category comparison: current month vs previous month
  const prevYm = getPreviousMonth(year, month);
  const currRange = getMonthRangeInTimezone(year, month, timezone);
  const prevRange = getMonthRangeInTimezone(prevYm.year, prevYm.month, timezone);

  const categoryComparisonMap = new Map<
    string,
    { category: string; currentMonth: number; previousMonth: number; color: string }
  >();

  for (const tx of sixMonthTx) {
    if (tx.type !== "EXPENSE") continue;
    const t = tx.date.getTime();
    const inCurr = t >= currRange.start.getTime() && t <= currRange.end.getTime();
    const inPrev = t >= prevRange.start.getTime() && t <= prevRange.end.getTime();
    if (!inCurr && !inPrev) continue;
    const existing = categoryComparisonMap.get(tx.category.name) ?? {
      category: tx.category.name,
      currentMonth: 0,
      previousMonth: 0,
      color: tx.category.color,
    };
    const amt = toMoneyNumber(tx.amount);
    if (inCurr) existing.currentMonth = roundMoney(existing.currentMonth + amt);
    if (inPrev) existing.previousMonth = roundMoney(existing.previousMonth + amt);
    categoryComparisonMap.set(tx.category.name, existing);
  }

  const categoryComparison = Array.from(categoryComparisonMap.values()).sort(
    (a, b) => b.currentMonth + b.previousMonth - (a.currentMonth + a.previousMonth)
  );

  return {
    dailyTrend,
    monthlySeries,
    categoryComparison,
  };
}

export async function getWellnessScore(userId: string, timezone = "Asia/Kolkata") {
  const { year, month } = getCurrentYearMonthInTimezone(timezone);
  const { start, end } = getMonthRangeInTimezone(year, month, timezone);
  const daysInMonth = getDaysInMonth(year, month);

  const [txs, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { amount: true, type: true, date: true },
    }),
    listBudgetsWithUsage(userId, month, year, timezone),
  ]);

  const cashFlow = calculateCashFlowSummary(
    txs.map((t) => ({ amount: toMoneyNumber(t.amount), type: t.type }))
  );

  const dailyTotals = new Array<number>(daysInMonth).fill(0);
  for (const tx of txs) {
    if (tx.type !== "EXPENSE") continue;
    const d = getCurrentYearMonthInTimezone(timezone, tx.date).day;
    if (d >= 1 && d <= daysInMonth) {
      dailyTotals[d - 1] = roundMoney(dailyTotals[d - 1] + toMoneyNumber(tx.amount));
    }
  }

  const overallBudget = budgets.find((b) => b.isOverall);

  return calculateWellnessScore({
    totalIncome: cashFlow.totalIncome,
    totalExpenses: cashFlow.totalExpenses,
    overallBudgetLimit: overallBudget ? overallBudget.limitAmount : null,
    dailyExpenses: dailyTotals,
    transactionCount: txs.length,
  });
}
