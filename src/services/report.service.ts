import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/db";
import {
  escapeCsvCell,
  formatCurrency,
  formatDateInTimezone,
  getDayRangeInTimezone,
  getMonthLabel,
  getMonthRangeInTimezone,
  toISODateInTimezone,
  toMoneyNumber,
} from "@/lib/utils";
import { calculateCashFlowSummary, summarizeByCategory } from "@/services/finance-math";
import { listBudgetsWithUsage } from "@/services/budget.service";
import type { TransactionType } from "@/types";

export async function getMonthlyFinancialReport(
  userId: string,
  month: number,
  year: number,
  timezone = "Asia/Kolkata"
) {
  const { start, end } = getMonthRangeInTimezone(year, month, timezone);

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { category: { select: { name: true, color: true, icon: true } } },
      orderBy: { date: "desc" },
    }),
    listBudgetsWithUsage(userId, month, year, timezone),
  ]);

  const mapped = transactions.map((t) => ({
    id: t.id,
    title: t.title,
    amount: toMoneyNumber(t.amount),
    type: t.type,
    categoryId: t.categoryId,
    categoryName: t.category.name,
    categoryColor: t.category.color,
    categoryIcon: t.category.icon,
    date: t.date.toISOString(),
    paymentMethod: t.paymentMethod,
    notes: t.notes,
  }));

  const summary = calculateCashFlowSummary(mapped);
  const expenseCategories = summarizeByCategory(mapped, "EXPENSE");
  const incomeCategories = summarizeByCategory(mapped, "INCOME");

  return {
    month,
    year,
    label: getMonthLabel(year, month),
    summary,
    expenseCategories,
    incomeCategories,
    budgets,
    transactions: mapped,
  };
}

export async function exportTransactionsCsv(
  userId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    type?: TransactionType;
    categoryId?: string;
    reportKind?: "transactions" | "categories";
  },
  timezone = "Asia/Kolkata"
): Promise<{ filename: string; csv: string }> {
  const where: Record<string, unknown> = { userId };
  if (filters.type) where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.gte = getDayRangeInTimezone(filters.startDate, timezone).start;
    if (filters.endDate) dateFilter.lte = getDayRangeInTimezone(filters.endDate, timezone).end;
    where.date = dateFilter;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { name: true, color: true, icon: true } } },
    orderBy: { date: "desc" },
  });

  if (filters.reportKind === "categories") {
    const summary = summarizeByCategory(
      transactions.map((t) => ({
        categoryId: t.categoryId,
        categoryName: t.category.name,
        categoryColor: t.category.color,
        categoryIcon: t.category.icon,
        amount: toMoneyNumber(t.amount),
        type: t.type,
      })),
      filters.type === "INCOME" ? "INCOME" : "EXPENSE"
    );

    const header = ["Category", "Transactions", "Total Amount", "Share (%)"].join(",");
    const lines = summary.map((row) =>
      [
        escapeCsvCell(row.categoryName),
        escapeCsvCell(row.count),
        escapeCsvCell(row.total.toFixed(2)),
        escapeCsvCell(row.percentage.toFixed(2)),
      ].join(",")
    );

    return {
      filename: `rupeeroot-category-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: [header, ...lines].join("\n"),
    };
  }

  const header = [
    "Date",
    "Title",
    "Type",
    "Category",
    "Amount",
    "Payment Method",
    "Notes",
  ].join(",");

  const lines = transactions.map((t) =>
    [
      escapeCsvCell(toISODateInTimezone(t.date, timezone)),
      escapeCsvCell(t.title),
      escapeCsvCell(t.type),
      escapeCsvCell(t.category.name),
      escapeCsvCell(toMoneyNumber(t.amount).toFixed(2)),
      escapeCsvCell(t.paymentMethod),
      escapeCsvCell(t.notes ?? ""),
    ].join(",")
  );

  return {
    filename: `rupeeroot-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [header, ...lines].join("\n"),
  };
}

function pdfCurrency(amount: number, currency: string): string {
  // jsPDF built-in Helvetica does not render ₹ glyph reliably; prefix "INR " or use ASCII-safe symbol
  if (currency === "INR") {
    return `Rs. ${new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  }
  return formatCurrency(amount, currency);
}

export async function exportMonthlyReportPdf(
  userId: string,
  month: number,
  year: number,
  userInfo: { name: string; email: string; currency: string; timezone: string }
): Promise<{ filename: string; buffer: Buffer }> {
  const report = await getMonthlyFinancialReport(userId, month, year, userInfo.timezone);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("RupeeRoot Financial Report", 14, 13);
  doc.setFontSize(10);
  doc.text(
    `${report.label}  |  Prepared for ${userInfo.name} (${userInfo.email})`,
    14,
    21
  );

  // Summary KPIs
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text("Monthly Summary", 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [["Total Income", "Total Expenses", "Net Cash Flow", "Savings Rate"]],
    body: [
      [
        pdfCurrency(report.summary.totalIncome, userInfo.currency),
        pdfCurrency(report.summary.totalExpenses, userInfo.currency),
        pdfCurrency(report.summary.netCashFlow, userInfo.currency),
        `${report.summary.savingsRate}%`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
  });

  // Category breakdown
  const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.text("Category-wise Expense Breakdown", 14, afterSummaryY);

  autoTable(doc, {
    startY: afterSummaryY + 3,
    head: [["Category", "Transactions", "Amount", "Share (%)"]],
    body:
      report.expenseCategories.length > 0
        ? report.expenseCategories.map((c) => [
            c.categoryName,
            String(c.count),
            pdfCurrency(c.total, userInfo.currency),
            `${c.percentage}%`,
          ])
        : [["No expense transactions recorded", "-", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] },
  });

  // Budget status
  const afterCatY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.text("Budget Utilization", 14, afterCatY);

  autoTable(doc, {
    startY: afterCatY + 3,
    head: [["Budget", "Limit", "Spent", "Used (%)", "Status"]],
    body:
      report.budgets.length > 0
        ? report.budgets.map((b) => [
            b.categoryName,
            pdfCurrency(b.limitAmount, userInfo.currency),
            pdfCurrency(b.spentAmount, userInfo.currency),
            `${b.utilizationPercent}%`,
            b.status,
          ])
        : [["No budgets configured for this month", "-", "-", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
  });

  // Transactions
  const afterBudgetY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.text("Transaction History", 14, afterBudgetY);

  autoTable(doc, {
    startY: afterBudgetY + 3,
    head: [["Date", "Title", "Category", "Type", "Method", "Amount"]],
    body:
      report.transactions.length > 0
        ? report.transactions.slice(0, 60).map((t) => [
            formatDateInTimezone(t.date, userInfo.timezone),
            t.title.slice(0, 32),
            t.categoryName,
            t.type,
            t.paymentMethod,
            pdfCurrency(t.amount, userInfo.currency),
          ])
        : [["No transactions in this period", "-", "-", "-", "-", "-"]],
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 8.5 },
  });

  const arrayBuffer = doc.output("arraybuffer");
  return {
    filename: `rupeeroot-report-${year}-${String(month).padStart(2, "0")}.pdf`,
    buffer: Buffer.from(arrayBuffer),
  };
}
