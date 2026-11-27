import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  hashPassword,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { AppError, handleApiError } from "@/lib/api-response";
import { ensureSystemCategories } from "@/services/category.service";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const limit = checkRateLimit(`register:${ip}`, 15, 60_000);
    if (!limit.allowed) {
      throw new AppError(
        `Too many registration attempts. Try again in ${limit.retryAfterSeconds}s.`,
        429,
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const input = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new AppError("An account with this email already exists", 409, "CONFLICT");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        currency: input.currency,
        timezone: input.timezone,
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
      },
    });

    await ensureSystemCategories();

    const token = await signSessionToken({ userId: user.id, email: user.email });
    const response = NextResponse.json(
      { success: true, data: { user } },
      { status: 201 }
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
