import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";
import { AppError, handleApiError, ok } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    return ok({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const input = profileUpdateSchema.parse(body);

    const nextWarn = input.warningThreshold ?? user.warningThreshold;
    const nextHigh = input.highThreshold ?? user.highThreshold;
    const nextExc = input.exceededThreshold ?? user.exceededThreshold;
    if (!(nextWarn < nextHigh && nextHigh < nextExc)) {
      throw new AppError(
        "Alert thresholds must satisfy warning < high < exceeded",
        400,
        "INVALID_THRESHOLDS"
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.warningThreshold !== undefined ? { warningThreshold: input.warningThreshold } : {}),
        ...(input.highThreshold !== undefined ? { highThreshold: input.highThreshold } : {}),
        ...(input.exceededThreshold !== undefined ? { exceededThreshold: input.exceededThreshold } : {}),
        ...(input.monthlyIncomeTarget !== undefined
          ? { monthlyIncomeTarget: input.monthlyIncomeTarget }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        timezone: true,
        warningThreshold: true,
        highThreshold: true,
        exceededThreshold: true,
        monthlyIncomeTarget: true,
      },
    });

    return ok({
      user: {
        ...updated,
        monthlyIncomeTarget: updated.monthlyIncomeTarget
          ? Number(updated.monthlyIncomeTarget)
          : null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
