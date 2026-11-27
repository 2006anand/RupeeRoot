import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-response";
import { parseTransactionDate, roundMoney, toMoneyNumber } from "@/lib/utils";
import { calculateGoalProgress } from "@/services/finance-math";
import { createNotificationIfNotExists } from "@/services/notification.service";

export async function listSavingsGoals(userId: string) {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    include: {
      contributions: {
        orderBy: { contributedAt: "desc" },
        take: 10,
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return goals.map((g) => {
    const targetAmount = toMoneyNumber(g.targetAmount);
    const currentAmount = toMoneyNumber(g.currentAmount);
    const progress = calculateGoalProgress(currentAmount, targetAmount);

    return {
      id: g.id,
      title: g.title,
      targetAmount,
      currentAmount,
      remainingAmount: progress.remainingAmount,
      progressPercent: progress.progressPercent,
      isCompleted: progress.isCompleted,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      description: g.description,
      status: g.status,
      createdAt: g.createdAt.toISOString(),
      contributions: g.contributions.map((c) => ({
        id: c.id,
        amount: toMoneyNumber(c.amount),
        note: c.note,
        contributedAt: c.contributedAt.toISOString(),
      })),
    };
  });
}

export async function createSavingsGoal(
  userId: string,
  input: {
    title: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate?: string | null;
    description?: string | null;
  },
  timezone = "Asia/Kolkata"
) {
  const current = roundMoney(input.currentAmount ?? 0);
  const target = roundMoney(input.targetAmount);
  const status = current >= target ? "COMPLETED" : "ACTIVE";

  const goal = await prisma.$transaction(async (tx) => {
    const created = await tx.savingsGoal.create({
      data: {
        userId,
        title: input.title,
        targetAmount: target,
        currentAmount: current,
        targetDate: input.targetDate ? parseTransactionDate(input.targetDate, timezone) : null,
        description: input.description ?? null,
        status,
      },
    });
    if (current > 0) {
      await tx.savingsContribution.create({
        data: {
          goalId: created.id,
          userId,
          amount: current,
          note: "Initial savings balance",
        },
      });
    }
    return created;
  });

  return goal;
}

export async function updateSavingsGoal(
  userId: string,
  goalId: string,
  input: {
    title?: string;
    targetAmount?: number;
    targetDate?: string | null;
    description?: string | null;
    status?: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  },
  timezone = "Asia/Kolkata"
) {
  const existing = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new AppError("Savings goal not found", 404, "NOT_FOUND");

  const nextTarget =
    input.targetAmount !== undefined ? roundMoney(input.targetAmount) : toMoneyNumber(existing.targetAmount);
  const current = toMoneyNumber(existing.currentAmount);

  let nextStatus = input.status ?? existing.status;
  if (input.status === undefined) {
    nextStatus = current >= nextTarget ? "COMPLETED" : "ACTIVE";
  }

  return prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.targetAmount !== undefined ? { targetAmount: nextTarget } : {}),
      ...(input.targetDate !== undefined
        ? {
            targetDate: input.targetDate
              ? parseTransactionDate(input.targetDate, timezone)
              : null,
          }
        : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      status: nextStatus,
    },
  });
}

export async function deleteSavingsGoal(userId: string, goalId: string) {
  const existing = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new AppError("Savings goal not found", 404, "NOT_FOUND");
  await prisma.savingsGoal.delete({ where: { id: goalId } });
  return { deleted: true };
}

export async function addGoalContribution(
  userId: string,
  goalId: string,
  input: { amount: number; note?: string | null; contributedAt?: string },
  timezone = "Asia/Kolkata"
) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new AppError("Savings goal not found", 404, "NOT_FOUND");

  const amt = roundMoney(input.amount);
  const newCurrent = roundMoney(toMoneyNumber(goal.currentAmount) + amt);
  const target = toMoneyNumber(goal.targetAmount);
  const newStatus = newCurrent >= target ? "COMPLETED" : "ACTIVE";

  const result = await prisma.$transaction(async (tx) => {
    const contribution = await tx.savingsContribution.create({
      data: {
        goalId,
        userId,
        amount: amt,
        note: input.note ?? null,
        contributedAt: input.contributedAt
          ? parseTransactionDate(input.contributedAt, timezone)
          : new Date(),
      },
    });
    const updatedGoal = await tx.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: newCurrent, status: newStatus },
    });
    return { contribution, updatedGoal };
  });

  const progress = calculateGoalProgress(newCurrent, target);
  if (progress.isCompleted) {
    await createNotificationIfNotExists({
      userId,
      type: "GOAL_MILESTONE",
      title: `Goal achieved: ${goal.title}!`,
      message: `Congratulations! You reached 100% of your savings goal "${goal.title}".`,
      dedupeKey: `goal:${goalId}:100`,
      relatedId: goalId,
    });
  } else if (progress.progressPercent >= 50) {
    await createNotificationIfNotExists({
      userId,
      type: "GOAL_MILESTONE",
      title: `Halfway to ${goal.title}`,
      message: `You have reached ${progress.progressPercent}% of your "${goal.title}" savings goal.`,
      dedupeKey: `goal:${goalId}:50`,
      relatedId: goalId,
    });
  }

  return result;
}

export async function removeGoalContribution(
  userId: string,
  goalId: string,
  contributionId: string
) {
  const contribution = await prisma.savingsContribution.findFirst({
    where: { id: contributionId, goalId, userId },
  });
  if (!contribution) throw new AppError("Contribution not found", 404, "NOT_FOUND");

  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new AppError("Savings goal not found", 404, "NOT_FOUND");

  const nextCurrent = roundMoney(
    Math.max(0, toMoneyNumber(goal.currentAmount) - toMoneyNumber(contribution.amount))
  );
  const target = toMoneyNumber(goal.targetAmount);
  const nextStatus = nextCurrent >= target ? "COMPLETED" : "ACTIVE";

  await prisma.$transaction([
    prisma.savingsContribution.delete({ where: { id: contributionId } }),
    prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: nextCurrent, status: nextStatus },
    }),
  ]);

  return { deleted: true, currentAmount: nextCurrent };
}
