import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { ensureSystemCategories, deleteCategory, createCategory } from "@/services/category.service";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/services/transaction.service";
import { listBudgetsWithUsage, upsertBudget } from "@/services/budget.service";
import { getAnalyticsSummary } from "@/services/analytics.service";
import {
  addGoalContribution,
  createSavingsGoal,
  listSavingsGoals,
} from "@/services/goals.service";
import {
  createRecurringTransaction,
  processDueRecurringTransactions,
} from "@/services/recurring.service";
import { getCurrentYearMonthInTimezone } from "@/lib/utils";

describe("SpendWise PostgreSQL Integration Tests", () => {
  let userAId = "";
  let userBId = "";
  let foodCategoryId = "";
  let allowanceCategoryId = "";

  const { year, month } = getCurrentYearMonthInTimezone("Asia/Kolkata");
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${year}-${pad(month)}-10`;

  beforeAll(async () => {
    await ensureSystemCategories();
    const passHash = await hashPassword("TestPass@123");

    const userA = await prisma.user.create({
      data: {
        name: "Integration User A",
        email: `int-a-${Date.now()}@spendwise.test`,
        passwordHash: passHash,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
    });
    const userB = await prisma.user.create({
      data: {
        name: "Integration User B",
        email: `int-b-${Date.now()}@spendwise.test`,
        passwordHash: passHash,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
    });

    userAId = userA.id;
    userBId = userB.id;

    const food = await prisma.category.findFirstOrThrow({
      where: { name: "Food", type: "EXPENSE", isSystem: true },
    });
    const allowance = await prisma.category.findFirstOrThrow({
      where: { name: "Allowance", type: "INCOME", isSystem: true },
    });
    foodCategoryId = food.id;
    allowanceCategoryId = allowance.id;
  });

  afterAll(async () => {
    if (userAId) await prisma.user.deleteMany({ where: { id: userAId } });
    if (userBId) await prisma.user.deleteMany({ where: { id: userBId } });
    await prisma.$disconnect();
  });

  it("creates, updates, deletes transactions and enforces cross-user isolation", async () => {
    const income = await createTransaction(userAId, {
      title: "Allowance",
      amount: 8000,
      type: "INCOME",
      categoryId: allowanceCategoryId,
      date: todayStr,
      paymentMethod: "NET_BANKING",
    });

    const expense = await createTransaction(userAId, {
      title: "Hostel Dinner",
      amount: 250.5,
      type: "EXPENSE",
      categoryId: foodCategoryId,
      date: todayStr,
      paymentMethod: "UPI",
    });

    const summary1 = await getAnalyticsSummary(userAId, "current_month", "Asia/Kolkata");
    expect(summary1.totalIncome).toBe(8000);
    expect(summary1.totalExpenses).toBe(250.5);
    expect(summary1.netCashFlow).toBe(7749.5);

    // Unauthorized user B cannot modify or delete user A's transaction
    await expect(
      updateTransaction(userBId, expense.id, { amount: 999 })
    ).rejects.toThrow("Transaction not found");
    await expect(deleteTransaction(userBId, expense.id)).rejects.toThrow(
      "Transaction not found"
    );

    // Update transaction and verify recalculation
    await updateTransaction(userAId, expense.id, { amount: 500 });
    const summary2 = await getAnalyticsSummary(userAId, "current_month", "Asia/Kolkata");
    expect(summary2.totalExpenses).toBe(500);
    expect(summary2.netCashFlow).toBe(7500);

    await deleteTransaction(userAId, income.id);
    await deleteTransaction(userAId, expense.id);
  });

  it("prevents duplicate budgets and fires non-duplicate threshold notifications", async () => {
    const budget = await upsertBudget(userAId, {
      categoryId: foodCategoryId,
      month,
      year,
      limitAmount: 1000,
    });
    expect(budget.limitAmount).toBe(1000);

    // Duplicate budget for same category & month must fail
    await expect(
      upsertBudget(userAId, {
        categoryId: foodCategoryId,
        month,
        year,
        limitAmount: 1500,
      })
    ).rejects.toThrow("already exists");

    // Cross 75% and 100% thresholds
    const tx1 = await createTransaction(userAId, {
      title: "Mess Bill",
      amount: 800,
      type: "EXPENSE",
      categoryId: foodCategoryId,
      date: todayStr,
    });

    const tx2 = await createTransaction(userAId, {
      title: "Snacks",
      amount: 300,
      type: "EXPENSE",
      categoryId: foodCategoryId,
      date: todayStr,
    });

    // Adding another expense while already exceeded must not duplicate the EXCEEDED notification
    const tx3 = await createTransaction(userAId, {
      title: "Coffee",
      amount: 100,
      type: "EXPENSE",
      categoryId: foodCategoryId,
      date: todayStr,
    });

    const budgets = await listBudgetsWithUsage(userAId, month, year, "Asia/Kolkata");
    const foodBudget = budgets.find((b) => b.categoryId === foodCategoryId);
    expect(foodBudget?.status).toBe("EXCEEDED");
    expect(foodBudget?.spentAmount).toBe(1200);

    const exceededNotifications = await prisma.notification.findMany({
      where: { userId: userAId, type: "BUDGET_EXCEEDED" },
    });
    expect(exceededNotifications).toHaveLength(1);

    await deleteTransaction(userAId, tx1.id);
    await deleteTransaction(userAId, tx2.id);
    await deleteTransaction(userAId, tx3.id);
  });

  it("protects referenced categories from silent deletion unless reassigned", async () => {
    const custom = await createCategory(userAId, {
      name: "Lab Printing",
      type: "EXPENSE",
      icon: "Printer",
      color: "#0284C7",
    });

    const tx = await createTransaction(userAId, {
      title: "Thesis Print",
      amount: 120,
      type: "EXPENSE",
      categoryId: custom.id,
      date: todayStr,
    });

    await expect(deleteCategory(userAId, custom.id)).rejects.toThrow("replacement category");

    const result = await deleteCategory(userAId, custom.id, foodCategoryId);
    expect(result.deleted).toBe(true);
    expect(result.reassignedCount).toBe(1);

    await deleteTransaction(userAId, tx.id);
  });

  it("tracks savings goal contributions and idempotently processes recurring transactions", async () => {
    const goal = await createSavingsGoal(userAId, {
      title: "Laptop Fund",
      targetAmount: 10000,
      currentAmount: 2000,
    });
    await addGoalContribution(userAId, goal.id, { amount: 3000, note: "Bonus" });
    const goals = await listSavingsGoals(userAId);
    expect(goals[0].currentAmount).toBe(5000);
    expect(goals[0].progressPercent).toBe(50);

    await createRecurringTransaction(userAId, {
      title: "Weekly Tiffin",
      amount: 400,
      type: "EXPENSE",
      categoryId: foodCategoryId,
      interval: "WEEKLY",
      startDate: todayStr,
    });

    const futureAsOf = new Date(Date.now() + 30 * 86_400_000);
    const run1 = await processDueRecurringTransactions(userAId, futureAsOf);
    expect(run1.generatedCount).toBeGreaterThan(0);

    // Running again for same window generates 0 duplicates
    const run2 = await processDueRecurringTransactions(userAId, futureAsOf);
    expect(run2.generatedCount).toBe(0);
  });
});
