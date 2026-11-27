import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";
import { getCurrentYearMonthInTimezone } from "@/lib/utils";
import { exportMonthlyReportPdf } from "@/services/report.service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const current = getCurrentYearMonthInTimezone(user.timezone);
    const month = Number(searchParams.get("month") ?? current.month) || current.month;
    const year = Number(searchParams.get("year") ?? current.year) || current.year;

    const { filename, buffer } = await exportMonthlyReportPdf(user.id, month, year, {
      name: user.name,
      email: user.email,
      currency: user.currency,
      timezone: user.timezone,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
