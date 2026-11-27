import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { markAllNotificationsRead } from "@/services/notification.service";

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);
    const result = await markAllNotificationsRead(user.id);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
