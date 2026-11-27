import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { getWellnessScore } from "@/services/analytics.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const wellness = await getWellnessScore(user.id, user.timezone);
    return ok({ wellness });
  } catch (err) {
    return handleApiError(err);
  }
}
