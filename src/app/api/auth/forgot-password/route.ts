import crypto from "crypto";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/auth";
import { forgotPasswordSchema } from "@/lib/validation";
import { AppError, handleApiError, ok } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const limit = checkRateLimit(`forgot:${ip}`, 10, 60_000);
    if (!limit.allowed) {
      throw new AppError(
        `Too many requests. Try again in ${limit.retryAfterSeconds}s.`,
        429,
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    let devResetToken: string | undefined;

    if (user) {
      const token = crypto.randomBytes(24).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiry = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: tokenHash, resetTokenExpiry: expiry },
      });

      if (process.env.NODE_ENV !== "production") {
        devResetToken = token;
      }
    }

    return ok({
      message:
        "If an account with that email exists, password reset instructions have been generated.",
      ...(devResetToken ? { devResetToken } : {}),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
