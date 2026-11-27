"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { transactionCreateSchema } from "@/lib/validation";
import { toISODateInTimezone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/providers/app-providers";
import type { CategoryDTO, TransactionDTO } from "@/types";

type TxFormValues = z.output<typeof transactionCreateSchema>;

export function TransactionDialog({
  open,
  onOpenChange,
  categories,
  timezone,
  initialTransaction,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
  timezone: string;
  initialTransaction?: TransactionDTO | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initialTransaction;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TxFormValues>({
    resolver: zodResolver(transactionCreateSchema),
    defaultValues: {
      title: "",
      amount: undefined as unknown as number,
      type: "EXPENSE",
      categoryId: "",
      date: toISODateInTimezone(new Date(), timezone),
      paymentMethod: "UPI",
      notes: "",
    },
  });

  const selectedType = watch("type");
  const filteredCategories = React.useMemo(
    () => categories.filter((c) => c.type === selectedType),
    [categories, selectedType]
  );

  React.useEffect(() => {
    if (!open) return;
    if (initialTransaction) {
      reset({
        title: initialTransaction.title,
        amount: initialTransaction.amount,
        type: initialTransaction.type,
        categoryId: initialTransaction.categoryId,
        date: toISODateInTimezone(initialTransaction.date, timezone),
        paymentMethod: initialTransaction.paymentMethod,
        notes: initialTransaction.notes ?? "",
      });
    } else {
      const defaultCat = categories.find((c) => c.type === "EXPENSE")?.id ?? "";
      reset({
        title: "",
        amount: undefined as unknown as number,
        type: "EXPENSE",
        categoryId: defaultCat,
        date: toISODateInTimezone(new Date(), timezone),
        paymentMethod: "UPI",
        notes: "",
      });
    }
  }, [open, initialTransaction, categories, timezone, reset]);

  React.useEffect(() => {
    const currentCatId = watch("categoryId");
    const valid = filteredCategories.some((c) => c.id === currentCatId);
    if (!valid && filteredCategories.length > 0) {
      setValue("categoryId", filteredCategories[0].id);
    }
  }, [selectedType, filteredCategories, setValue, watch]);

  async function onSubmit(values: TxFormValues) {
    const url = isEdit
      ? `/api/transactions/${initialTransaction!.id}`
      : "/api/transactions";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast({
        title: "Failed to save transaction",
        description: json?.error?.message ?? "Check your inputs and try again.",
        variant: "error",
      });
      return;
    }

    toast({
      title: isEdit ? "Transaction updated" : "Transaction recorded",
      variant: "success",
    });
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          <DialogDescription>
            Record income or an expense. Related budgets and summaries update automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("type", t)}
                className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                  selectedType === t
                    ? t === "EXPENSE"
                      ? "bg-card text-red-600 shadow-sm"
                      : "bg-card text-emerald-600 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "EXPENSE" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-title">Title</Label>
            <Input
              id="tx-title"
              placeholder="e.g., Hostel Mess Lunch or Monthly Allowance"
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-xs text-red-600">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register("amount")}
              />
              {errors.amount ? (
                <p className="text-xs text-red-600">{errors.amount.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" {...register("date")} />
              {errors.date ? (
                <p className="text-xs text-red-600">{errors.date.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-category">Category</Label>
              <Select id="tx-category" {...register("categoryId")}>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {errors.categoryId ? (
                <p className="text-xs text-red-600">{errors.categoryId.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-method">Payment Method</Label>
              <Select id="tx-method" {...register("paymentMethod")}>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="WALLET">Wallet</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Notes (optional)</Label>
            <Input
              id="tx-notes"
              placeholder="Optional description or receipt reference"
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-xs text-red-600">{errors.notes.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Add Transaction"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
