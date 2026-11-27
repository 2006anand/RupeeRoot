import { requireAuth } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { categoryUpdateSchema } from "@/lib/validation";
import { deleteCategory, updateCategory } from "@/services/category.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const input = categoryUpdateSchema.parse(body);
    const category = await updateCategory(user.id, id, input);
    return ok({ category });
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
    const { searchParams } = new URL(request.url);
    const reassignTo = searchParams.get("reassignTo") ?? undefined;
    const result = await deleteCategory(user.id, id, reassignTo);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
