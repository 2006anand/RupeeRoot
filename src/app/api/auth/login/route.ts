import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  sessionCookieOptions,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { AppError, handleApiError } from "@/lib/api-response";
import { processDueRecurringTransactions } from "@/services/recurring.service";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const limit = checkRateLimit(`login:${ip}`, 25, 60_000);
    if (!limit.allowed) {
      throw new AppError(
        `Too many login attempts. Try again in ${limit.retryAfterSeconds}s.`,
        429,
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const input = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Safely process any due recurring transactions on sign-in
    await processDueRecurringTransactions(user.id);

    const token = await signSessionToken({ userId: user.id, email: user.email });
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            currency: user.currency,
            timezone: user.timezone,
            warningThreshold: user.warningThreshold,
            highThreshold: user.highThreshold,
            exceededThreshold: user.exceededThreshold,
          },
        },
      },
      { status: 200 }
    );
    response.cookies.set({
      ...sessionCookieOptions(),
      value: token,
    });
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
