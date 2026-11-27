import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { getBudgetHistory } from "@/services/budget.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const months = Math.min(12, Math.max(1, Number(searchParams.get("months") ?? 6) || 6));
    const history = await getBudgetHistory(user.id, months, user.timezone);
    return ok({ history });
  } catch (err) {
    return handleApiError(err);
  }
}
