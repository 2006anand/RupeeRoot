import { requireAuth } from "@/lib/auth";
import { created, handleApiError, ok } from "@/lib/api-response";
import { budgetUpsertSchema } from "@/lib/validation";
import { getCurrentYearMonthInTimezone } from "@/lib/utils";
import { listBudgetsWithUsage, upsertBudget } from "@/services/budget.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const current = getCurrentYearMonthInTimezone(user.timezone);
    const month = Number(searchParams.get("month") ?? current.month) || current.month;
    const year = Number(searchParams.get("year") ?? current.year) || current.year;

    const budgets = await listBudgetsWithUsage(user.id, month, year, user.timezone);
    return ok({ budgets, month, year });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const input = budgetUpsertSchema.parse(body);
    const budget = await upsertBudget(user.id, input, user.timezone);
    return created({ budget });
  } catch (err) {
    return handleApiError(err);
  }
}
