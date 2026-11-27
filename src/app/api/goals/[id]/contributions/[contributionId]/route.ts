import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { removeGoalContribution } from "@/services/goals.service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; contributionId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id, contributionId } = await context.params;
    const result = await removeGoalContribution(user.id, id, contributionId);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
