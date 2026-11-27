import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { deleteNotification } from "@/services/notification.service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const result = await deleteNotification(user.id, id);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
