import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureSystemCategories } from "../src/services/category.service";
import {
  getCurrentYearMonthInTimezone,
  getPreviousMonth,
  parseTransactionDate,
} from "../src/lib/utils";
import { evaluateBudgetAlertsForUserMonth } from "../src/services/budget.service";
import { generateAndListInsights } from "../src/services/insight.service";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SpendWise demo data...");
  await ensureSystemCategories();

  const demoEmail = "demo@spendwise.in";
  const passwordHash = await bcrypt.hash("SpendWiseDemo@123", 12);

  // Clean existing demo user for idempotent re-seeding
  await prisma.user.deleteMany({ where: { email: demoEmail } });

  const demoUser = await prisma.user.create({
    data: {
      name: "Aarav Verma (Demo Student)",
      email: demoEmail,
      passwordHash,
      currency: "INR",
      timezone: "Asia/Kolkata",
      monthlyIncomeTarget: 10000,
    },
  });

  const categories = await prisma.category.findMany({ where: { isSystem: true } });
  const cat = (name: string, type: "INCOME" | "EXPENSE") => {
    const found = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type
    );
    if (!found) throw new Error(`Missing category ${name} (${type})`);
    return found.id;
  };

  const { year, month } = getCurrentYearMonthInTimezone("Asia/Kolkata");
  const prev = getPreviousMonth(year, month);
  const pad = (n: number) => String(n).padStart(2, "0");
  const curPrefix = `${year}-${pad(month)}`;
  const prevPrefix = `${prev.year}-${pad(prev.month)}`;

  await prisma.transaction.createMany({
    data: [
      // Previous month transactions
      {
        userId: demoUser.id,
        categoryId: cat("Allowance", "INCOME"),
        title: "Monthly Student Allowance",
        amount: 8000,
        type: "INCOME",
        date: parseTransactionDate(`${prevPrefix}-01`),
        paymentMethod: "NET_BANKING",
        notes: "Family monthly transfer",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Food", "EXPENSE"),
        title: "Hostel Mess & Tiffin",
        amount: 2100,
        type: "EXPENSE",
        date: parseTransactionDate(`${prevPrefix}-06`),
        paymentMethod: "UPI",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Travel", "EXPENSE"),
        title: "Metro & Campus Bus Pass",
        amount: 750,
        type: "EXPENSE",
        date: parseTransactionDate(`${prevPrefix}-09`),
        paymentMethod: "UPI",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Education", "EXPENSE"),
        title: "Semester Textbooks",
        amount: 1200,
        type: "EXPENSE",
        date: parseTransactionDate(`${prevPrefix}-14`),
        paymentMethod: "DEBIT_CARD",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Shopping", "EXPENSE"),
        title: "Stationery & Backpack",
        amount: 850,
        type: "EXPENSE",
        date: parseTransactionDate(`${prevPrefix}-20`),
        paymentMethod: "UPI",
      },

      // Current month transactions
      {
        userId: demoUser.id,
        categoryId: cat("Allowance", "INCOME"),
        title: "Monthly Student Allowance",
        amount: 8000,
        type: "INCOME",
        date: parseTransactionDate(`${curPrefix}-01`),
        paymentMethod: "NET_BANKING",
        notes: "November allowance",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Freelancing", "INCOME"),
        title: "UI Design Mini-Project",
        amount: 2500,
        type: "INCOME",
        date: parseTransactionDate(`${curPrefix}-08`),
        paymentMethod: "UPI",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Food", "EXPENSE"),
        title: "Hostel Mess Monthly Fee",
        amount: 2200,
        type: "EXPENSE",
        date: parseTransactionDate(`${curPrefix}-03`),
        paymentMethod: "UPI",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Food", "EXPENSE"),
        title: "Campus Canteen & Coffee",
        amount: 650,
        type: "EXPENSE",
        date: parseTransactionDate(`${curPrefix}-11`),
        paymentMethod: "UPI",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Travel", "EXPENSE"),
        title: "Metro Smart Card Recharge",
        amount: 800,
        type: "EXPENSE",
        date: parseTransactionDate(`${curPrefix}-05`),
        paymentMethod: "UPI",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Education", "EXPENSE"),
        title: "Cloud Lab & Printouts",
        amount: 640,
        type: "EXPENSE",
        date: parseTransactionDate(`${curPrefix}-10`),
        paymentMethod: "DEBIT_CARD",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Shopping", "EXPENSE"),
        title: "Winter Hoodie",
        amount: 1450,
        type: "EXPENSE",
        date: parseTransactionDate(`${curPrefix}-12`),
        paymentMethod: "UPI",
      },
      {
        userId: demoUser.id,
        categoryId: cat("Entertainment", "EXPENSE"),
        title: "Movie Night with Friends",
        amount: 420,
        type: "EXPENSE",
        date: parseTransactionDate(`${curPrefix}-15`),
        paymentMethod: "CASH",
      },
    ],
  });

  const foodId = cat("Food", "EXPENSE");
  const travelId = cat("Travel", "EXPENSE");
  const shoppingId = cat("Shopping", "EXPENSE");

  await prisma.budget.createMany({
    data: [
      {
        userId: demoUser.id,
        categoryId: null,
        budgetKey: "OVERALL",
        month,
        year,
        limitAmount: 7500,
      },
      {
        userId: demoUser.id,
        categoryId: foodId,
        budgetKey: foodId,
        month,
        year,
        limitAmount: 3000,
      },
      {
        userId: demoUser.id,
        categoryId: travelId,
        budgetKey: travelId,
        month,
        year,
        limitAmount: 1000,
      },
      {
        userId: demoUser.id,
        categoryId: shoppingId,
        budgetKey: shoppingId,
        month,
        year,
        limitAmount: 1500,
      },
    ],
  });

  await evaluateBudgetAlertsForUserMonth(demoUser.id, month, year);
  await generateAndListInsights(demoUser.id, { forceRefresh: true });

  const laptopGoal = await prisma.savingsGoal.create({
    data: {
      userId: demoUser.id,
      title: "Save ₹10,000 for Laptop Upgrade",
      targetAmount: 10000,
      currentAmount: 4500,
      targetDate: parseTransactionDate(`${year}-12-31`),
      description: "SSD + RAM upgrade for final year project",
      status: "ACTIVE",
    },
  });
  await prisma.savingsContribution.create({
    data: {
      goalId: laptopGoal.id,
      userId: demoUser.id,
      amount: 4500,
      note: "Saved from freelance + allowance",
    },
  });

  await prisma.savingsGoal.create({
    data: {
      userId: demoUser.id,
      title: "Save ₹5,000 for Certification Course",
      targetAmount: 5000,
      currentAmount: 1500,
      description: "Full-stack & cloud certification exam",
      status: "ACTIVE",
    },
  });

  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const nextStart = `${nextMonth.y}-${pad(nextMonth.m)}-01`;

  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId: demoUser.id,
        categoryId: cat("Allowance", "INCOME"),
        title: "Monthly Student Allowance",
        amount: 8000,
        type: "INCOME",
        paymentMethod: "NET_BANKING",
        interval: "MONTHLY",
        startDate: parseTransactionDate(`${curPrefix}-01`),
        nextOccurrence: parseTransactionDate(nextStart),
        isActive: true,
      },
      {
        userId: demoUser.id,
        categoryId: cat("Bills", "EXPENSE"),
        title: "Mobile & Hostel Wi-Fi Plan",
        amount: 499,
        type: "EXPENSE",
        paymentMethod: "UPI",
        interval: "MONTHLY",
        startDate: parseTransactionDate(`${curPrefix}-05`),
        nextOccurrence: parseTransactionDate(`${nextMonth.y}-${pad(nextMonth.m)}-05`),
        isActive: true,
      },
    ],
  });

  console.log("Demo account seeded: demo@spendwise.in / SpendWiseDemo@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
