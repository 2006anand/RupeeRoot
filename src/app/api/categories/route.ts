import { requireAuth } from "@/lib/auth";
import { created, handleApiError, ok } from "@/lib/api-response";
import { categoryCreateSchema } from "@/lib/validation";
import { createCategory, listCategories } from "@/services/category.service";
import type { TransactionType } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type") as TransactionType | null;
    const includeSpending = searchParams.get("includeSpending") === "true";

    const categories = await listCategories(user.id, {
      type: typeParam ?? undefined,
      includeSpending,
      timezone: user.timezone,
    });
    return ok({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const input = categoryCreateSchema.parse(body);
    const category = await createCategory(user.id, input);
    return created({ category });
  } catch (err) {
    return handleApiError(err);
  }
}
