"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/ui/states";

export function CategoryDonutChart({
  data,
  currency = "INR",
}: {
  data: Array<{ categoryName: string; total: number; color: string; percentage: number }>;
  currency?: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No expense data yet"
        description="Add expenses in this period to visualize category distribution."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-60 w-full bg-card" aria-label="Category expense distribution chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="categoryName"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={84}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.categoryName} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value, currency)}
              contentStyle={{
                borderRadius: "1rem",
                border: "1px solid #E6EEF6",
                backgroundColor: "#FFFFFF",
                color: "#002970",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.slice(0, 6).map((c) => (
          <div
            key={c.categoryName}
            className="flex items-center justify-between rounded-xl border border-[#E6EEF6] bg-card px-3 py-1.5 text-xs dark:border-border"
          >
            <span className="flex items-center gap-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="truncate font-medium">{c.categoryName}</span>
            </span>
            <span className="shrink-0 font-semibold">
              {formatCurrency(c.total, currency)} ({c.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IncomeExpenseBarChart({
  data,
  currency = "INR",
}: {
  data: Array<{ label: string; income: number; expense: number }>;
  currency?: string;
}) {
  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <EmptyState
        title="No monthly comparison data"
        description="Income vs expense bars will appear as you record transactions."
      />
    );
  }

  return (
    <div className="h-72 w-full bg-card" aria-label="Monthly income versus expense chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5C6B84" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#5C6B84" }} width={56} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value, currency)}
            contentStyle={{
              borderRadius: "1rem",
              border: "1px solid #E6EEF6",
              backgroundColor: "#FFFFFF",
              color: "#002970",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="income" name="Income" fill="#002970" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" name="Expenses" fill="#00BAF2" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyTrendLineChart({
  data,
  currency = "INR",
}: {
  data: Array<{ date: string; income: number; expense: number }>;
  currency?: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No trend data for selected period"
        description="Record transactions to see your daily spending curve."
      />
    );
  }

  return (
    <div className="h-72 w-full bg-card" aria-label="Daily expense trend line chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v.slice(5)}
            tick={{ fontSize: 11, fill: "#5C6B84" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: "#5C6B84" }} width={56} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value, currency)}
            contentStyle={{
              borderRadius: "1rem",
              border: "1px solid #E6EEF6",
              backgroundColor: "#FFFFFF",
              color: "#002970",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line
            type="monotone"
            dataKey="expense"
            name="Daily Expense"
            stroke="#00BAF2"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="income"
            name="Daily Income"
            stroke="#002970"
            strokeWidth={2}
            dot={{ r: 2.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryComparisonBarChart({
  data,
  currency = "INR",
}: {
  data: Array<{ category: string; currentMonth: number; previousMonth: number }>;
  currency?: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No category comparison data"
        description="Category month-over-month bars appear once expenses exist."
      />
    );
  }

  return (
    <div className="h-72 w-full bg-card" aria-label="Category month comparison chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 7)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF6" vertical={false} />
          <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#5C6B84" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#5C6B84" }} width={56} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value, currency)}
            contentStyle={{
              borderRadius: "1rem",
              border: "1px solid #E6EEF6",
              backgroundColor: "#FFFFFF",
              color: "#002970",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar
            dataKey="currentMonth"
            name="This Month"
            fill="#002970"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="previousMonth"
            name="Last Month"
            fill="#00BAF2"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
