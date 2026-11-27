import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { savingsGoalUpdateSchema } from "@/lib/validation";
import { deleteSavingsGoal, updateSavingsGoal } from "@/services/goals.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = savingsGoalUpdateSchema.parse(body);
    const goal = await updateSavingsGoal(user.id, id, input, user.timezone);
    return ok({ goal });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const result = await deleteSavingsGoal(user.id, id);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
