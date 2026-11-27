import { roundMoney } from "@/lib/utils";
import type { BudgetStatus, ForecastResult, WellnessScoreResult } from "@/types";

export interface NumericTransaction {
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId?: string;
  categoryName?: string;
  date?: Date | string;
}

export function calculateCashFlowSummary(transactions: NumericTransaction[]) {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (amt <= 0) continue;
    if (tx.type === "INCOME") {
      totalIncome += amt;
    } else if (tx.type === "EXPENSE") {
      totalExpenses += amt;
    }
  }

  totalIncome = roundMoney(totalIncome);
  totalExpenses = roundMoney(totalExpenses);
  const netCashFlow = roundMoney(totalIncome - totalExpenses);
  const savingsRate =
    totalIncome > 0 ? roundMoney(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
  };
}

export function calculateBudgetUtilization(
  spentAmount: number,
  limitAmount: number,
  thresholds = { warning: 75, high: 90, exceeded: 100 }
): {
  utilizationPercent: number;
  remainingAmount: number;
  status: BudgetStatus;
} {
  const spent = roundMoney(Math.max(0, spentAmount));
  const limit = roundMoney(Math.max(0, limitAmount));

  if (limit <= 0) {
    return {
      utilizationPercent: 0,
      remainingAmount: 0,
      status: "OK",
    };
  }

  const utilizationPercent = roundMoney((spent / limit) * 100);
  const remainingAmount = roundMoney(limit - spent);

  let status: BudgetStatus = "OK";
  if (utilizationPercent >= thresholds.exceeded) {
    status = "EXCEEDED";
  } else if (utilizationPercent >= thresholds.high) {
    status = "HIGH";
  } else if (utilizationPercent >= thresholds.warning) {
    status = "WARNING";
  }

  return {
    utilizationPercent,
    remainingAmount,
    status,
  };
}

export function summarizeByCategory(
  transactions: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor?: string;
    categoryIcon?: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
  }>,
  filterType: "EXPENSE" | "INCOME" = "EXPENSE"
) {
  const map = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      color: string;
      icon: string;
      total: number;
      count: number;
    }
  >();

  let grandTotal = 0;
  for (const tx of transactions) {
    if (tx.type !== filterType) continue;
    const amt = Number(tx.amount) || 0;
    if (amt <= 0) continue;
    grandTotal += amt;
    const existing = map.get(tx.categoryId);
    if (existing) {
      existing.total = roundMoney(existing.total + amt);
      existing.count += 1;
    } else {
      map.set(tx.categoryId, {
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        color: tx.categoryColor ?? "#64748B",
        icon: tx.categoryIcon ?? "Tag",
        total: roundMoney(amt),
        count: 1,
      });
    }
  }

  grandTotal = roundMoney(grandTotal);

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      percentage: grandTotal > 0 ? roundMoney((item.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeMonthlyForecast(params: {
  month: number;
  year: number;
  elapsedDays: number;
  totalDays: number;
  currentSpending: number;
  recent7DaySpending: number;
  recentDaysObserved: number;
  monthlyBudget: number | null;
  previousMonthsTotals: number[];
  transactionCount: number;
}): ForecastResult {
  const {
    month,
    year,
    elapsedDays,
    totalDays,
    currentSpending,
    recent7DaySpending,
    recentDaysObserved,
    monthlyBudget,
    previousMonthsTotals,
    transactionCount,
  } = params;

  const safeElapsed = Math.max(1, Math.min(elapsedDays, totalDays));
  const simpleProjection = roundMoney((currentSpending / safeElapsed) * totalDays);

  // Recent spending rate blended with month-to-date pace
  const recentDailyRate =
    recentDaysObserved > 0 ? recent7DaySpending / recentDaysObserved : currentSpending / safeElapsed;
  const remainingDays = Math.max(0, totalDays - safeElapsed);
  const paceProjection = roundMoney(currentSpending + recentDailyRate * remainingDays);

  // Blend simple run-rate (60%), recent pace (40%), and historical average if available
  let weightedProjection = roundMoney(simpleProjection * 0.6 + paceProjection * 0.4);

  if (previousMonthsTotals.length >= 2) {
    const histAvg =
      previousMonthsTotals.reduce((acc, v) => acc + v, 0) / previousMonthsTotals.length;
    // Early in month (< 7 days), anchor lightly to historical average to reduce noise
    const histWeight = safeElapsed < 7 ? 0.35 : 0.15;
    weightedProjection = roundMoney(
      weightedProjection * (1 - histWeight) + histAvg * histWeight
    );
  }

  const hasSufficientData = transactionCount >= 2 && (currentSpending > 0 || safeElapsed >= 3);
  const projectedSpending = hasSufficientData ? weightedProjection : roundMoney(currentSpending);

  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let confidenceReason = "Limited transactions so far this month; treat projection as a rough estimate.";
  if (transactionCount >= 10 && safeElapsed >= 12) {
    confidence = "HIGH";
    confidenceReason = `Based on ${transactionCount} transactions across ${safeElapsed} elapsed days.`;
  } else if (transactionCount >= 4 && safeElapsed >= 5) {
    confidence = "MEDIUM";
    confidenceReason = `Based on ${transactionCount} transactions over ${safeElapsed} days; accuracy improves later in the month.`;
  }

  let estimatedRemaining: number | null = null;
  let estimatedSurplusOrDeficit: number | null = null;
  let status: ForecastResult["status"] = "INSUFFICIENT_DATA";

  if (monthlyBudget !== null && monthlyBudget > 0) {
    estimatedRemaining = roundMoney(monthlyBudget - currentSpending);
    estimatedSurplusOrDeficit = roundMoney(monthlyBudget - projectedSpending);
    if (!hasSufficientData) {
      status = "INSUFFICIENT_DATA";
    } else if (projectedSpending > monthlyBudget) {
      status = "LIKELY_TO_EXCEED";
    } else if (projectedSpending >= monthlyBudget * 0.85) {
      status = "APPROACHING_BUDGET";
    } else {
      status = "WITHIN_BUDGET";
    }
  } else if (hasSufficientData) {
    status = "WITHIN_BUDGET";
  }

  return {
    month,
    year,
    elapsedDays: safeElapsed,
    totalDays,
    currentSpending: roundMoney(currentSpending),
    projectedSpending,
    simpleProjection,
    weightedProjection,
    monthlyBudget: monthlyBudget !== null ? roundMoney(monthlyBudget) : null,
    estimatedRemaining,
    estimatedSurplusOrDeficit,
    status,
    confidence,
    confidenceReason,
    hasSufficientData,
    disclaimer:
      "Forecasts are estimates derived from your current spending pace and recent history, not guaranteed outcomes.",
  };
}

export function calculateGoalProgress(currentAmount: number, targetAmount: number) {
  const current = roundMoney(Math.max(0, currentAmount));
  const target = roundMoney(Math.max(0, targetAmount));
  if (target <= 0) {
    return {
      progressPercent: 0,
      remainingAmount: 0,
      isCompleted: false,
    };
  }
  const progressPercent = Math.min(100, roundMoney((current / target) * 100));
  const remainingAmount = roundMoney(Math.max(0, target - current));
  return {
    progressPercent,
    remainingAmount,
    isCompleted: current >= target,
  };
}

export function calculateWellnessScore(params: {
  totalIncome: number;
  totalExpenses: number;
  overallBudgetLimit: number | null;
  dailyExpenses: number[];
  transactionCount: number;
}): WellnessScoreResult {
  const { totalIncome, totalExpenses, overallBudgetLimit, dailyExpenses, transactionCount } = params;

  if (transactionCount < 2) {
    return {
      totalScore: 0,
      grade: "Needs Attention",
      hasEnoughData: false,
      breakdown: {
        budgetAdherence: { score: 0, maxScore: 40, detail: "Add a budget and expenses to evaluate." },
        savingsRate: { score: 0, maxScore: 35, detail: "Record income and expenses to measure savings." },
        spendingConsistency: { score: 0, maxScore: 25, detail: "Need more daily spending history." },
      },
      explanation:
        "Your Financial Wellness Score combines Budget Adherence (40 pts), Savings Rate (35 pts), and Spending Consistency (25 pts). Record at least 2 transactions to generate your score.",
    };
  }

  // 1. Budget adherence (0-40)
  let budgetScore = 24;
  let budgetDetail = "No monthly budget set yet (neutral baseline 24/40).";
  if (overallBudgetLimit && overallBudgetLimit > 0) {
    const ratio = totalExpenses / overallBudgetLimit;
    if (ratio <= 0.75) {
      budgetScore = 40;
      budgetDetail = `Spending is well within budget (${roundMoney(ratio * 100)}% used).`;
    } else if (ratio <= 0.9) {
      budgetScore = 32;
      budgetDetail = `Spending is under control (${roundMoney(ratio * 100)}% of budget used).`;
    } else if (ratio <= 1.0) {
      budgetScore = 22;
      budgetDetail = `Nearing monthly budget limit (${roundMoney(ratio * 100)}% used).`;
    } else {
      const overshoot = ratio - 1;
      budgetScore = Math.max(0, Math.round(16 - overshoot * 40));
      budgetDetail = `Exceeded monthly budget (${roundMoney(ratio * 100)}% used).`;
    }
  }

  // 2. Savings rate (0-35)
  let savingsScore = 10;
  let savingsDetail = "No income recorded for this month yet.";
  if (totalIncome > 0) {
    const rate = (totalIncome - totalExpenses) / totalIncome;
    if (rate >= 0.3) {
      savingsScore = 35;
      savingsDetail = `Strong savings rate of ${roundMoney(rate * 100)}%.`;
    } else if (rate >= 0.2) {
      savingsScore = 28;
      savingsDetail = `Healthy savings rate of ${roundMoney(rate * 100)}%.`;
    } else if (rate >= 0.1) {
      savingsScore = 20;
      savingsDetail = `Moderate savings rate of ${roundMoney(rate * 100)}%.`;
    } else if (rate >= 0) {
      savingsScore = 12;
      savingsDetail = `Low positive savings rate (${roundMoney(rate * 100)}%).`;
    } else {
      savingsScore = 0;
      savingsDetail = "Expenses currently exceed income for this period.";
    }
  }

  // 3. Spending consistency (0-25) via coefficient of variation across active expense days
  const nonZeroDays = dailyExpenses.filter((v) => v > 0);
  let consistencyScore = 20;
  let consistencyDetail = "Steady daily spending pattern.";
  if (nonZeroDays.length >= 3) {
    const mean = nonZeroDays.reduce((a, b) => a + b, 0) / nonZeroDays.length;
    const variance =
      nonZeroDays.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nonZeroDays.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    if (cv <= 0.5) {
      consistencyScore = 25;
      consistencyDetail = "Very consistent daily spending with minimal spikes.";
    } else if (cv <= 1.0) {
      consistencyScore = 19;
      consistencyDetail = "Moderately consistent daily spending.";
    } else if (cv <= 1.5) {
      consistencyScore = 12;
      consistencyDetail = "Noticeable day-to-day spending spikes.";
    } else {
      consistencyScore = 6;
      consistencyDetail = "High volatility in daily expense amounts.";
    }
  }

  const totalScore = Math.min(100, Math.max(0, budgetScore + savingsScore + consistencyScore));
  let grade: WellnessScoreResult["grade"] = "Needs Attention";
  if (totalScore >= 80) grade = "Excellent";
  else if (totalScore >= 60) grade = "Good";
  else if (totalScore >= 40) grade = "Fair";

  return {
    totalScore,
    grade,
    hasEnoughData: true,
    breakdown: {
      budgetAdherence: { score: budgetScore, maxScore: 40, detail: budgetDetail },
      savingsRate: { score: savingsScore, maxScore: 35, detail: savingsDetail },
      spendingConsistency: { score: consistencyScore, maxScore: 25, detail: consistencyDetail },
    },
    explanation:
      "Score = Budget Adherence (40 pts) + Savings Rate (35 pts) + Spending Consistency (25 pts). Higher consistency, positive savings, and staying under budget raise your score.",
  };
}
