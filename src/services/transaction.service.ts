import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-response";
import {
  getCurrentYearMonthInTimezone,
  getDayRangeInTimezone,
  parseTransactionDate,
  roundMoney,
  toISODateInTimezone,
  toMoneyNumber,
} from "@/lib/utils";
import { assertPermittedCategory, listCategories } from "@/services/category.service";
import { evaluateBudgetAlertsForUserMonth } from "@/services/budget.service";
import { csvImportRowSchema } from "@/lib/validation";
import type { PaymentMethod, TransactionDTO, TransactionType } from "@/types";

export interface TransactionFilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: TransactionType;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: "date" | "amount" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

function mapTransactionRow(tx: {
  id: string;
  title: string;
  amount: Prisma.Decimal;
  type: TransactionType;
  categoryId: string;
  date: Date;
  paymentMethod: PaymentMethod;
  notes: string | null;
  recurringId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string; color: string; icon: string };
}): TransactionDTO {
  return {
    id: tx.id,
    title: tx.title,
    amount: toMoneyNumber(tx.amount),
    type: tx.type,
    categoryId: tx.categoryId,
    categoryName: tx.category.name,
    categoryColor: tx.category.color,
    categoryIcon: tx.category.icon,
    date: tx.date.toISOString(),
    paymentMethod: tx.paymentMethod,
    notes: tx.notes,
    recurringId: tx.recurringId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilterParams,
  timezone = "Asia/Kolkata"
) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.TransactionWhereInput = { userId };

  if (filters.type) where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = getDayRangeInTimezone(filters.startDate, timezone).start;
    }
    if (filters.endDate) {
      where.date.lte = getDayRangeInTimezone(filters.endDate, timezone).end;
    }
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amount = {};
    if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
    if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
  }

  const sortBy = filters.sortBy ?? "date";
  const sortOrder = filters.sortOrder ?? "desc";

  const orderBy: Prisma.TransactionOrderByWithRelationInput[] = [
    { [sortBy]: sortOrder },
    { createdAt: "desc" },
  ];

  const [totalCount, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { category: { select: { name: true, color: true, icon: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapTransactionRow),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    },
  };
}

export async function getTransactionById(userId: string, transactionId: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { category: { select: { name: true, color: true, icon: true } } },
  });
  if (!tx) {
    throw new AppError("Transaction not found", 404, "NOT_FOUND");
  }
  return mapTransactionRow(tx);
}

export async function createTransaction(
  userId: string,
  input: {
    title: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    date: string;
    paymentMethod?: PaymentMethod;
    notes?: string | null;
  },
  timezone = "Asia/Kolkata"
): Promise<TransactionDTO> {
  await assertPermittedCategory(userId, input.categoryId, input.type);

  let parsedDate: Date;
  try {
    parsedDate = parseTransactionDate(input.date, timezone);
  } catch {
    throw new AppError("Invalid transaction date", 400, "INVALID_DATE");
  }

  const tx = await prisma.transaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      title: input.title,
      amount: roundMoney(input.amount),
      type: input.type,
      date: parsedDate,
      paymentMethod: input.paymentMethod ?? "UPI",
      notes: input.notes ?? null,
    },
    include: { category: { select: { name: true, color: true, icon: true } } },
  });

  if (tx.type === "EXPENSE") {
    const ym = getCurrentYearMonthInTimezone(timezone, tx.date);
    await evaluateBudgetAlertsForUserMonth(userId, ym.month, ym.year);
  }

  return mapTransactionRow(tx);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: {
    title?: string;
    amount?: number;
    type?: TransactionType;
    categoryId?: string;
    date?: string;
    paymentMethod?: PaymentMethod;
    notes?: string | null;
  },
  timezone = "Asia/Kolkata"
): Promise<TransactionDTO> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) {
    throw new AppError("Transaction not found", 404, "NOT_FOUND");
  }

  const nextType = input.type ?? existing.type;
  const nextCategoryId = input.categoryId ?? existing.categoryId;
  await assertPermittedCategory(userId, nextCategoryId, nextType);

  let nextDate = existing.date;
  if (input.date !== undefined) {
    try {
      nextDate = parseTransactionDate(input.date, timezone);
    } catch {
      throw new AppError("Invalid transaction date", 400, "INVALID_DATE");
    }
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.amount !== undefined ? { amount: roundMoney(input.amount) } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.date !== undefined ? { date: nextDate } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: { category: { select: { name: true, color: true, icon: true } } },
  });

  const oldYm = getCurrentYearMonthInTimezone(timezone, existing.date);
  const newYm = getCurrentYearMonthInTimezone(timezone, updated.date);
  await evaluateBudgetAlertsForUserMonth(userId, oldYm.month, oldYm.year);
  if (oldYm.month !== newYm.month || oldYm.year !== newYm.year) {
    await evaluateBudgetAlertsForUserMonth(userId, newYm.month, newYm.year);
  }

  return mapTransactionRow(updated);
}

export async function deleteTransaction(
  userId: string,
  transactionId: string,
  timezone = "Asia/Kolkata"
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) {
    throw new AppError("Transaction not found", 404, "NOT_FOUND");
  }

  await prisma.transaction.delete({ where: { id: transactionId } });

  if (existing.type === "EXPENSE") {
    const ym = getCurrentYearMonthInTimezone(timezone, existing.date);
    await evaluateBudgetAlertsForUserMonth(userId, ym.month, ym.year);
  }

  return { deleted: true };
}

export interface CsvCandidateRow {
  rowNumber: number;
  title: string;
  amount: string | number;
  type: string;
  categoryName: string;
  date: string;
  paymentMethod?: string;
  notes?: string | null;
}

export interface CsvValidatedRow {
  rowNumber: number;
  status: "VALID" | "DUPLICATE" | "ERROR";
  errors: string[];
  resolvedCategoryId?: string;
  normalized?: {
    title: string;
    amount: number;
    type: TransactionType;
    categoryName: string;
    date: string;
    paymentMethod: PaymentMethod;
    notes: string | null;
  };
}

export async function validateCsvImportRows(
  userId: string,
  rows: CsvCandidateRow[],
  timezone = "Asia/Kolkata"
): Promise<{
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: CsvValidatedRow[];
}> {
  const categories = await listCategories(userId);
  const catLookup = new Map<string, string>();
  for (const c of categories) {
    catLookup.set(`${c.type}:${c.name.toLowerCase()}`, c.id);
  }

  const existingTx = await prisma.transaction.findMany({
    where: { userId },
    select: { title: true, amount: true, type: true, date: true },
  });

  const existingFingerprints = new Set(
    existingTx.map(
      (t) =>
        `${t.type}|${toISODateInTimezone(t.date, timezone)}|${toMoneyNumber(t.amount).toFixed(2)}|${t.title
          .trim()
          .toLowerCase()}`
    )
  );
  const seenInBatch = new Set<string>();

  const evaluated: CsvValidatedRow[] = [];

  for (const raw of rows) {
    const normalizedInput = {
      ...raw,
      type: String(raw.type ?? "").trim().toUpperCase(),
      paymentMethod: String(raw.paymentMethod || "UPI")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_"),
    };

    const parsed = csvImportRowSchema.safeParse(normalizedInput);
    if (!parsed.success) {
      evaluated.push({
        rowNumber: raw.rowNumber,
        status: "ERROR",
        errors: parsed.error.errors.map((e) => e.message),
      });
      continue;
    }

    const d = parsed.data;
    const errors: string[] = [];

    let parsedDate: Date;
    try {
      parsedDate = parseTransactionDate(d.date, timezone);
    } catch {
      errors.push("Invalid date format (expected YYYY-MM-DD)");
      evaluated.push({ rowNumber: raw.rowNumber, status: "ERROR", errors });
      continue;
    }

    const catKey = `${d.type}:${d.categoryName.trim().toLowerCase()}`;
    const resolvedCategoryId =
      catLookup.get(catKey) ?? catLookup.get(`${d.type}:other`);

    if (!resolvedCategoryId) {
      errors.push(`Unknown ${d.type.toLowerCase()} category "${d.categoryName}"`);
      evaluated.push({ rowNumber: raw.rowNumber, status: "ERROR", errors });
      continue;
    }

    const isoDay = toISODateInTimezone(parsedDate, timezone);
    const fingerprint = `${d.type}|${isoDay}|${roundMoney(d.amount).toFixed(2)}|${d.title
      .trim()
      .toLowerCase()}`;

    const isDuplicate =
      existingFingerprints.has(fingerprint) || seenInBatch.has(fingerprint);
    seenInBatch.add(fingerprint);

    evaluated.push({
      rowNumber: raw.rowNumber,
      status: isDuplicate ? "DUPLICATE" : "VALID",
      errors: isDuplicate ? ["Duplicate transaction detected"] : [],
      resolvedCategoryId,
      normalized: {
        title: d.title,
        amount: roundMoney(d.amount),
        type: d.type,
        categoryName: d.categoryName,
        date: isoDay,
        paymentMethod: d.paymentMethod,
        notes: d.notes ?? null,
      },
    });
  }

  return {
    totalRows: evaluated.length,
    validCount: evaluated.filter((r) => r.status === "VALID").length,
    duplicateCount: evaluated.filter((r) => r.status === "DUPLICATE").length,
    errorCount: evaluated.filter((r) => r.status === "ERROR").length,
    rows: evaluated,
  };
}

export async function confirmCsvImport(
  userId: string,
  rows: CsvCandidateRow[],
  timezone = "Asia/Kolkata"
) {
  const preview = await validateCsvImportRows(userId, rows, timezone);
  const validRows = preview.rows.filter(
    (r) => r.status === "VALID" && r.resolvedCategoryId && r.normalized
  );

  if (validRows.length > 0) {
    await prisma.transaction.createMany({
      data: validRows.map((r) => ({
        userId,
        categoryId: r.resolvedCategoryId!,
        title: r.normalized!.title,
        amount: r.normalized!.amount,
        type: r.normalized!.type,
        date: parseTransactionDate(r.normalized!.date, timezone),
        paymentMethod: r.normalized!.paymentMethod,
        notes: r.normalized!.notes,
      })),
    });

    const affectedMonths = new Set<string>();
    for (const r of validRows) {
      if (r.normalized!.type === "EXPENSE") {
        const dt = parseTransactionDate(r.normalized!.date, timezone);
        const ym = getCurrentYearMonthInTimezone(timezone, dt);
        affectedMonths.add(`${ym.year}-${ym.month}`);
      }
    }
    for (const key of affectedMonths) {
      const [y, m] = key.split("-").map(Number);
      await evaluateBudgetAlertsForUserMonth(userId, m, y);
    }
  }

  return {
    totalRows: preview.totalRows,
    importedRows: validRows.length,
    failedRows: preview.errorCount,
    duplicateRows: preview.duplicateCount,
    errors: preview.rows
      .filter((r) => r.status !== "VALID")
      .map((r) => ({ rowNumber: r.rowNumber, status: r.status, errors: r.errors })),
  };
}
