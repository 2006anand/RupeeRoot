"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  formatCurrency,
  formatDateInTimezone,
  getCurrentYearMonthInTimezone,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BudgetStatusBadge,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/ui/states";
import type { AuthUser, BudgetWithUsageDTO } from "@/types";

export default function ReportsPage() {
  const initialYm = getCurrentYearMonthInTimezone("Asia/Kolkata");
  const [month, setMonth] = React.useState(initialYm.month);
  const [year, setYear] = React.useState(initialYm.year);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [report, setReport] = React.useState<{
    label: string;
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netCashFlow: number;
      savingsRate: number;
    };
    expenseCategories: Array<{
      categoryName: string;
      count: number;
      total: number;
      percentage: number;
    }>;
    budgets: BudgetWithUsageDTO[];
    transactions: Array<{
      id: string;
      title: string;
      amount: number;
      type: string;
      categoryName: string;
      date: string;
      paymentMethod: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meR, repR] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/reports/monthly?month=${month}&year=${year}`),
      ]);
      if (!repR.ok) throw new Error("Failed to load monthly report");
      const [meJ, repJ] = await Promise.all([meR.json(), repR.json()]);
      setUser(meJ.data.user);
      setReport(repJ.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  React.useEffect(() => {
    loadReport();
  }, [loadReport]);

  const currency = user?.currency ?? "INR";
  const timezone = user?.timezone ?? "Asia/Kolkata";

  const monthPad = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDate = `${year}-${monthPad}-01`;
  const endDate = `${year}-${monthPad}-${String(lastDay).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Reports & Exports</h1>
            <p className="text-sm text-muted-foreground">
              Generate monthly summaries and download CSV or PDF reports in {currency}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Report month"
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-32"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2026, m - 1, 1).toLocaleString("en-IN", { month: "long" })}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            aria-label="Report year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || initialYm.year)}
            className="w-24"
          />
          <Button asChild variant="outline" size="sm">
            <a href={`/api/reports/export/csv?startDate=${startDate}&endDate=${endDate}`}>
              <FileSpreadsheet className="h-4 w-4" /> Transactions CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/reports/export/csv?kind=categories&startDate=${startDate}&endDate=${endDate}`}
            >
              <Download className="h-4 w-4" /> Category CSV
            </a>
          </Button>
          <Button asChild variant="accent" size="sm">
            <a href={`/api/reports/export/pdf?month=${month}&year=${year}`}>
              <FileText className="h-4 w-4" /> Download PDF
            </a>
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Total Income</CardDescription>
                <CardTitle className="text-xl text-[#00B86B]">
                  {formatCurrency(report.summary.totalIncome, currency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Total Expenses</CardDescription>
                <CardTitle className="text-xl">
                  {formatCurrency(report.summary.totalExpenses, currency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Net Cash Flow</CardDescription>
                <CardTitle className="text-xl text-[#009CE0]">
                  {formatCurrency(report.summary.netCashFlow, currency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardDescription>Savings Rate</CardDescription>
                <CardTitle className="text-xl">{report.summary.savingsRate}%</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Category-wise Expense Report</CardTitle>
                <CardDescription>{report.label}</CardDescription>
              </CardHeader>
              <CardContent>
                {report.expenseCategories.length === 0 ? (
                  <EmptyState
                    title="No expenses in this month"
                    description="Expenses recorded in this period will summarize here."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.expenseCategories.map((c) => (
                        <TableRow key={c.categoryName}>
                          <TableCell className="font-medium">{c.categoryName}</TableCell>
                          <TableCell className="text-right">{c.count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(c.total, currency)}
                          </TableCell>
                          <TableCell className="text-right">{c.percentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Utilization Report</CardTitle>
                <CardDescription>{report.label}</CardDescription>
              </CardHeader>
              <CardContent>
                {report.budgets.length === 0 ? (
                  <EmptyState
                    title="No budgets for this month"
                    description="Create monthly budgets to track utilization in reports."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Budget</TableHead>
                        <TableHead className="text-right">Limit</TableHead>
                        <TableHead className="text-right">Spent</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.budgets.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.categoryName}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(b.limitAmount, currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(b.spentAmount, currency)}
                          </TableCell>
                          <TableCell>
                            <BudgetStatusBadge status={b.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History ({report.transactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {report.transactions.length === 0 ? (
                <EmptyState
                  title="No transactions in this period"
                  description="Try choosing another month or add new transactions."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateInTimezone(t.date, timezone)}
                        </TableCell>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>{t.categoryName}</TableCell>
                        <TableCell className="text-xs">{t.type}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(t.amount, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
