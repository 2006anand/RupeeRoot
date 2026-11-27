"use client";

import * as React from "react";
import { RefreshCw, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/components/ui/states";
import {
  CategoryComparisonBarChart,
  CategoryDonutChart,
  DailyTrendLineChart,
  IncomeExpenseBarChart,
} from "@/components/charts/finance-charts";
import type { AuthUser, ForecastResult, WellnessScoreResult } from "@/types";

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState("current_month");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [summary, setSummary] = React.useState<{
    periodLabel: string;
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    savingsRate: number;
    averageDailyExpense: number;
    momExpenseChangePercent: number | null;
    highestCategory: { categoryName: string; total: number; percentage: number } | null;
    expenseCategories: Array<{ categoryName: string; total: number; color: string; percentage: number }>;
  } | null>(null);
  const [trends, setTrends] = React.useState<{
    dailyTrend: Array<{ date: string; income: number; expense: number }>;
    monthlySeries: Array<{ label: string; income: number; expense: number }>;
    categoryComparison: Array<{ category: string; currentMonth: number; previousMonth: number }>;
  } | null>(null);
  const [forecast, setForecast] = React.useState<ForecastResult | null>(null);
  const [insights, setInsights] = React.useState<
    Array<{ id: string; title: string; description: string; severity: string; isRead?: boolean }>
  >([]);
  const [wellness, setWellness] = React.useState<WellnessScoreResult | null>(null);

  const loadAnalytics = React.useCallback(
    async (forceRefreshInsights = false) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ period });
        if (period === "custom" && startDate && endDate) {
          qs.set("startDate", startDate);
          qs.set("endDate", endDate);
        }

        const [meR, sumR, trR, fcR, inR, wlR] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/analytics/summary?${qs}`),
          fetch(`/api/analytics/trends?${qs}`),
          fetch("/api/analytics/forecast"),
          fetch(`/api/analytics/insights${forceRefreshInsights ? "?refresh=true" : ""}`),
          fetch("/api/analytics/wellness"),
        ]);

        if (!sumR.ok) throw new Error("Unable to load analytics");

        const [meJ, sumJ, trJ, fcJ, inJ, wlJ] = await Promise.all([
          meR.json(),
          sumR.json(),
          trR.json(),
          fcR.json(),
          inR.json(),
          wlR.json(),
        ]);

        setUser(meJ.data.user);
        setSummary(sumJ.data);
        setTrends(trJ.data);
        setForecast(fcJ.data.forecast);
        setInsights(inJ.data.insights ?? []);
        setWellness(wlJ.data.wellness);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    },
    [period, startDate, endDate]
  );

  React.useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return;
    loadAnalytics(false);
  }, [loadAnalytics, period, startDate, endDate]);

  const currency = user?.currency ?? "INR";

  if (loading && !summary) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={() => loadAnalytics(false)} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics & Forecasting</h1>
            <p className="text-sm text-muted-foreground">
              Deep-dive charts, spending patterns, and explainable projections for{" "}
              {summary?.periodLabel}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Analytics period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-44"
          >
            <option value="current_month">Current Month</option>
            <option value="previous_month">Previous Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="last_12_months">Last 12 Months</option>
            <option value="custom">Custom Date Range</option>
          </Select>

          {period === "custom" ? (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Highest Category</CardDescription>
            <CardTitle className="text-lg">
              {summary?.highestCategory ? summary.highestCategory.categoryName : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.highestCategory
              ? `${formatCurrency(summary.highestCategory.total, currency)} (${summary.highestCategory.percentage}%)`
              : "No expenses recorded"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Avg Daily Expense</CardDescription>
            <CardTitle className="text-lg">
              {formatCurrency(summary?.averageDailyExpense ?? 0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Net Cash Flow: {formatCurrency(summary?.netCashFlow ?? 0, currency)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Monthly Savings Rate</CardDescription>
            <CardTitle className="text-lg text-[#00B86B]">
              {summary?.savingsRate ?? 0}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Income {formatCurrency(summary?.totalIncome ?? 0, currency)} vs Expense{" "}
            {formatCurrency(summary?.totalExpenses ?? 0, currency)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardDescription>MoM Expense Change</CardDescription>
            <CardTitle className="text-lg">
              {summary?.momExpenseChangePercent !== null &&
              summary?.momExpenseChangePercent !== undefined
                ? `${summary.momExpenseChangePercent > 0 ? "+" : ""}${summary.momExpenseChangePercent}%`
                : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Compared to previous month
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category-wise Expense Donut</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart
              data={summary?.expenseCategories ?? []}
              currency={currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseBarChart
              data={trends?.monthlySeries ?? []}
              currency={currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Expense Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyTrendLineChart data={trends?.dailyTrend ?? []} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Month-over-Month Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryComparisonBarChart
              data={trends?.categoryComparison ?? []}
              currency={currency}
            />
          </CardContent>
        </Card>
      </div>

      {/* Forecasting + Financial Wellness */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#009CE0]" />
              Budget Forecasting Engine
            </CardTitle>
            <CardDescription>
              Explainable projection using run-rate, recent 7-day pace, and history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {forecast ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#E6EEF6] bg-card p-3 dark:border-border">
                    <p className="text-xs text-muted-foreground">Current Spending</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(forecast.currentSpending, currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E6EEF6] bg-card p-3 dark:border-border">
                    <p className="text-xs text-muted-foreground">Projected Monthly</p>
                    <p className="text-lg font-bold text-[#009CE0]">
                      {formatCurrency(forecast.projectedSpending, currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E6EEF6] bg-card p-3 dark:border-border">
                    <p className="text-xs text-muted-foreground">Monthly Budget</p>
                    <p className="text-lg font-bold">
                      {forecast.monthlyBudget !== null
                        ? formatCurrency(forecast.monthlyBudget, currency)
                        : "Not set"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E6EEF6] bg-card p-3 dark:border-border">
                    <p className="text-xs text-muted-foreground">Est. Surplus / Deficit</p>
                    <p
                      className={`text-lg font-bold ${
                        (forecast.estimatedSurplusOrDeficit ?? 0) >= 0
                          ? "text-[#00B86B]"
                          : "text-[#E11D48]"
                      }`}
                    >
                      {forecast.estimatedSurplusOrDeficit !== null
                        ? formatCurrency(forecast.estimatedSurplusOrDeficit, currency)
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      forecast.status === "LIKELY_TO_EXCEED"
                        ? "danger"
                        : forecast.status === "APPROACHING_BUDGET"
                        ? "warning"
                        : forecast.status === "WITHIN_BUDGET"
                        ? "success"
                        : "outline"
                    }
                  >
                    Status: {forecast.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="info">Confidence: {forecast.confidence}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{forecast.confidenceReason}</p>
                <p className="text-[11px] text-muted-foreground">{forecast.disclaimer}</p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#00B86B]" />
              Financial Wellness Score
            </CardTitle>
            <CardDescription>
              Transparent 100-point rubric across adherence, savings, and consistency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wellness ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-extrabold text-[#00B86B]">
                    {wellness.totalScore}
                    <span className="text-base font-normal text-muted-foreground">/100</span>
                  </span>
                  <Badge variant="success">{wellness.grade}</Badge>
                </div>

                {(
                  [
                    ["Budget Adherence", wellness.breakdown.budgetAdherence],
                    ["Savings Rate", wellness.breakdown.savingsRate],
                    ["Spending Consistency", wellness.breakdown.spendingConsistency],
                  ] as const
                ).map(([label, item]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{label}</span>
                      <span>
                        {item.score}/{item.maxScore}
                      </span>
                    </div>
                    <Progress
                      value={(item.score / item.maxScore) * 100}
                      label={label}
                    />
                    <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                  </div>
                ))}

                <p className="text-xs text-muted-foreground">{wellness.explanation}</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Smart Spending Insights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#009CE0]" /> Smart Spending Insights
            </CardTitle>
            <CardDescription>
              Rule-based insights stored without duplicating identical alerts
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadAnalytics(true)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Insights
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((ins) => (
            <div key={ins.id} className={`rounded-xl border p-4 ${ins.isRead ? "opacity-75" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{ins.title}</p>
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
              <p className="mt-1.5 text-xs text-muted-foreground">{ins.description}</p>
              {!ins.isRead ? (
                <div className="mt-2.5 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await fetch("/api/analytics/insights", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: ins.id }),
                      });
                      setInsights((prev) =>
                        prev.map((item) =>
                          item.id === ins.id ? { ...item, isRead: true } : item
                        )
                      );
                    }}
                  >
                    Mark as Read
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
