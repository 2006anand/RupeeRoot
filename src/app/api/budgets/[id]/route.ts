import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { budgetUpdateSchema } from "@/lib/validation";
import { deleteBudget, updateBudget } from "@/services/budget.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = budgetUpdateSchema.parse(body);
    const budget = await updateBudget(user.id, id, input.limitAmount, user.timezone);
    return ok({ budget });
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
    const result = await deleteBudget(user.id, id);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
