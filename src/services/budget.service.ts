import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-response";
import {
  formatCurrency,
  getCurrentYearMonthInTimezone,
  getMonthLabel,
  getMonthRangeInTimezone,
  getPreviousMonth,
  roundMoney,
  toMoneyNumber,
} from "@/lib/utils";
import { calculateBudgetUtilization } from "@/services/finance-math";
import { assertPermittedCategory } from "@/services/category.service";
import { createNotificationIfNotExists } from "@/services/notification.service";
import type { BudgetWithUsageDTO } from "@/types";

export async function listBudgetsWithUsage(
  userId: string,
  month: number,
  year: number,
  timezone = "Asia/Kolkata"
): Promise<BudgetWithUsageDTO[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      warningThreshold: true,
      highThreshold: true,
      exceededThreshold: true,
    },
  });

  const thresholds = {
    warning: user?.warningThreshold ?? 75,
    high: user?.highThreshold ?? 90,
    exceeded: user?.exceededThreshold ?? 100,
  };

  const { start, end } = getMonthRangeInTimezone(year, month, timezone);

  const [budgets, expensesByCategory, overallExpense] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: [{ categoryId: "asc" }, { createdAt: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const catSpendMap = new Map(
    expensesByCategory.map((e) => [e.categoryId, toMoneyNumber(e._sum.amount)])
  );
  const totalSpent = toMoneyNumber(overallExpense._sum.amount);

  return budgets
    .map((b) => {
      const isOverall = b.categoryId === null;
      const spentAmount = isOverall ? totalSpent : catSpendMap.get(b.categoryId!) ?? 0;
      const limitAmount = toMoneyNumber(b.limitAmount);
      const calc = calculateBudgetUtilization(spentAmount, limitAmount, thresholds);

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: isOverall ? "Overall Monthly Budget" : b.category?.name ?? "Category",
        categoryColor: isOverall ? "#0F172A" : b.category?.color ?? "#3B82F6",
        categoryIcon: isOverall ? "Wallet" : b.category?.icon ?? "Tag",
        month: b.month,
        year: b.year,
        limitAmount,
        spentAmount,
        remainingAmount: calc.remainingAmount,
        utilizationPercent: calc.utilizationPercent,
        status: calc.status,
        isOverall,
      };
    })
    .sort((a, b) => (a.isOverall === b.isOverall ? b.utilizationPercent - a.utilizationPercent : a.isOverall ? -1 : 1));
}

export async function upsertBudget(
  userId: string,
  input: {
    categoryId?: string | null;
    month: number;
    year: number;
    limitAmount: number;
  },
  timezone = "Asia/Kolkata"
): Promise<BudgetWithUsageDTO> {
  if (input.limitAmount <= 0) {
    throw new AppError("Budget limit must be positive", 400, "INVALID_BUDGET_LIMIT");
  }

  const categoryId = input.categoryId ?? null;
  if (categoryId) {
    await assertPermittedCategory(userId, categoryId, "EXPENSE");
  }

  const budgetKey = categoryId ?? "OVERALL";

  const existing = await prisma.budget.findUnique({
    where: {
      userId_budgetKey_month_year: {
        userId,
        budgetKey,
        month: input.month,
        year: input.year,
      },
    },
  });

  if (existing) {
    throw new AppError(
      categoryId
        ? "A budget for this category and month already exists"
        : "An overall monthly budget for this month already exists",
      409,
      "DUPLICATE_BUDGET"
    );
  }

  const created = await prisma.budget.create({
    data: {
      userId,
      categoryId,
      budgetKey,
      month: input.month,
      year: input.year,
      limitAmount: roundMoney(input.limitAmount),
    },
  });

  await evaluateBudgetAlertsForUserMonth(userId, input.month, input.year);

  const list = await listBudgetsWithUsage(userId, input.month, input.year, timezone);
  const found = list.find((b) => b.id === created.id);
  if (!found) throw new AppError("Budget creation failed", 500, "INTERNAL_SERVER_ERROR");
  return found;
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  limitAmount: number,
  timezone = "Asia/Kolkata"
): Promise<BudgetWithUsageDTO> {
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });
  if (!existing) {
    throw new AppError("Budget not found", 404, "NOT_FOUND");
  }

  await prisma.budget.update({
    where: { id: budgetId },
    data: { limitAmount: roundMoney(limitAmount) },
  });

  await evaluateBudgetAlertsForUserMonth(userId, existing.month, existing.year);

  const list = await listBudgetsWithUsage(userId, existing.month, existing.year, timezone);
  const found = list.find((b) => b.id === budgetId);
  if (!found) throw new AppError("Budget update failed", 500, "INTERNAL_SERVER_ERROR");
  return found;
}

export async function deleteBudget(userId: string, budgetId: string) {
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });
  if (!existing) {
    throw new AppError("Budget not found", 404, "NOT_FOUND");
  }
  await prisma.budget.delete({ where: { id: budgetId } });
  return { deleted: true };
}

export async function getBudgetHistory(
  userId: string,
  months = 6,
  timezone = "Asia/Kolkata"
) {
  let { year, month } = getCurrentYearMonthInTimezone(timezone);
  const history: Array<{
    month: number;
    year: number;
    label: string;
    overallLimit: number | null;
    overallSpent: number;
    utilizationPercent: number;
    budgetsCount: number;
  }> = [];

  for (let i = 0; i < months; i++) {
    const budgets = await listBudgetsWithUsage(userId, month, year, timezone);
    const overall = budgets.find((b) => b.isOverall);
    const { start, end } = getMonthRangeInTimezone(year, month, timezone);
    const agg = await prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const spent = toMoneyNumber(agg._sum.amount);

    history.push({
      month,
      year,
      label: getMonthLabel(year, month),
      overallLimit: overall ? overall.limitAmount : null,
      overallSpent: spent,
      utilizationPercent: overall ? overall.utilizationPercent : 0,
      budgetsCount: budgets.length,
    });

    const prev = getPreviousMonth(year, month);
    year = prev.year;
    month = prev.month;
  }

  return history.reverse();
}

export async function evaluateBudgetAlertsForUserMonth(
  userId: string,
  month: number,
  year: number
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currency: true,
      timezone: true,
      warningThreshold: true,
      highThreshold: true,
      exceededThreshold: true,
    },
  });
  if (!user) return;

  const budgets = await listBudgetsWithUsage(userId, month, year, user.timezone);
  const monthLabel = getMonthLabel(year, month);

  for (const b of budgets) {
    if (b.status === "OK") continue;

    if (b.status === "EXCEEDED") {
      await createNotificationIfNotExists({
        userId,
        type: "BUDGET_EXCEEDED",
        title: `${b.categoryName} budget exceeded`,
        message: `You have spent ${formatCurrency(b.spentAmount, user.currency)} against your ${formatCurrency(
          b.limitAmount,
          user.currency
        )} ${b.categoryName.toLowerCase()} limit for ${monthLabel} (${b.utilizationPercent}%).`,
        dedupeKey: `budget:${b.id}:${year}-${month}:EXCEEDED`,
        relatedId: b.id,
      });
    } else if (b.status === "HIGH") {
      await createNotificationIfNotExists({
        userId,
        type: "BUDGET_HIGH",
        title: `${b.categoryName} budget at ${b.utilizationPercent}%`,
        message: `High spending alert: ${b.categoryName} has reached ${b.utilizationPercent}% of its ${formatCurrency(
          b.limitAmount,
          user.currency
        )} limit for ${monthLabel}.`,
        dedupeKey: `budget:${b.id}:${year}-${month}:HIGH`,
        relatedId: b.id,
      });
    } else if (b.status === "WARNING") {
      await createNotificationIfNotExists({
        userId,
        type: "BUDGET_WARNING",
        title: `${b.categoryName} budget nearing limit`,
        message: `You have used ${b.utilizationPercent}% (${formatCurrency(
          b.spentAmount,
          user.currency
        )}) of your ${b.categoryName} budget for ${monthLabel}.`,
        dedupeKey: `budget:${b.id}:${year}-${month}:WARNING`,
        relatedId: b.id,
      });
    }
  }
}
