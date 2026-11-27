import { requireAuth } from "@/lib/auth";
import { created, handleApiError, ok } from "@/lib/api-response";
import { transactionCreateSchema } from "@/lib/validation";
import { createTransaction, listTransactions } from "@/services/transaction.service";
import type { PaymentMethod, TransactionType } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const minRaw = searchParams.get("minAmount");
    const maxRaw = searchParams.get("maxAmount");

    const result = await listTransactions(
      user.id,
      {
        search: searchParams.get("search") ?? undefined,
        startDate: searchParams.get("startDate") ?? undefined,
        endDate: searchParams.get("endDate") ?? undefined,
        categoryId: searchParams.get("categoryId") ?? undefined,
        type: (searchParams.get("type") as TransactionType | null) ?? undefined,
        paymentMethod:
          (searchParams.get("paymentMethod") as PaymentMethod | null) ?? undefined,
        minAmount: minRaw !== null && minRaw !== "" ? Number(minRaw) : undefined,
        maxAmount: maxRaw !== null && maxRaw !== "" ? Number(maxRaw) : undefined,
        sortBy:
          (searchParams.get("sortBy") as "date" | "amount" | "title" | null) ?? "date",
        sortOrder: (searchParams.get("sortOrder") as "asc" | "desc" | null) ?? "desc",
        page: Number(searchParams.get("page") ?? 1) || 1,
        pageSize: Number(searchParams.get("pageSize") ?? 20) || 20,
      },
      user.timezone
    );

    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const input = transactionCreateSchema.parse(body);

    const tx = await createTransaction(user.id, input, user.timezone);
    return created({ transaction: tx });
  } catch (err) {
    return handleApiError(err);
  }
}
