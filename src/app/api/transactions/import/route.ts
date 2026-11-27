import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import {
  confirmCsvImport,
  validateCsvImportRows,
} from "@/services/transaction.service";

const importRequestSchema = z.object({
  action: z.enum(["preview", "confirm"]),
  rows: z
    .array(
      z.object({
        rowNumber: z.number().int().positive(),
        title: z.string(),
        amount: z.union([z.string(), z.number()]),
        type: z.string(),
        categoryName: z.string(),
        date: z.string(),
        paymentMethod: z.string().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .min(1, "CSV must contain at least one data row")
    .max(500, "Maximum 500 rows per import"),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = importRequestSchema.parse(body);

    if (parsed.action === "preview") {
      const preview = await validateCsvImportRows(user.id, parsed.rows, user.timezone);
      return ok(preview);
    }

    const summary = await confirmCsvImport(user.id, parsed.rows, user.timezone);
    return ok(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
