import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { exportTransactionsCsv } from "@/services/report.service";
import type { TransactionType } from "@/types";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const { filename, csv } = await exportTransactionsCsv(
      user.id,
      {
        startDate: searchParams.get("startDate") ?? undefined,
        endDate: searchParams.get("endDate") ?? undefined,
        type: (searchParams.get("type") as TransactionType | null) ?? undefined,
        categoryId: searchParams.get("categoryId") ?? undefined,
        reportKind:
          searchParams.get("kind") === "categories" ? "categories" : "transactions",
      },
      user.timezone
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
