"use client";

import * as React from "react";
import { ArrowLeft, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/providers/app-providers";

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) lines.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) lines.push(row);

  if (lines.length === 0) return { headers: [], rows: [] };
  return { headers: lines[0], rows: lines.slice(1) };
}

interface PreviewRow {
  rowNumber: number;
  status: "VALID" | "DUPLICATE" | "ERROR";
  errors: string[];
  normalized?: {
    title: string;
    amount: number;
    type: string;
    categoryName: string;
    date: string;
  };
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = React.useState<"upload" | "map" | "preview" | "summary">("upload");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rawRows, setRawRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState({
    title: "",
    amount: "",
    type: "",
    categoryName: "",
    date: "",
    paymentMethod: "",
    notes: "",
  });
  const [previewData, setPreviewData] = React.useState<{
    totalRows: number;
    validCount: number;
    duplicateCount: number;
    errorCount: number;
    rows: PreviewRow[];
  } | null>(null);
  const [summaryData, setSummaryData] = React.useState<{
    totalRows: number;
    importedRows: number;
    failedRows: number;
    duplicateRows: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  function resetAll() {
    setStep("upload");
    setHeaders([]);
    setRawRows([]);
    setPreviewData(null);
    setSummaryData(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsvText(text);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast({
          title: "Empty CSV file",
          description: "Please upload a CSV with a header row and at least one data row.",
          variant: "error",
        });
        return;
      }
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      const findCol = (patterns: string[]) =>
        parsed.headers.find((h) =>
          patterns.some((p) => h.toLowerCase().includes(p))
        ) ?? "";

      setMapping({
        title: findCol(["title", "description", "merchant", "name"]),
        amount: findCol(["amount", "value", "price"]),
        type: findCol(["type", "kind"]),
        categoryName: findCol(["category", "cat"]),
        date: findCol(["date", "day"]),
        paymentMethod: findCol(["method", "payment", "mode"]),
        notes: findCol(["note", "memo", "remark"]),
      });
      setStep("map");
    };
    reader.readAsText(file);
  }

  function buildCandidateRows() {
    const idx = (col: string) => (col ? headers.indexOf(col) : -1);
    return rawRows.map((cells, i) => ({
      rowNumber: i + 2,
      title: idx(mapping.title) >= 0 ? cells[idx(mapping.title)] ?? "" : "",
      amount: idx(mapping.amount) >= 0 ? cells[idx(mapping.amount)] ?? "" : "",
      type: idx(mapping.type) >= 0 ? cells[idx(mapping.type)] ?? "EXPENSE" : "EXPENSE",
      categoryName:
        idx(mapping.categoryName) >= 0 ? cells[idx(mapping.categoryName)] ?? "Other" : "Other",
      date: idx(mapping.date) >= 0 ? cells[idx(mapping.date)] ?? "" : "",
      paymentMethod:
        idx(mapping.paymentMethod) >= 0 ? cells[idx(mapping.paymentMethod)] ?? "UPI" : "UPI",
      notes: idx(mapping.notes) >= 0 ? cells[idx(mapping.notes)] ?? "" : "",
    }));
  }

  async function handlePreview() {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", rows: buildCandidateRows() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast({
          title: "Validation preview failed",
          description: json?.error?.message,
          variant: "error",
        });
        return;
      }
      setPreviewData(json.data);
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", rows: buildCandidateRows() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast({
          title: "Import failed",
          description: json?.error?.message,
          variant: "error",
        });
        return;
      }
      setSummaryData(json.data);
      setStep("summary");
      onImported();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAll();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Map your CSV columns, inspect validation and duplicate checks, then confirm import.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E6EEF6] bg-card p-8 text-center hover:border-[#00BAF2] hover:bg-[#E5F8FE]/40">
              <Upload className="mb-2 h-8 w-8 text-[#009CE0]" />
              <span className="text-sm font-semibold">Choose a CSV file to upload</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Columns: Date, Title, Type (INCOME/EXPENSE), Category, Amount, Payment Method, Notes
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <div className="rounded-lg border border-[#E6EEF6] bg-card p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Sample CSV format:</p>
              <code className="mt-1 block whitespace-pre-wrap">
                Date,Title,Type,Category,Amount,Payment Method,Notes{"\n"}
                2026-11-05,Canteen Lunch,EXPENSE,Food,120,UPI,Hostel mess{"\n"}
                2026-11-01,Monthly Allowance,INCOME,Allowance,8000,NET_BANKING,From parents
              </code>
            </div>
          </div>
        ) : null}

        {step === "map" ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Detected {rawRows.length} row(s). Map your CSV columns below:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["title", "Title *"],
                  ["amount", "Amount *"],
                  ["type", "Type (INCOME/EXPENSE)"],
                  ["categoryName", "Category *"],
                  ["date", "Date (YYYY-MM-DD) *"],
                  ["paymentMethod", "Payment Method"],
                  ["notes", "Notes"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <Label>{label}</Label>
                  <Select
                    value={mapping[field]}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  >
                    <option value="">-- Not mapped --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={resetAll}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                variant="accent"
                disabled={!mapping.title || !mapping.amount || !mapping.date || loading}
                onClick={handlePreview}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Validate & Preview
              </Button>
            </div>
          </div>
        ) : null}

        {step === "preview" && previewData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2.5">
                <p className="text-xs text-muted-foreground">Valid</p>
                <p className="text-lg font-bold text-emerald-600">{previewData.validCount}</p>
              </div>
              <div className="rounded-lg border p-2.5">
                <p className="text-xs text-muted-foreground">Duplicates</p>
                <p className="text-lg font-bold text-amber-600">{previewData.duplicateCount}</p>
              </div>
              <div className="rounded-lg border p-2.5">
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-lg font-bold text-red-600">{previewData.errorCount}</p>
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2.5">
              {previewData.rows.map((r) => (
                <div
                  key={r.rowNumber}
                  className="flex items-start justify-between gap-2 rounded-md border p-2 text-xs"
                >
                  <div>
                    <p className="font-medium">
                      Row {r.rowNumber}:{" "}
                      {r.normalized
                        ? `${r.normalized.title} (${r.normalized.type} • ${r.normalized.amount})`
                        : "Invalid row"}
                    </p>
                    {r.errors.length > 0 ? (
                      <p className="mt-0.5 text-red-600">{r.errors.join("; ")}</p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      r.status === "VALID"
                        ? "success"
                        : r.status === "DUPLICATE"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="h-4 w-4" /> Back to Mapping
              </Button>
              <Button
                variant="accent"
                disabled={previewData.validCount === 0 || loading}
                onClick={handleConfirm}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import {previewData.validCount} Valid Row(s)
              </Button>
            </div>
          </div>
        ) : null}

        {step === "summary" && summaryData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-[#00B86B]/25 bg-card p-4">
              <CheckCircle2 className="h-6 w-6 text-[#00B86B]" />
              <div>
                <p className="text-sm font-semibold">CSV Import Completed</p>
                <p className="text-xs text-muted-foreground">
                  Valid transactions were saved and budgets recalculated.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Rows</p>
                <p className="text-lg font-bold">{summaryData.totalRows}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Imported</p>
                <p className="text-lg font-bold text-emerald-600">{summaryData.importedRows}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Duplicates</p>
                <p className="text-lg font-bold text-amber-600">{summaryData.duplicateRows}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-lg font-bold text-red-600">{summaryData.failedRows}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  resetAll();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
