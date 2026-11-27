"use client";

import * as React from "react";
import {
  Download,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { formatCurrency, formatDateInTimezone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { CsvImportDialog } from "@/components/transactions/csv-import-dialog";
import { useToast } from "@/components/providers/app-providers";
import type { AuthUser, CategoryDTO, TransactionDTO } from "@/types";

export default function TransactionsPage() {
  const { toast } = useToast();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [categories, setCategories] = React.useState<CategoryDTO[]>([]);
  const [transactions, setTransactions] = React.useState<TransactionDTO[]>([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    pageSize: 15,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [sortBy, setSortBy] = React.useState("date");
  const [sortOrder, setSortOrder] = React.useState("desc");
  const [page, setPage] = React.useState(1);

  const [txDialogOpen, setTxDialogOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<TransactionDTO | null>(null);
  const [csvOpen, setCsvOpen] = React.useState(false);

  const buildQueryString = React.useCallback(() => {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: "15",
      sortBy,
      sortOrder,
    });
    if (search.trim()) qs.set("search", search.trim());
    if (type) qs.set("type", type);
    if (categoryId) qs.set("categoryId", categoryId);
    if (paymentMethod) qs.set("paymentMethod", paymentMethod);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (minAmount) qs.set("minAmount", minAmount);
    if (maxAmount) qs.set("maxAmount", maxAmount);
    return qs;
  }, [
    page,
    sortBy,
    sortOrder,
    search,
    type,
    categoryId,
    paymentMethod,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  ]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString();
      const [meRes, catRes, txRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/categories"),
        fetch(`/api/transactions?${qs}`),
      ]);
      if (!txRes.ok) throw new Error("Failed to fetch transactions");
      const [meJ, catJ, txJ] = await Promise.all([
        meRes.json(),
        catRes.json(),
        txRes.json(),
      ]);
      setUser(meJ.data.user);
      setCategories(catJ.data.categories ?? []);
      setTransactions(txJ.data.items ?? []);
      setPagination(txJ.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Delete failed", variant: "error" });
      return;
    }
    toast({ title: "Transaction deleted", variant: "success" });
    if (transactions.length === 1 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
    } else {
      loadData();
    }
  }

  function handleClearFilters() {
    setSearch("");
    setType("");
    setCategoryId("");
    setPaymentMethod("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(
    search.trim() || type || categoryId || paymentMethod || startDate || endDate || minAmount || maxAmount
  );

  function handleExportCsv() {
    const qs = buildQueryString();
    window.location.href = `/api/reports/export/csv?${qs.toString()}`;
  }

  const currency = user?.currency ?? "INR";
  const timezone = user?.timezone ?? "Asia/Kolkata";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Track, search, filter, and import your income and expenses.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              setEditingTx(null);
              setTxDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, category, or notes..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                aria-label="Sort by"
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split(":");
                  setSortBy(sb);
                  setSortOrder(so);
                }}
                className="w-40"
              >
                <option value="date:desc">Newest First</option>
                <option value="date:asc">Oldest First</option>
                <option value="amount:desc">Highest Amount</option>
                <option value="amount:asc">Lowest Amount</option>
                <option value="title:asc">Title (A-Z)</option>
              </Select>
              <Button
                variant="outline"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <Filter className="h-4 w-4" /> Filters
              </Button>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {filtersOpen ? (
            <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-6">
              <Select
                aria-label="Filter by type"
                value={type}
                onChange={(e) => {
                  setPage(1);
                  setType(e.target.value);
                }}
              >
                <option value="">All Types</option>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </Select>

              <Select
                aria-label="Filter by category"
                value={categoryId}
                onChange={(e) => {
                  setPage(1);
                  setCategoryId(e.target.value);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </Select>

              <Select
                aria-label="Filter by payment method"
                value={paymentMethod}
                onChange={(e) => {
                  setPage(1);
                  setPaymentMethod(e.target.value);
                }}
              >
                <option value="">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="WALLET">Wallet</option>
              </Select>

              <Input
                type="date"
                aria-label="From date"
                value={startDate}
                onChange={(e) => {
                  setPage(1);
                  setStartDate(e.target.value);
                }}
              />
              <Input
                type="date"
                aria-label="To date"
                value={endDate}
                onChange={(e) => {
                  setPage(1);
                  setEndDate(e.target.value);
                }}
              />

              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min ₹"
                  value={minAmount}
                  onChange={(e) => {
                    setPage(1);
                    setMinAmount(e.target.value);
                  }}
                />
                <Input
                  type="number"
                  placeholder="Max ₹"
                  value={maxAmount}
                  onChange={(e) => {
                    setPage(1);
                    setMaxAmount(e.target.value);
                  }}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No matching transactions"
          description="Try clearing filters or record a new income or expense entry."
          action={
            <Button
              variant="accent"
              onClick={() => {
                setEditingTx(null);
                setTxDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Transaction
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateInTimezone(tx.date, timezone)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{tx.title}</p>
                      {tx.notes ? (
                        <p className="text-xs text-muted-foreground">{tx.notes}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tx.categoryColor }}
                        />
                        {tx.categoryName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tx.paymentMethod}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap text-right font-semibold ${
                        tx.type === "INCOME" ? "text-[#00B86B]" : "text-foreground"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${tx.title}`}
                          onClick={() => {
                            setEditingTx(tx);
                            setTxDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${tx.title}`}
                          onClick={() => handleDelete(tx.id)}
                          className="text-[#E11D48] hover:text-[#E11D48]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{tx.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tx.categoryName} • {formatDateInTimezone(tx.date, timezone)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold ${
                        tx.type === "INCOME" ? "text-[#00B86B]" : "text-foreground"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                    <Badge variant="outline">{tx.paymentMethod}</Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTx(tx);
                          setTxDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tx.id)}
                        className="text-[#E11D48]"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount}{" "}
              total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        categories={categories}
        timezone={timezone}
        initialTransaction={editingTx}
        onSaved={loadData}
      />

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={loadData} />
    </div>
  );
}
