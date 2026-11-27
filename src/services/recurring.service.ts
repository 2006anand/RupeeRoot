import { addMonths, addWeeks, addYears } from "date-fns";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-response";
import {
  formatCurrency,
  getCurrentYearMonthInTimezone,
  parseTransactionDate,
  roundMoney,
  toMoneyNumber,
} from "@/lib/utils";
import { assertPermittedCategory } from "@/services/category.service";
import { evaluateBudgetAlertsForUserMonth } from "@/services/budget.service";
import { createNotificationIfNotExists } from "@/services/notification.service";
import type { PaymentMethod, RecurrenceInterval, TransactionType } from "@/types";

export function advanceOccurrenceDate(date: Date, interval: RecurrenceInterval): Date {
  if (interval === "WEEKLY") return addWeeks(date, 1);
  if (interval === "MONTHLY") return addMonths(date, 1);
  return addYears(date, 1);
}

export async function listRecurringTransactions(userId: string) {
  const items = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: { category: { select: { name: true, color: true, icon: true } } },
    orderBy: [{ isActive: "desc" }, { nextOccurrence: "asc" }],
  });

  return items.map((r) => ({
    id: r.id,
    title: r.title,
    amount: toMoneyNumber(r.amount),
    type: r.type,
    categoryId: r.categoryId,
    categoryName: r.category.name,
    categoryColor: r.category.color,
    categoryIcon: r.category.icon,
    paymentMethod: r.paymentMethod,
    notes: r.notes,
    interval: r.interval,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate ? r.endDate.toISOString() : null,
    nextOccurrence: r.nextOccurrence.toISOString(),
    lastGeneratedAt: r.lastGeneratedAt ? r.lastGeneratedAt.toISOString() : null,
    isActive: r.isActive,
  }));
}

export async function createRecurringTransaction(
  userId: string,
  input: {
    title: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    paymentMethod?: PaymentMethod;
    notes?: string | null;
    interval: RecurrenceInterval;
    startDate: string;
    endDate?: string | null;
    isActive?: boolean;
  },
  timezone = "Asia/Kolkata"
) {
  await assertPermittedCategory(userId, input.categoryId, input.type);

  const startDate = parseTransactionDate(input.startDate, timezone);
  const endDate = input.endDate ? parseTransactionDate(input.endDate, timezone) : null;
  if (endDate && endDate < startDate) {
    throw new AppError("End date must be on or after start date", 400, "INVALID_DATE_RANGE");
  }

  return prisma.recurringTransaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      title: input.title,
      amount: roundMoney(input.amount),
      type: input.type,
      paymentMethod: input.paymentMethod ?? "UPI",
      notes: input.notes ?? null,
      interval: input.interval,
      startDate,
      endDate,
      nextOccurrence: startDate,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateRecurringTransaction(
  userId: string,
  recurringId: string,
  input: {
    title?: string;
    amount?: number;
    type?: TransactionType;
    categoryId?: string;
    paymentMethod?: PaymentMethod;
    notes?: string | null;
    interval?: RecurrenceInterval;
    startDate?: string;
    endDate?: string | null;
    isActive?: boolean;
  },
  timezone = "Asia/Kolkata"
) {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!existing) throw new AppError("Recurring rule not found", 404, "NOT_FOUND");

  const nextType = input.type ?? existing.type;
  const nextCategoryId = input.categoryId ?? existing.categoryId;
  await assertPermittedCategory(userId, nextCategoryId, nextType);

  return prisma.recurringTransaction.update({
    where: { id: recurringId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.amount !== undefined ? { amount: roundMoney(input.amount) } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.interval !== undefined ? { interval: input.interval } : {}),
      ...(input.startDate !== undefined
        ? { startDate: parseTransactionDate(input.startDate, timezone) }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? parseTransactionDate(input.endDate, timezone) : null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteRecurringTransaction(userId: string, recurringId: string) {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!existing) throw new AppError("Recurring rule not found", 404, "NOT_FOUND");
  await prisma.recurringTransaction.delete({ where: { id: recurringId } });
  return { deleted: true };
}

/**
 * Idempotently processes all due recurring transactions up to `asOf`.
 * Safe to invoke from cron, manual "Process Due Now" button, or dashboard load.
 */
export async function processDueRecurringTransactions(userId?: string, asOf = new Date()) {
  const dueRules = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextOccurrence: { lte: asOf },
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { currency: true, timezone: true } },
    },
  });

  let generatedCount = 0;
  const affectedUserMonths = new Set<string>();

  for (const rule of dueRules) {
    let cursor = new Date(rule.nextOccurrence);
    let safetyCounter = 0;

    // Cap catch-up iterations per call to 24 occurrences to avoid runaway loops
    while (cursor <= asOf && safetyCounter < 24) {
      safetyCounter += 1;
      if (rule.endDate && cursor > rule.endDate) {
        await prisma.recurringTransaction.update({
          where: { id: rule.id },
          data: { isActive: false },
        });
        break;
      }

      // Normalize occurrence timestamp to day-noon UTC/ISO boundary for unique constraint idempotency
      const occurrenceKeyDate = new Date(cursor.toISOString());

      try {
        await prisma.transaction.create({
          data: {
            userId: rule.userId,
            categoryId: rule.categoryId,
            title: rule.title,
            amount: rule.amount,
            type: rule.type,
            date: occurrenceKeyDate,
            paymentMethod: rule.paymentMethod,
            notes: rule.notes ? `${rule.notes} (Recurring)` : "Generated from recurring rule",
            recurringId: rule.id,
            recurringOccurrenceDate: occurrenceKeyDate,
          },
        });
        generatedCount += 1;

        const ym = getCurrentYearMonthInTimezone(rule.user.timezone, occurrenceKeyDate);
        if (rule.type === "EXPENSE") {
          affectedUserMonths.add(`${rule.userId}|${ym.year}|${ym.month}`);
        }

        await createNotificationIfNotExists({
          userId: rule.userId,
          type: "RECURRING_GENERATED",
          title: `Recurring ${rule.type.toLowerCase()} recorded: ${rule.title}`,
          message: `Recorded ${formatCurrency(
            toMoneyNumber(rule.amount),
            rule.user.currency
          )} for "${rule.title}".`,
          dedupeKey: `recurring:${rule.id}:${occurrenceKeyDate.toISOString().slice(0, 10)}`,
          relatedId: rule.id,
        });
      } catch {
        // Unique constraint (recurringId, recurringOccurrenceDate) guarantees zero duplicate generation
      }

      cursor = advanceOccurrenceDate(cursor, rule.interval);
    }

    const stillActive = !(rule.endDate && cursor > rule.endDate);
    await prisma.recurringTransaction.update({
      where: { id: rule.id },
      data: {
        nextOccurrence: cursor,
        lastGeneratedAt: asOf,
        isActive: stillActive,
      },
    });
  }

  for (const key of affectedUserMonths) {
    const [uId, y, m] = key.split("|");
    await evaluateBudgetAlertsForUserMonth(uId, Number(m), Number(y));
  }

  return { processedRules: dueRules.length, generatedCount };
}
