import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { getCurrentYearMonthInTimezone } from "@/lib/utils";
import { getMonthlyFinancialReport } from "@/services/report.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const current = getCurrentYearMonthInTimezone(user.timezone);
    const month = Number(searchParams.get("month") ?? current.month) || current.month;
    const year = Number(searchParams.get("year") ?? current.year) || current.year;

    const report = await getMonthlyFinancialReport(user.id, month, year, user.timezone);
    return ok(report);
  } catch (err) {
    return handleApiError(err);
  }
}
