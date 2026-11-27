import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { getAnalyticsTrends, type AnalyticsPeriod } from "@/services/analytics.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as AnalyticsPeriod | null) ?? "current_month";
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const trends = await getAnalyticsTrends(user.id, period, user.timezone, startDate, endDate);
    return ok(trends);
  } catch (err) {
    return handleApiError(err);
  }
}
