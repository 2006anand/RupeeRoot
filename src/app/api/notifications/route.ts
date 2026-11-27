import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { listNotifications } from "@/services/notification.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const result = await listNotifications(user.id);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
