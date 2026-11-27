import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { getAnalyticsSummary, type AnalyticsPeriod } from "@/services/analytics.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as AnalyticsPeriod | null) ?? "current_month";
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const summary = await getAnalyticsSummary(user.id, period, user.timezone, startDate, endDate);
    return ok({
      periodLabel: summary.periodLabel,
      expenseCategories: summary.expenseCategories,
      incomeCategories: summary.incomeCategories,
      totalExpenses: summary.totalExpenses,
      totalIncome: summary.totalIncome,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
