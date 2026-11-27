"use client";

import * as React from "react";
import { Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { formatCurrency, formatDateInTimezone, toISODateInTimezone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/providers/app-providers";
import type { AuthUser, CategoryDTO } from "@/types";

interface RecurringItem {
  id: string;
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  categoryName: string;
  interval: "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  endDate: string | null;
  nextOccurrence: string;
  lastGeneratedAt: string | null;
  isActive: boolean;
}

export default function RecurringPage() {
  const { toast } = useToast();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [categories, setCategories] = React.useState<CategoryDTO[]>([]);
  const [items, setItems] = React.useState<RecurringItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<RecurringItem | null>(null);
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [categoryId, setCategoryId] = React.useState("");
  const [interval, setInterval] = React.useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [startDate, setStartDate] = React.useState(
    toISODateInTimezone(new Date(), "Asia/Kolkata")
  );
  const [endDate, setEndDate] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meR, catR, recR] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/categories"),
        fetch("/api/recurring"),
      ]);
      if (!recR.ok) throw new Error("Failed to load recurring rules");
      const [meJ, catJ, recJ] = await Promise.all([
        meR.json(),
        catR.json(),
        recR.json(),
      ]);
      setUser(meJ.data.user);
      const cats: CategoryDTO[] = catJ.data.categories ?? [];
      setCategories(cats);
      if (!categoryId && cats.length > 0) {
        const first = cats.find((c) => c.type === type);
        if (first) setCategoryId(first.id);
      }
      setItems(recJ.data.recurring ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recurring rules");
    } finally {
      setLoading(false);
    }
  }, [categoryId, type]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCats = categories.filter((c) => c.type === type);

  React.useEffect(() => {
    if (filteredCats.length > 0 && !filteredCats.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCats[0].id);
    }
  }, [type, filteredCats, categoryId]);

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    const url = editingRule ? `/api/recurring/${editingRule.id}` : "/api/recurring";
    const method = editingRule ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        amount: Number(amount),
        type,
        categoryId,
        interval,
        startDate,
        endDate: endDate || null,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast({
        title: editingRule ? "Failed to update recurring rule" : "Failed to create recurring rule",
        description: json?.error?.message,
        variant: "error",
      });
      return;
    }
    toast({
      title: editingRule ? "Recurring rule updated" : "Recurring transaction created",
      variant: "success",
    });
    setModalOpen(false);
    setEditingRule(null);
    setTitle("");
    setAmount("");
    setEndDate("");
    loadData();
  }

  async function handleToggleActive(item: RecurringItem) {
    const res = await fetch(`/api/recurring/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (!res.ok) {
      toast({ title: "Could not update schedule status", variant: "error" });
      return;
    }
    toast({
      title: item.isActive ? "Recurring rule paused" : "Recurring rule resumed",
      variant: "success",
    });
    loadData();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Could not delete recurring rule", variant: "error" });
      return;
    }
    toast({ title: "Recurring rule deleted", variant: "success" });
    loadData();
  }

  async function handleProcessDue() {
    const res = await fetch("/api/recurring/process", { method: "POST" });
    const json = await res.json();
    if (res.ok && json.success) {
      toast({
        title: `Processed due schedules`,
        description: `Generated ${json.data.generatedCount} transaction(s).`,
        variant: "success",
      });
      loadData();
    } else {
      toast({
        title: "Failed to process recurring rules",
        description: json?.error?.message,
        variant: "error",
      });
    }
  }

  const currency = user?.currency ?? "INR";
  const timezone = user?.timezone ?? "Asia/Kolkata";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recurring Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Automate monthly allowance, hostel rent, transport passes, and subscriptions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleProcessDue}>
            <Play className="h-4 w-4" /> Process Due Now
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              setEditingRule(null);
              setTitle("");
              setAmount("");
              setEndDate("");
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Recurring Rule
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-6 w-6" />}
          title="No recurring rules yet"
          description="Set up your ₹8,000 monthly allowance or recurring hostel rent so entries are generated idempotently."
          action={
            <Button variant="accent" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Create Recurring Rule
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>
                    {item.categoryName} • {item.interval}
                  </CardDescription>
                </div>
                <Badge variant={item.isActive ? "success" : "outline"}>
                  {item.isActive ? "Active" : "Paused"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-xl font-bold ${
                      item.type === "INCOME" ? "text-[#00B86B]" : "text-foreground"
                    }`}
                  >
                    {item.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(item.amount, currency)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Next: {formatDateInTimezone(item.nextOccurrence, timezone)}
                  </span>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t pt-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRule(item);
                      setTitle(item.title);
                      setAmount(String(item.amount));
                      setType(item.type);
                      setCategoryId(item.categoryId);
                      setInterval(item.interval);
                      setStartDate(toISODateInTimezone(item.startDate, timezone));
                      setEndDate(
                        item.endDate ? toISODateInTimezone(item.endDate, timezone) : ""
                      );
                      setModalOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(item)}
                  >
                    {item.isActive ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="text-[#E11D48]"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) setEditingRule(null);
          setModalOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Recurring Transaction" : "New Recurring Transaction"}
            </DialogTitle>
            <DialogDescription>
              Schedule automatic weekly, monthly, or yearly entries.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-title">Title</Label>
              <Input
                id="rec-title"
                required
                placeholder="e.g., Monthly Student Allowance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-type">Type</Label>
                <Select
                  id="rec-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-amt">Amount ({currency})</Label>
                <Input
                  id="rec-amt"
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-cat">Category</Label>
                <Select
                  id="rec-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {filteredCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-int">Interval</Label>
                <Select
                  id="rec-int"
                  value={interval}
                  onChange={(e) =>
                    setInterval(e.target.value as "WEEKLY" | "MONTHLY" | "YEARLY")
                  }
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-start">Start Date</Label>
                <Input
                  id="rec-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-end">End Date (optional)</Label>
                <Input
                  id="rec-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Save Rule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
