"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDateInTimezone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BudgetStatusBadge,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/ui/states";
import {
  CategoryDonutChart,
  DailyTrendLineChart,
  IncomeExpenseBarChart,
} from "@/components/charts/finance-charts";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import type {
  AuthUser,
  BudgetWithUsageDTO,
  CategoryDTO,
  ForecastResult,
  TransactionDTO,
  WellnessScoreResult,
} from "@/types";

export default function DashboardPage() {
  const [period, setPeriod] = React.useState<"current_month" | "previous_month" | "custom">(
    "current_month"
  );
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [txDialogOpen, setTxDialogOpen] = React.useState(false);

  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [categories, setCategories] = React.useState<CategoryDTO[]>([]);
  const [summary, setSummary] = React.useState<{
    periodLabel: string;
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    overallBudget: BudgetWithUsageDTO | null;
    expenseCategories: Array<{
      categoryName: string;
      total: number;
      color: string;
      percentage: number;
    }>;
  } | null>(null);
  const [trends, setTrends] = React.useState<{
    dailyTrend: Array<{ date: string; income: number; expense: number }>;
    monthlySeries: Array<{ label: string; income: number; expense: number }>;
  } | null>(null);
  const [budgets, setBudgets] = React.useState<BudgetWithUsageDTO[]>([]);
  const [recentTx, setRecentTx] = React.useState<TransactionDTO[]>([]);
  const [insights, setInsights] = React.useState<
    Array<{ id: string; title: string; description: string; severity: string }>
  >([]);
  const [forecast, setForecast] = React.useState<ForecastResult | null>(null);
  const [wellness, setWellness] = React.useState<WellnessScoreResult | null>(null);

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ period });
      if (period === "custom" && customStart && customEnd) {
        qs.set("startDate", customStart);
        qs.set("endDate", customEnd);
      }

      const [meRes, catRes, sumRes, trendRes, budgetRes, txRes, insightRes, fcRes, wellRes] =
        await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/categories"),
          fetch(`/api/analytics/summary?${qs}`),
          fetch(`/api/analytics/trends?${qs}`),
          fetch("/api/budgets"),
          fetch("/api/transactions?page=1&pageSize=6"),
          fetch("/api/analytics/insights"),
          fetch("/api/analytics/forecast"),
          fetch("/api/analytics/wellness"),
        ]);

      if (!meRes.ok || !sumRes.ok) {
        throw new Error("Unable to load dashboard metrics");
      }

      const [meJ, catJ, sumJ, trendJ, budgetJ, txJ, insightJ, fcJ, wellJ] =
        await Promise.all([
          meRes.json(),
          catRes.json(),
          sumRes.json(),
          trendRes.json(),
          budgetRes.json(),
          txRes.json(),
          insightRes.json(),
          fcRes.json(),
          wellRes.json(),
        ]);

      setUser(meJ.data.user);
      setCategories(catJ.data.categories ?? []);
      setSummary(sumJ.data);
      setTrends(trendJ.data);
      setBudgets(budgetJ.data.budgets ?? []);
      setRecentTx(txJ.data.items ?? []);
      setInsights(insightJ.data.insights ?? []);
      setForecast(fcJ.data.forecast ?? null);
      setWellness(wellJ.data.wellness ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  React.useEffect(() => {
    if (period === "custom" && (!customStart || !customEnd)) return;
    loadDashboard();
  }, [loadDashboard, period, customStart, customEnd]);

  const currency = user?.currency ?? "INR";
  const timezone = user?.timezone ?? "Asia/Kolkata";
  const alertBudgets = budgets.filter((b) => b.status !== "OK");

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboard} />;
  }

  const overallBudget = summary?.overallBudget ?? null;
  const utilization = overallBudget?.utilizationPercent ?? 0;
  const remainingBudget = overallBudget ? overallBudget.remainingAmount : null;

  return (
    <div className="space-y-6 bg-background">
      {/* Header + Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Dashboard
          </h1>
          <p className="text-sm text-[#5C6B84] dark:text-muted-foreground">
            Overview for {summary?.periodLabel ?? "Current Month"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            aria-label="Dashboard time filter"
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value as "current_month" | "previous_month" | "custom")
            }
            className="w-44"
          >
            <option value="current_month">Current Month</option>
            <option value="previous_month">Previous Month</option>
            <option value="custom">Custom Range</option>
          </Select>

          {period === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                aria-label="Start date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-36"
              />
              <Input
                type="date"
                aria-label="End date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-36"
              />
            </div>
          ) : null}

          <Button onClick={() => setTxDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Budget Alert Banner */}
      {alertBudgets.length > 0 ? (
        <div
          role="status"
          className="flex flex-col justify-between gap-3 rounded-[20px] border border-[#F59E0B]/35 bg-card p-4 shadow-[0_2px_10px_-4px_rgba(0,41,112,0.05)] sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/12 text-[#B45309]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Budget Alerts ({alertBudgets.length})
              </p>
              <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
                {alertBudgets
                  .slice(0, 3)
                  .map((b) => `${b.categoryName}: ${b.utilizationPercent}% used`)
                  .join(" • ")}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/budgets">Review Budgets</Link>
          </Button>
        </div>
      ) : null}

      {/* Top 4 Pure White KPI Cards with Paytm Blue Icons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="h-1 w-full bg-[#00BAF2]" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between font-medium">
              <span>Total Balance</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E5F8FE] text-[#009CE0]">
                <Wallet className="h-4 w-4" />
              </span>
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${
                (summary?.netCashFlow ?? 0) < 0 ? "text-[#E11D48]" : "text-foreground"
              }`}
            >
              {formatCurrency(summary?.netCashFlow ?? 0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
              Net cash flow (Income - Expenses)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between font-medium">
              <span>Monthly Income</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E5F8FE] text-[#009CE0]">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-[#00B86B]">
              {formatCurrency(summary?.totalIncome ?? 0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
              Recorded inflows in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between font-medium">
              <span>Monthly Expenses</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E5F8FE] text-[#009CE0]">
                <ArrowDownRight className="h-4 w-4" />
              </span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatCurrency(summary?.totalExpenses ?? 0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
              Recorded spending in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between font-medium">
              <span>Remaining Budget</span>
              {overallBudget ? (
                <BudgetStatusBadge status={overallBudget.status} />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E5F8FE] text-[#009CE0]">
                  <TrendingUp className="h-4 w-4" />
                </span>
              )}
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${
                remainingBudget !== null && remainingBudget < 0
                  ? "text-[#E11D48]"
                  : "text-foreground"
              }`}
            >
              {remainingBudget !== null
                ? formatCurrency(remainingBudget, currency)
                : "Not Set"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {overallBudget ? (
              <>
                <Progress
                  value={utilization}
                  label="Monthly budget utilization"
                  indicatorClassName={
                    overallBudget.status === "EXCEEDED"
                      ? "bg-[#E11D48]"
                      : overallBudget.status === "HIGH" || overallBudget.status === "WARNING"
                      ? "bg-[#F59E0B]"
                      : "bg-[#00BAF2]"
                  }
                />
                <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
                  {utilization}% of {formatCurrency(overallBudget.limitAmount, currency)} limit
                </p>
              </>
            ) : (
              <Link href="/budgets" className="text-xs font-semibold text-[#009CE0] hover:underline">
                Set monthly budget →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expense Chart</CardTitle>
            <CardDescription>
              6-month comparison calculated from your PostgreSQL ledger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseBarChart data={trends?.monthlySeries ?? []} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category-wise Spending</CardTitle>
            <CardDescription>Breakdown for {summary?.periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart
              data={summary?.expenseCategories ?? []}
              currency={currency}
            />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spending Trend + Budget Progress & Forecast */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
            <CardDescription>Daily income and expense movement across the period</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyTrendLineChart data={trends?.dailyTrend ?? []} currency={currency} />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Budget Progress</CardTitle>
              <Link href="/budgets" className="text-xs font-semibold text-[#009CE0] hover:underline">
                Manage →
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {budgets.length === 0 ? (
                <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
                  No budgets set for this month yet. Create limits to track progress.
                </p>
              ) : (
                budgets.slice(0, 3).map((b) => (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{b.categoryName}</span>
                      <span className="text-[#5C6B84] dark:text-muted-foreground">
                        {formatCurrency(b.spentAmount, currency)} /{" "}
                        {formatCurrency(b.limitAmount, currency)} ({b.utilizationPercent}%)
                      </span>
                    </div>
                    <Progress
                      value={b.utilizationPercent}
                      label={`${b.categoryName} progress`}
                      indicatorClassName={
                        b.status === "EXCEEDED"
                          ? "bg-[#E11D48]"
                          : b.status === "HIGH" || b.status === "WARNING"
                          ? "bg-[#F59E0B]"
                          : "bg-[#00BAF2]"
                      }
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E5F8FE] text-[#009CE0]">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Forecast & Wellness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {forecast?.hasSufficientData ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#5C6B84] dark:text-muted-foreground">Projected Spend</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(forecast.projectedSpending, currency)}
                    </span>
                  </div>
                  {forecast.estimatedSurplusOrDeficit !== null ? (
                    <div className="flex justify-between">
                      <span className="text-[#5C6B84] dark:text-muted-foreground">
                        Est. Surplus / Deficit
                      </span>
                      <span
                        className={`font-semibold ${
                          forecast.estimatedSurplusOrDeficit >= 0
                            ? "text-[#00B86B]"
                            : "text-[#E11D48]"
                        }`}
                      >
                        {formatCurrency(forecast.estimatedSurplusOrDeficit, currency)}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
                  Add at least 2 expenses this month for pace-based forecasting.
                </p>
              )}

              {wellness?.hasEnoughData ? (
                <div className="flex items-center justify-between border-t border-[#E6EEF6] pt-2.5 dark:border-border">
                  <span className="text-xs text-[#5C6B84] dark:text-muted-foreground">
                    Financial Wellness
                  </span>
                  <Badge variant="success">
                    {wellness.totalScore}/100 ({wellness.grade})
                  </Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Smart Spending Insights & Recent Transactions */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E5F8FE] text-[#009CE0]">
                  <Sparkles className="h-4 w-4" />
                </span>
                Smart Spending Insights
              </CardTitle>
              <CardDescription>Automated patterns from your real spending</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/analytics">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 ? (
              <EmptyState
                title="No insights generated yet"
                description="Add a few income and expense records to unlock spending insights."
              />
            ) : (
              insights.slice(0, 4).map((ins) => (
                <div
                  key={ins.id}
                  className="rounded-[16px] border border-[#E6EEF6] bg-card p-3.5 dark:border-border"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{ins.title}</p>
                    <Badge
                      variant={
                        ins.severity === "CRITICAL"
                          ? "danger"
                          : ins.severity === "WARNING"
                          ? "warning"
                          : ins.severity === "POSITIVE"
                          ? "success"
                          : "info"
                      }
                    >
                      {ins.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#5C6B84] dark:text-muted-foreground">
                    {ins.description}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest recorded entries</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/transactions">Manage All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                description="Start by adding your monthly allowance or first daily expense."
                action={
                  <Button size="sm" onClick={() => setTxDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> Add First Transaction
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-[#E6EEF6] dark:divide-border">
                {recentTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{tx.title}</p>
                      <p className="text-xs text-[#5C6B84] dark:text-muted-foreground">
                        {tx.categoryName} • {formatDateInTimezone(tx.date, timezone)} •{" "}
                        {tx.paymentMethod}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        tx.type === "INCOME" ? "text-[#00B86B]" : "text-foreground"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        categories={categories}
        timezone={timezone}
        onSaved={loadDashboard}
      />
    </div>
  );
}
