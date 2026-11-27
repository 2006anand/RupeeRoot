"use client";

import * as React from "react";
import { Pencil, Plus, Tag, Trash2, Wallet } from "lucide-react";
import { formatCurrency, getCurrentYearMonthInTimezone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BudgetStatusBadge,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/ui/states";
import { useToast } from "@/components/providers/app-providers";
import type { AuthUser, BudgetWithUsageDTO, CategoryDTO } from "@/types";

export default function BudgetsPage() {
  const { toast } = useToast();
  const initialYm = getCurrentYearMonthInTimezone("Asia/Kolkata");
  const [month, setMonth] = React.useState(initialYm.month);
  const [year, setYear] = React.useState(initialYm.year);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [budgets, setBudgets] = React.useState<BudgetWithUsageDTO[]>([]);
  const [history, setHistory] = React.useState<
    Array<{
      label: string;
      overallLimit: number | null;
      overallSpent: number;
      utilizationPercent: number;
    }>
  >([]);
  const [categories, setCategories] = React.useState<CategoryDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Budget dialog
  const [budgetModalOpen, setBudgetModalOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<BudgetWithUsageDTO | null>(null);
  const [budgetScope, setBudgetScope] = React.useState<string>("OVERALL");
  const [limitAmount, setLimitAmount] = React.useState("");

  // Category modal
  const [catModalOpen, setCatModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryDTO | null>(null);
  const [catName, setCatName] = React.useState("");
  const [catType, setCatType] = React.useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [catColor, setCatColor] = React.useState("#009CE0");

  // Reassign modal when deleting an in-use custom category
  const [reassignTargetCat, setReassignTargetCat] = React.useState<CategoryDTO | null>(null);
  const [reassignToId, setReassignToId] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, bRes, hRes, cRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/budgets?month=${month}&year=${year}`),
        fetch("/api/budgets/history?months=6"),
        fetch("/api/categories?includeSpending=true"),
      ]);
      if (!bRes.ok) throw new Error("Unable to load budgets");
      const [meJ, bJ, hJ, cJ] = await Promise.all([
        meRes.json(),
        bRes.json(),
        hRes.json(),
        cRes.json(),
      ]);
      setUser(meJ.data.user);
      setBudgets(bJ.data.budgets ?? []);
      setHistory(hJ.data.history ?? []);
      setCategories(cJ.data.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(limitAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast({ title: "Enter a positive budget limit", variant: "error" });
      return;
    }

    const res = editingBudget
      ? await fetch(`/api/budgets/${editingBudget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limitAmount: numeric }),
        })
      : await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: budgetScope === "OVERALL" ? null : budgetScope,
            month,
            year,
            limitAmount: numeric,
          }),
        });

    const json = await res.json();
    if (!res.ok || !json.success) {
      toast({
        title: "Could not save budget",
        description: json?.error?.message,
        variant: "error",
      });
      return;
    }
    toast({ title: editingBudget ? "Budget updated" : "Budget created", variant: "success" });
    setBudgetModalOpen(false);
    setEditingBudget(null);
    setLimitAmount("");
    loadData();
  }

  async function handleDeleteBudget(id: string) {
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Failed to delete budget", variant: "error" });
      return;
    }
    toast({ title: "Budget deleted", variant: "success" });
    loadData();
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : "/api/categories";
    const method = editingCategory ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingCategory
          ? { name: catName, color: catColor }
          : { name: catName, type: catType, color: catColor, icon: "Tag" }
      ),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast({
        title: editingCategory ? "Category update failed" : "Category creation failed",
        description: json?.error?.message,
        variant: "error",
      });
      return;
    }
    toast({
      title: editingCategory ? "Custom category updated" : "Custom category created",
      variant: "success",
    });
    setCatName("");
    setEditingCategory(null);
    setCatModalOpen(false);
    loadData();
  }

  async function handleDeleteCategory(cat: CategoryDTO) {
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      if (json?.error?.code === "CATEGORY_IN_USE") {
        const candidates = categories.filter(
          (c) => c.type === cat.type && c.id !== cat.id
        );
        const preferred =
          candidates.find((c) => c.name === "Other") ?? candidates[0];
        setReassignTargetCat(cat);
        setReassignToId(preferred?.id ?? "");
        return;
      }
      toast({
        title: "Cannot delete category",
        description: json?.error?.message,
        variant: "error",
      });
      return;
    }
    toast({ title: "Category deleted", variant: "success" });
    loadData();
  }

  async function handleConfirmReassignDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignTargetCat || !reassignToId) return;
    const res = await fetch(
      `/api/categories/${reassignTargetCat.id}?reassignTo=${reassignToId}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast({
        title: "Reassignment failed",
        description: json?.error?.message,
        variant: "error",
      });
      return;
    }
    toast({
      title: `Transactions reassigned and "${reassignTargetCat.name}" deleted`,
      variant: "success",
    });
    setReassignTargetCat(null);
    setReassignToId("");
    loadData();
  }

  const currency = user?.currency ?? "INR";
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budget Planner</h1>
            <p className="text-sm text-muted-foreground">
              Set overall and category monthly limits. Alerts trigger at{" "}
              {user?.warningThreshold ?? 75}%, {user?.highThreshold ?? 90}%, and{" "}
              {user?.exceededThreshold ?? 100}%.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Month"
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
            aria-label="Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || initialYm.year)}
            className="w-24"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setCatName("");
              setCatType("EXPENSE");
              setCatColor("#009CE0");
              setCatModalOpen(true);
            }}
          >
            <Tag className="h-4 w-4" /> Custom Category
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              setEditingBudget(null);
              setBudgetScope("OVERALL");
              setLimitAmount("");
              setBudgetModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Set Budget
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No budgets configured for this month"
          description="Set an overall monthly spending limit or category budgets for Food, Travel, and Education."
          action={
            <Button
              variant="accent"
              onClick={() => {
                setEditingBudget(null);
                setBudgetScope("OVERALL");
                setLimitAmount("");
                setBudgetModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Create Monthly Budget
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {budgets.map((b) => (
            <Card key={b.id} className={b.isOverall ? "md:col-span-2 border-primary/30" : ""}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: b.categoryColor }}
                    />
                    {b.categoryName}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Spent {formatCurrency(b.spentAmount, currency)} of{" "}
                    {formatCurrency(b.limitAmount, currency)}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1.5">
                  <BudgetStatusBadge status={b.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${b.categoryName} budget`}
                    onClick={() => {
                      setEditingBudget(b);
                      setLimitAmount(String(b.limitAmount));
                      setBudgetModalOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${b.categoryName} budget`}
                    onClick={() => handleDeleteBudget(b.id)}
                    className="text-[#E11D48] hover:text-[#E11D48]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <Progress
                  value={b.utilizationPercent}
                  label={`${b.categoryName} budget progress`}
                  indicatorClassName={
                    b.status === "EXCEEDED"
                      ? "bg-[#E11D48]"
                      : b.status === "HIGH" || b.status === "WARNING"
                      ? "bg-[#F59E0B]"
                      : "bg-[#00BAF2]"
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{b.utilizationPercent}% used</span>
                  <span className={b.remainingAmount < 0 ? "font-semibold text-[#E11D48]" : ""}>
                    {b.remainingAmount >= 0
                      ? `${formatCurrency(b.remainingAmount, currency)} remaining`
                      : `Over by ${formatCurrency(Math.abs(b.remainingAmount), currency)}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Budget History & Custom Categories */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>6-Month Budget History</CardTitle>
            <CardDescription>Overall monthly limit vs actual expenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {history.map((h) => (
              <div
                key={h.label}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{h.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Limit:{" "}
                    {h.overallLimit !== null
                      ? formatCurrency(h.overallLimit, currency)
                      : "No overall limit"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(h.overallSpent, currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.overallLimit ? `${h.utilizationPercent}% used` : "Tracked"}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories ({categories.length})</CardTitle>
            <CardDescription>
              System categories plus your custom categories
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-y-auto">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.type} • {c.isSystem ? "System" : "Custom"} •{" "}
                      {formatCurrency(c.spent ?? 0, currency)} this month
                    </p>
                  </div>
                </div>
                {!c.isSystem ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${c.name}`}
                      onClick={() => {
                        setEditingCategory(c);
                        setCatName(c.name);
                        setCatType(c.type);
                        setCatColor(c.color);
                        setCatModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${c.name}`}
                      onClick={() => handleDeleteCategory(c)}
                      className="text-[#E11D48]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Budget Modal */}
      <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Edit Budget" : "Set Monthly Budget"}</DialogTitle>
            <DialogDescription>
              Configure a positive spending limit for {month}/{year}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="space-y-4">
            {!editingBudget ? (
              <div className="space-y-1.5">
                <Label htmlFor="budget-scope">Budget Scope</Label>
                <Select
                  id="budget-scope"
                  value={budgetScope}
                  onChange={(e) => setBudgetScope(e.target.value)}
                >
                  <option value="OVERALL">Overall Monthly Budget</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      Category: {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="budget-limit">Monthly Limit ({currency})</Label>
              <Input
                id="budget-limit"
                type="number"
                step="1"
                min="1"
                required
                placeholder="e.g., 8000"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBudgetModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Save Budget
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Category Modal */}
      <Dialog
        open={catModalOpen}
        onOpenChange={(v) => {
          if (!v) setEditingCategory(null);
          setCatModalOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Custom Category" : "Create Custom Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the display name or color for this category."
                : "Add a personal category for tracking specialized expenses or income."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input
                id="cat-name"
                required
                placeholder="e.g., Hostel Laundry"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-type">Type</Label>
                <Select
                  id="cat-type"
                  disabled={!!editingCategory}
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as "EXPENSE" | "INCOME")}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-color">Color</Label>
                <Input
                  id="cat-color"
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCatModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                {editingCategory ? "Save Category" : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Safe Category Reassignment Dialog */}
      <Dialog
        open={!!reassignTargetCat}
        onOpenChange={(v) => !v && setReassignTargetCat(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Transactions Before Deleting</DialogTitle>
            <DialogDescription>
              &ldquo;{reassignTargetCat?.name}&rdquo; is referenced by existing transactions.
              Choose a replacement category to safely preserve your records.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmReassignDelete} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reassign-cat">Replacement Category</Label>
              <Select
                id="reassign-cat"
                value={reassignToId}
                onChange={(e) => setReassignToId(e.target.value)}
                required
              >
                {categories
                  .filter(
                    (c) =>
                      c.type === reassignTargetCat?.type &&
                      c.id !== reassignTargetCat?.id
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReassignTargetCat(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Reassign & Delete
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
