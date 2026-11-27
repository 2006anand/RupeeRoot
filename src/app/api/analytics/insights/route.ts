import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { generateAndListInsights, markInsightRead } from "@/services/insight.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const insights = await generateAndListInsights(user.id, { forceRefresh });
    return ok({ insights });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = (await request.json()) as { id?: string };
    if (body.id) {
      await markInsightRead(user.id, body.id);
    }
    return ok({ updated: true });
  } catch (err) {
    return handleApiError(err);
  }
}
