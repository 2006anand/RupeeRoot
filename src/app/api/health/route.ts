import { prisma } from "@/lib/db";
import { handleApiError, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "healthy", database: "connected" });
  } catch (err) {
    return handleApiError(err);
  }
}
