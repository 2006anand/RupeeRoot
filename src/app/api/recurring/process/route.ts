import { getSessionUser, UnauthorizedError } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/api-response";
import { processDueRecurringTransactions } from "@/services/recurring.service";

async function handleProcess(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      const result = await processDueRecurringTransactions();
      return ok(result);
    }

    const user = await getSessionUser(request);
    if (!user) {
      throw new UnauthorizedError();
    }
    const result = await processDueRecurringTransactions(user.id);
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request: Request) {
  return handleProcess(request);
}

export async function POST(request: Request) {
  return handleProcess(request);
}
