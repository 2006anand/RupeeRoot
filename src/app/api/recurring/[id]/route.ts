import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { recurringUpdateSchema } from "@/lib/validation";
import {
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from "@/services/recurring.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = recurringUpdateSchema.parse(body);
    const item = await updateRecurringTransaction(user.id, id, input, user.timezone);
    return ok({ recurring: item });
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
    const result = await deleteRecurringTransaction(user.id, id);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
