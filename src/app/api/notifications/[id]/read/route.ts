import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { markNotificationRead } from "@/services/notification.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const notification = await markNotificationRead(user.id, id);
    return ok({ notification });
  } catch (err) {
    return handleApiError(err);
  }
}
