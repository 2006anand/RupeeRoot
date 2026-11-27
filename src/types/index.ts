export type TransactionType = "INCOME" | "EXPENSE";

export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "NET_BANKING"
  | "WALLET"
  | "OTHER";

export type RecurrenceInterval = "WEEKLY" | "MONTHLY" | "YEARLY";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type NotificationType =
  | "BUDGET_WARNING"
  | "BUDGET_HIGH"
  | "BUDGET_EXCEEDED"
  | "SPENDING_INSIGHT"
  | "FORECAST_WARNING"
  | "GOAL_MILESTONE"
  | "RECURRING_GENERATED";

export type InsightType =
  | "SPENDING_INCREASE"
  | "SPENDING_DECREASE"
  | "HIGHEST_CATEGORY"
  | "BUDGET_NEARING"
  | "BUDGET_EXCEEDED"
  | "UNUSUAL_SPENDING"
  | "OVERSPENDING_RISK"
  | "SAVINGS_OPPORTUNITY";

export type InsightSeverity = "INFO" | "WARNING" | "CRITICAL" | "POSITIVE";

export type BudgetStatus = "OK" | "WARNING" | "HIGH" | "EXCEEDED";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  warningThreshold: number;
  highThreshold: number;
  exceededThreshold: number;
  monthlyIncomeTarget: number | null;
}

export interface CategoryDTO {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isSystem: boolean;
  userId: string | null;
  spent?: number;
  transactionCount?: number;
}

export interface TransactionDTO {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  date: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetWithUsageDTO {
  id: string;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  month: number;
  year: number;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercent: number;
  status: BudgetStatus;
  isOverall: boolean;
}

export interface ForecastResult {
  month: number;
  year: number;
  elapsedDays: number;
  totalDays: number;
  currentSpending: number;
  projectedSpending: number;
  simpleProjection: number;
  weightedProjection: number;
  monthlyBudget: number | null;
  estimatedRemaining: number | null;
  estimatedSurplusOrDeficit: number | null;
  status: "WITHIN_BUDGET" | "APPROACHING_BUDGET" | "LIKELY_TO_EXCEED" | "INSUFFICIENT_DATA";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  confidenceReason: string;
  hasSufficientData: boolean;
  disclaimer: string;
}

export interface WellnessScoreResult {
  totalScore: number;
  grade: "Excellent" | "Good" | "Fair" | "Needs Attention";
  hasEnoughData: boolean;
  breakdown: {
    budgetAdherence: { score: number; maxScore: number; detail: string };
    savingsRate: { score: number; maxScore: number; detail: string };
    spendingConsistency: { score: number; maxScore: number; detail: string };
  };
  explanation: string;
}
