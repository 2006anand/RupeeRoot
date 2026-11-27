import { prisma } from "@/lib/db";
import { SYSTEM_CATEGORIES } from "@/lib/default-categories";
import { AppError } from "@/lib/api-response";
import { getCurrentYearMonthInTimezone, getMonthRangeInTimezone, toMoneyNumber } from "@/lib/utils";
import type { CategoryDTO, TransactionType } from "@/types";

export async function ensureSystemCategories() {
  const existing = await prisma.category.findMany({
    where: { isSystem: true },
    select: { name: true, type: true },
  });
  const existingKeys = new Set(existing.map((c) => `${c.type}:${c.name.toLowerCase()}`));

  const toCreate = SYSTEM_CATEGORIES.filter(
    (c) => !existingKeys.has(`${c.type}:${c.name.toLowerCase()}`)
  );

  if (toCreate.length > 0) {
    await prisma.category.createMany({
      data: toCreate.map((c) => ({
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        isSystem: true,
        userId: null,
      })),
    });
  }
}

export async function listCategories(
  userId: string,
  options?: { type?: TransactionType; includeSpending?: boolean; timezone?: string }
): Promise<CategoryDTO[]> {
  await ensureSystemCategories();

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ isSystem: true }, { userId }],
      ...(options?.type ? { type: options.type } : {}),
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  if (!options?.includeSpending) {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isSystem: c.isSystem,
      userId: c.userId,
    }));
  }

  const tz = options.timezone ?? "Asia/Kolkata";
  const { year, month } = getCurrentYearMonthInTimezone(tz);
  const { start, end } = getMonthRangeInTimezone(year, month, tz);

  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const allTimeCounts = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId },
    _count: { id: true },
  });

  const monthMap = new Map(
    grouped.map((g) => [g.categoryId, toMoneyNumber(g._sum.amount)])
  );
  const countMap = new Map(allTimeCounts.map((g) => [g.categoryId, g._count.id]));

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    isSystem: c.isSystem,
    userId: c.userId,
    spent: monthMap.get(c.id) ?? 0,
    transactionCount: countMap.get(c.id) ?? 0,
  }));
}

export async function assertPermittedCategory(
  userId: string,
  categoryId: string,
  expectedType?: TransactionType
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isSystem: true }, { userId }],
    },
  });
  if (!category) {
    throw new AppError("Category not found or not accessible", 400, "INVALID_CATEGORY");
  }
  if (expectedType && category.type !== expectedType) {
    throw new AppError(
      `Category "${category.name}" is for ${category.type.toLowerCase()} transactions`,
      400,
      "CATEGORY_TYPE_MISMATCH"
    );
  }
  return category;
}

export async function createCategory(
  userId: string,
  input: { name: string; type: TransactionType; icon: string; color: string }
): Promise<CategoryDTO> {
  await ensureSystemCategories();

  const conflict = await prisma.category.findFirst({
    where: {
      type: input.type,
      name: { equals: input.name, mode: "insensitive" },
      OR: [{ isSystem: true }, { userId }],
    },
  });
  if (conflict) {
    throw new AppError(
      `A ${input.type.toLowerCase()} category named "${conflict.name}" already exists`,
      409,
      "CONFLICT"
    );
  }

  const created = await prisma.category.create({
    data: {
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      isSystem: false,
      userId,
    },
  });

  return {
    id: created.id,
    name: created.name,
    type: created.type,
    icon: created.icon,
    color: created.color,
    isSystem: created.isSystem,
    userId: created.userId,
    spent: 0,
    transactionCount: 0,
  };
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: { name?: string; type?: TransactionType; icon?: string; color?: string }
): Promise<CategoryDTO> {
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }
  if (existing.isSystem || existing.userId !== userId) {
    throw new AppError("System categories cannot be edited", 403, "FORBIDDEN");
  }

  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = await prisma.category.findFirst({
      where: {
        id: { not: categoryId },
        type: input.type ?? existing.type,
        name: { equals: input.name, mode: "insensitive" },
        OR: [{ isSystem: true }, { userId }],
      },
    });
    if (dup) {
      throw new AppError("A category with that name already exists", 409, "CONFLICT");
    }
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    type: updated.type,
    icon: updated.icon,
    color: updated.color,
    isSystem: updated.isSystem,
    userId: updated.userId,
  };
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
  reassignToCategoryId?: string
) {
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }
  if (existing.isSystem || existing.userId !== userId) {
    throw new AppError("System categories cannot be deleted", 403, "FORBIDDEN");
  }

  const [txCount, recurringCount] = await Promise.all([
    prisma.transaction.count({ where: { userId, categoryId } }),
    prisma.recurringTransaction.count({ where: { userId, categoryId } }),
  ]);

  if (txCount > 0 || recurringCount > 0) {
    if (!reassignToCategoryId) {
      throw new AppError(
        `Category is used by ${txCount} transaction(s) and ${recurringCount} recurring rule(s). Choose a replacement category to reassign them before deleting.`,
        409,
        "CATEGORY_IN_USE"
      );
    }
    if (reassignToCategoryId === categoryId) {
      throw new AppError("Replacement category must be different", 400, "BAD_REQUEST");
    }

    await assertPermittedCategory(userId, reassignToCategoryId, existing.type);

    await prisma.$transaction([
      prisma.transaction.updateMany({
        where: { userId, categoryId },
        data: { categoryId: reassignToCategoryId },
      }),
      prisma.recurringTransaction.updateMany({
        where: { userId, categoryId },
        data: { categoryId: reassignToCategoryId },
      }),
      prisma.category.delete({ where: { id: categoryId } }),
    ]);

    return { deleted: true, reassignedCount: txCount + recurringCount };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return { deleted: true, reassignedCount: 0 };
}
