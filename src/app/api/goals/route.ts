import { requireAuth } from "@/lib/auth";
import { created, handleApiError, ok } from "@/lib/api-response";
import { savingsGoalCreateSchema } from "@/lib/validation";
import { createSavingsGoal, listSavingsGoals } from "@/services/goals.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const goals = await listSavingsGoals(user.id);
    return ok({ goals });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const input = savingsGoalCreateSchema.parse(body);
    const goal = await createSavingsGoal(user.id, input, user.timezone);
    return created({ goal });
  } catch (err) {
    return handleApiError(err);
  }
}
