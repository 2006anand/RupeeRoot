import { describe, expect, it } from "vitest";
import {
  calculateBudgetUtilization,
  calculateCashFlowSummary,
  calculateGoalProgress,
  calculateWellnessScore,
  computeMonthlyForecast,
  summarizeByCategory,
} from "@/services/finance-math";
import {
  getDaysInMonth,
  getMonthRangeInTimezone,
  roundMoney,
} from "@/lib/utils";

describe("Financial Calculations Unit Tests", () => {
  it("calculates total income, expenses, net balance, and decimal precision accurately", () => {
    const summary = calculateCashFlowSummary([
      { amount: 8000, type: "INCOME" },
      { amount: 1500.5, type: "INCOME" },
      { amount: 1200.25, type: "EXPENSE" },
      { amount: 345.4, type: "EXPENSE" },
      { amount: -50, type: "EXPENSE" }, // ignored negative safeguard
    ]);

    expect(summary.totalIncome).toBe(9500.5);
    expect(summary.totalExpenses).toBe(1545.65);
    expect(summary.netCashFlow).toBe(7954.85);
    expect(summary.savingsRate).toBe(83.73);
  });

  it("handles zero transactions safely", () => {
    const summary = calculateCashFlowSummary([]);
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.netCashFlow).toBe(0);
    expect(summary.savingsRate).toBe(0);
  });

  it("calculates budget utilization and alert thresholds cleanly", () => {
    expect(calculateBudgetUtilization(0, 0)).toEqual({
      utilizationPercent: 0,
      remainingAmount: 0,
      status: "OK",
    });

    expect(calculateBudgetUtilization(500, 1000).status).toBe("OK");
    expect(calculateBudgetUtilization(750, 1000)).toEqual({
      utilizationPercent: 75,
      remainingAmount: 250,
      status: "WARNING",
    });
    expect(calculateBudgetUtilization(920, 1000).status).toBe("HIGH");
    expect(calculateBudgetUtilization(1100, 1000)).toEqual({
      utilizationPercent: 110,
      remainingAmount: -100,
      status: "EXCEEDED",
    });
  });

  it("summarizes expenses by category sorted descending with percentages", () => {
    const summary = summarizeByCategory(
      [
        { categoryId: "1", categoryName: "Food", amount: 600, type: "EXPENSE" },
        { categoryId: "1", categoryName: "Food", amount: 400, type: "EXPENSE" },
        { categoryId: "2", categoryName: "Travel", amount: 500, type: "EXPENSE" },
        { categoryId: "3", categoryName: "Allowance", amount: 8000, type: "INCOME" },
      ],
      "EXPENSE"
    );

    expect(summary).toHaveLength(2);
    expect(summary[0].categoryName).toBe("Food");
    expect(summary[0].total).toBe(1000);
    expect(summary[0].count).toBe(2);
    expect(summary[0].percentage).toBe(roundMoney((1000 / 1500) * 100));
  });

  it("computes monthly forecast and handles insufficient data safely", () => {
    const lowData = computeMonthlyForecast({
      month: 11,
      year: 2026,
      elapsedDays: 1,
      totalDays: 30,
      currentSpending: 100,
      recent7DaySpending: 100,
      recentDaysObserved: 1,
      monthlyBudget: 8000,
      previousMonthsTotals: [],
      transactionCount: 1,
    });
    expect(lowData.hasSufficientData).toBe(false);
    expect(lowData.status).toBe("INSUFFICIENT_DATA");

    const exceed = computeMonthlyForecast({
      month: 11,
      year: 2026,
      elapsedDays: 15,
      totalDays: 30,
      currentSpending: 5000,
      recent7DaySpending: 2800,
      recentDaysObserved: 7,
      monthlyBudget: 8000,
      previousMonthsTotals: [7800, 8200],
      transactionCount: 12,
    });
    expect(exceed.hasSufficientData).toBe(true);
    expect(exceed.status).toBe("LIKELY_TO_EXCEED");
    expect(exceed.projectedSpending).toBeGreaterThan(8000);
    expect(exceed.confidence).toBe("HIGH");
  });

  it("calculates savings goal progress accurately", () => {
    expect(calculateGoalProgress(4500, 10000)).toEqual({
      progressPercent: 45,
      remainingAmount: 5500,
      isCompleted: false,
    });
    expect(calculateGoalProgress(12000, 10000)).toEqual({
      progressPercent: 100,
      remainingAmount: 0,
      isCompleted: true,
    });
  });

  it("calculates transparent financial wellness score", () => {
    const res = calculateWellnessScore({
      totalIncome: 10000,
      totalExpenses: 6000,
      overallBudgetLimit: 8500,
      dailyExpenses: [300, 320, 290, 310, 305],
      transactionCount: 8,
    });
    expect(res.hasEnoughData).toBe(true);
    expect(res.totalScore).toBe(100);
    expect(res.grade).toBe("Excellent");
  });

  it("handles month boundaries in Asia/Kolkata and leap year February correctly", () => {
    expect(getDaysInMonth(2024, 2)).toBe(29); // Leap year
    expect(getDaysInMonth(2026, 2)).toBe(28); // Non-leap year

    const range = getMonthRangeInTimezone(2026, 11, "Asia/Kolkata");
    // 2026-11-01 00:00:00 IST == 2026-10-31T18:30:00.000Z
    expect(range.start.toISOString()).toBe("2026-10-31T18:30:00.000Z");
    // 2026-11-30 23:59:59.999 IST == 2026-11-30T18:29:59.999Z
    expect(range.end.toISOString()).toBe("2026-11-30T18:29:59.999Z");
  });
});
