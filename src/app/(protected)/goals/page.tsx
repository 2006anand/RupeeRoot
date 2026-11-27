"use client";

import * as React from "react";
import { CheckCircle2, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDateInTimezone, toISODateInTimezone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import type { AuthUser } from "@/types";

interface GoalItem {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  isCompleted: boolean;
  targetDate: string | null;
  description: string | null;
  status: string;
  contributions: Array<{
    id: string;
    amount: number;
    note: string | null;
    contributedAt: string;
  }>;
}

export default function GoalsPage() {
  const { toast } = useToast();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [goals, setGoals] = React.useState<GoalItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalItem | null>(null);
  const [title, setTitle] = React.useState("");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [currentAmount, setCurrentAmount] = React.useState("0");
  const [targetDate, setTargetDate] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [contribGoal, setContribGoal] = React.useState<GoalItem | null>(null);
  const [contribAmount, setContribAmount] = React.useState("");
  const [contribNote, setContribNote] = React.useState("");

  const loadGoals = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meR, gR] = await Promise.all([fetch("/api/auth/me"), fetch("/api/goals")]);
      if (!gR.ok) throw new Error("Failed to load savings goals");
      const [meJ, gJ] = await Promise.all([meR.json(), gR.json()]);
      setUser(meJ.data.user);
      setGoals(gJ.data.goals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals";
    const method = editingGoal ? "PATCH" : "POST";
    const payload = editingGoal
      ? {
          title,
          targetAmount: Number(targetAmount),
          targetDate: targetDate || null,
          description: description || null,
        }
      : {
          title,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount || 0),
          targetDate: targetDate || null,
          description: description || null,
        };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast({
        title: editingGoal ? "Could not update goal" : "Could not create goal",
        description: json?.error?.message,
        variant: "error",
      });
      return;
    }
    toast({
      title: editingGoal ? "Savings goal updated" : "Savings goal created",
      variant: "success",
    });
    setCreateOpen(false);
    setEditingGoal(null);
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("0");
    setTargetDate("");
    setDescription("");
    loadGoals();
  }

  async function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();
    if (!contribGoal) return;
    const res = await fetch(`/api/goals/${contribGoal.id}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(contribAmount),
        note: contribNote || null,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast({
        title: "Failed to add contribution",
        description: json?.error?.message,
        variant: "error",
      });
      return;
    }
    toast({ title: "Contribution added!", variant: "success" });
    setContribGoal(null);
    setContribAmount("");
    setContribNote("");
    loadGoals();
  }

  async function handleRemoveContribution(goalId: string, contributionId: string) {
    const res = await fetch(`/api/goals/${goalId}/contributions/${contributionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast({ title: "Could not remove contribution", variant: "error" });
      return;
    }
    toast({ title: "Contribution removed", variant: "success" });
    loadGoals();
  }

  async function handleDeleteGoal(id: string) {
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Delete failed", variant: "error" });
      return;
    }
    toast({ title: "Savings goal deleted", variant: "success" });
    loadGoals();
  }

  const currency = user?.currency ?? "INR";
  const timezone = user?.timezone ?? "Asia/Kolkata";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Savings Goals</h1>
            <p className="text-sm text-muted-foreground">
              Track laptop, course, or emergency fund targets with explicit contributions.
            </p>
          </div>
        </div>

        <Button
          variant="accent"
          onClick={() => {
            setEditingGoal(null);
            setTitle("");
            setTargetAmount("");
            setCurrentAmount("0");
            setTargetDate("");
            setDescription("");
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New Savings Goal
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadGoals} />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="h-6 w-6" />}
          title="No savings goals yet"
          description="Create a goal like saving ₹10,000 for a laptop or ₹5,000 for an online course."
          action={
            <Button variant="accent" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create First Goal
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {g.title}
                    {g.isCompleted ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </Badge>
                    ) : (
                      <Badge variant="info">{g.progressPercent}%</Badge>
                    )}
                  </CardTitle>
                  {g.description ? (
                    <CardDescription className="mt-1">{g.description}</CardDescription>
                  ) : null}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setContribGoal(g);
                      setContribAmount("");
                      setContribNote("");
                    }}
                  >
                    + Contribute
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${g.title}`}
                    onClick={() => {
                      setEditingGoal(g);
                      setTitle(g.title);
                      setTargetAmount(String(g.targetAmount));
                      setTargetDate(
                        g.targetDate ? toISODateInTimezone(g.targetDate, timezone) : ""
                      );
                      setDescription(g.description ?? "");
                      setCreateOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${g.title}`}
                    onClick={() => handleDeleteGoal(g.id)}
                    className="text-[#E11D48]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <Progress value={g.progressPercent} label={`${g.title} progress`} />
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <span>
                    Saved:{" "}
                    <strong className="text-[#00B86B]">
                      {formatCurrency(g.currentAmount, currency)}
                    </strong>{" "}
                    / {formatCurrency(g.targetAmount, currency)}
                  </span>
                  <span className="text-muted-foreground">
                    Remaining: {formatCurrency(g.remainingAmount, currency)}
                    {g.targetDate
                      ? ` • Target ${formatDateInTimezone(g.targetDate, timezone)}`
                      : ""}
                  </span>
                </div>

                {g.contributions.length > 0 ? (
                  <div className="space-y-1.5 border-t pt-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent Contributions
                    </p>
                    {g.contributions.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="truncate text-muted-foreground">
                          {formatDateInTimezone(c.contributedAt, timezone)}
                          {c.note ? ` — ${c.note}` : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-600">
                            +{formatCurrency(c.amount, currency)}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove contribution"
                            onClick={() => handleRemoveContribution(g.id, c.id)}
                            className="text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Goal Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) setEditingGoal(null);
          setCreateOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? "Edit Savings Goal" : "Create Savings Goal"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update target amount, deadline, or notes for this goal."
                : "Set a clear target amount and optional deadline."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input
                id="goal-title"
                required
                placeholder="e.g., Save ₹10,000 for Laptop"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className={editingGoal ? "space-y-1.5" : "grid grid-cols-2 gap-3"}>
              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Target Amount ({currency})</Label>
                <Input
                  id="goal-target"
                  type="number"
                  min="1"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </div>
              {!editingGoal ? (
                <div className="space-y-1.5">
                  <Label htmlFor="goal-initial">Initial Saved</Label>
                  <Input
                    id="goal-initial"
                    type="number"
                    min="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target Date (optional)</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-desc">Description (optional)</Label>
              <Input
                id="goal-desc"
                placeholder="Why this goal matters"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                {editingGoal ? "Save Goal" : "Create Goal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Contribution Dialog */}
      <Dialog open={!!contribGoal} onOpenChange={(v) => !v && setContribGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Add savings toward &ldquo;{contribGoal?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContribution} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contrib-amt">Amount ({currency})</Label>
              <Input
                id="contrib-amt"
                type="number"
                min="1"
                step="0.01"
                required
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-note">Note (optional)</Label>
              <Input
                id="contrib-note"
                placeholder="e.g., Saved from monthly allowance"
                value={contribNote}
                onChange={(e) => setContribNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setContribGoal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Add Savings
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
