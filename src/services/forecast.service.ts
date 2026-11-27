import { prisma } from "@/lib/db";
import {
  getCurrentYearMonthInTimezone,
  getDaysInMonth,
  getMonthRangeInTimezone,
  getPreviousMonth,
  toMoneyNumber,
} from "@/lib/utils";
import { computeMonthlyForecast } from "@/services/finance-math";
import { listBudgetsWithUsage } from "@/services/budget.service";
import type { ForecastResult } from "@/types";

export async function getMonthlyForecast(
  userId: string,
  timezone = "Asia/Kolkata"
): Promise<ForecastResult> {
  const now = new Date();
  const { year, month, day } = getCurrentYearMonthInTimezone(timezone, now);
  const totalDays = getDaysInMonth(year, month);
  const { start, end } = getMonthRangeInTimezone(year, month, timezone);

  const currentExpenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start, lte: end },
    },
    select: { amount: true, date: true },
  });

  const currentSpending = currentExpenses.reduce(
    (sum, t) => sum + toMoneyNumber(t.amount),
    0
  );

  const sevenDaysAgoMs = now.getTime() - 7 * 86_400_000;
  const recentStartMs = Math.max(start.getTime(), sevenDaysAgoMs);
  const recent7DaySpending = currentExpenses
    .filter((t) => t.date.getTime() >= recentStartMs)
    .reduce((sum, t) => sum + toMoneyNumber(t.amount), 0);
  const recentDaysObserved = Math.min(7, Math.max(1, day));

  // Previous 3 months totals
  const previousMonthsTotals: number[] = [];
  let pY = year;
  let pM = month;
  for (let i = 0; i < 3; i++) {
    const prev = getPreviousMonth(pY, pM);
    pY = prev.year;
    pM = prev.month;
    const range = getMonthRangeInTimezone(pY, pM, timezone);
    const agg = await prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: range.start, lte: range.end } },
      _sum: { amount: true },
    });
    const total = toMoneyNumber(agg._sum.amount);
    if (total > 0) previousMonthsTotals.push(total);
  }

  const budgets = await listBudgetsWithUsage(userId, month, year, timezone);
  const overallBudget = budgets.find((b) => b.isOverall);

  return computeMonthlyForecast({
    month,
    year,
    elapsedDays: day,
    totalDays,
    currentSpending,
    recent7DaySpending,
    recentDaysObserved,
    monthlyBudget: overallBudget ? overallBudget.limitAmount : null,
    previousMonthsTotals,
    transactionCount: currentExpenses.length,
  });
}
