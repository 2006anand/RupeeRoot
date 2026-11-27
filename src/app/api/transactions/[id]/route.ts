import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { transactionUpdateSchema } from "@/lib/validation";
import {
  deleteTransaction,
  getTransactionById,
  updateTransaction,
} from "@/services/transaction.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const transaction = await getTransactionById(user.id, id);
    return ok({ transaction });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = transactionUpdateSchema.parse(body);
    const transaction = await updateTransaction(user.id, id, input, user.timezone);
    return ok({ transaction });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const result = await deleteTransaction(user.id, id, user.timezone);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
