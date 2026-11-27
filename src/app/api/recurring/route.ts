import { requireAuth } from "@/lib/auth";
import { created, handleApiError, ok } from "@/lib/api-response";
import { recurringCreateSchema } from "@/lib/validation";
import {
  createRecurringTransaction,
  listRecurringTransactions,
} from "@/services/recurring.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const items = await listRecurringTransactions(user.id);
    return ok({ recurring: items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const input = recurringCreateSchema.parse(body);
    const item = await createRecurringTransaction(user.id, input, user.timezone);
    return created({ recurring: item });
  } catch (err) {
    return handleApiError(err);
  }
}
