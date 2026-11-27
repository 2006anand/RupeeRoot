import { requireAuth } from "@/lib/auth";
import { created, handleApiError } from "@/lib/api-response";
import { contributionCreateSchema } from "@/lib/validation";
import { addGoalContribution } from "@/services/goals.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = contributionCreateSchema.parse(body);
    const result = await addGoalContribution(user.id, id, input, user.timezone);
    return created(result);
  } catch (err) {
    return handleApiError(err);
  }
}
