import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { getMonthlyForecast } from "@/services/forecast.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const forecast = await getMonthlyForecast(user.id, user.timezone);
    return ok({ forecast });
  } catch (err) {
    return handleApiError(err);
  }
}
