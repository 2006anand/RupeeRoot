import { prisma } from "@/lib/db";
import {
  formatCurrency,
  getCurrentYearMonthInTimezone,
  getMonthRangeInTimezone,
  getPreviousMonth,
  roundMoney,
  toMoneyNumber,
} from "@/lib/utils";
import { listBudgetsWithUsage } from "@/services/budget.service";
import { getMonthlyForecast } from "@/services/forecast.service";
import type { InsightSeverity, InsightType } from "@/types";

interface CandidateInsight {
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  categoryId?: string | null;
  dedupeKey: string;
}

export async function generateAndListInsights(
  userId: string,
  options?: { forceRefresh?: boolean }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, timezone: true },
  });
  const currency = user?.currency ?? "INR";
  const timezone = user?.timezone ?? "Asia/Kolkata";

  const { year, month, day } = getCurrentYearMonthInTimezone(timezone);
  const periodKey = `${year}-${String(month).padStart(2, "0")}`;

  // Controlled regeneration: only regenerate if no insights exist for this period or latest is > 30m old or forced
  const latest = await prisma.insight.findFirst({
    where: { userId, periodKey },
    orderBy: { generatedAt: "desc" },
  });

  const shouldRegenerate =
    options?.forceRefresh ||
    !latest ||
    Date.now() - latest.generatedAt.getTime() > 30 * 60 * 1000;

  if (shouldRegenerate) {
    const currRange = getMonthRangeInTimezone(year, month, timezone);
    const prevYm = getPreviousMonth(year, month);
    const prevRange = getMonthRangeInTimezone(prevYm.year, prevYm.month, timezone);

    const [currTx, prevTx, budgets, forecast] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: currRange.start, lte: currRange.end } },
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: prevRange.start, lte: prevRange.end } },
        include: { category: { select: { id: true, name: true } } },
      }),
      listBudgetsWithUsage(userId, month, year, timezone),
      getMonthlyForecast(userId, timezone),
    ]);

    const candidates: CandidateInsight[] = [];

    const currExpByCat = new Map<string, { id: string; name: string; total: number }>();
    let currTotalExp = 0;
    let currTotalInc = 0;

    for (const tx of currTx) {
      const amt = toMoneyNumber(tx.amount);
      if (tx.type === "INCOME") {
        currTotalInc += amt;
      } else {
        currTotalExp += amt;
        const entry = currExpByCat.get(tx.categoryId) ?? {
          id: tx.categoryId,
          name: tx.category.name,
          total: 0,
        };
        entry.total = roundMoney(entry.total + amt);
        currExpByCat.set(tx.categoryId, entry);
      }
    }

    const prevExpByCat = new Map<string, number>();
    let prevTotalExp = 0;
    for (const tx of prevTx) {
      if (tx.type !== "EXPENSE") continue;
      const amt = toMoneyNumber(tx.amount);
      prevTotalExp += amt;
      prevExpByCat.set(tx.categoryId, roundMoney((prevExpByCat.get(tx.categoryId) ?? 0) + amt));
    }

    // 1. Highest expense category
    const sortedCats = Array.from(currExpByCat.values()).sort((a, b) => b.total - a.total);
    if (sortedCats.length > 0 && currTotalExp > 0) {
      const top = sortedCats[0];
      const share = roundMoney((top.total / currTotalExp) * 100);
      candidates.push({
        type: "HIGHEST_CATEGORY",
        title: `${top.name} is your top expense category`,
        description: `You spent ${formatCurrency(top.total, currency)} on ${top.name}, representing ${share}% of this month's expenses.`,
        severity: share >= 45 ? "WARNING" : "INFO",
        categoryId: top.id,
        dedupeKey: `highest-cat:${periodKey}:${top.id}`,
      });
    }

    // 2. Category spending increase or decrease vs last month
    for (const cat of sortedCats) {
      const prevAmt = prevExpByCat.get(cat.id) ?? 0;
      if (prevAmt >= 200) {
        const changePct = Math.round(((cat.total - prevAmt) / prevAmt) * 100);
        if (changePct >= 15) {
          candidates.push({
            type: "SPENDING_INCREASE",
            title: `${cat.name} spending increased by ${changePct}%`,
            description: `Your ${cat.name.toLowerCase()} expenses are ${formatCurrency(
              cat.total,
              currency
            )} so far compared to ${formatCurrency(prevAmt, currency)} last month.`,
            severity: changePct >= 35 ? "WARNING" : "INFO",
            categoryId: cat.id,
            dedupeKey: `cat-inc:${periodKey}:${cat.id}`,
          });
        } else if (changePct <= -15 && day >= 10) {
          candidates.push({
            type: "SPENDING_DECREASE",
            title: `${cat.name} spending down ${Math.abs(changePct)}%`,
            description: `Nice discipline! Your ${cat.name.toLowerCase()} spending is ${Math.abs(
              changePct
            )}% lower than last month (${formatCurrency(cat.total, currency)} vs ${formatCurrency(
              prevAmt,
              currency
            )}).`,
            severity: "POSITIVE",
            categoryId: cat.id,
            dedupeKey: `cat-dec:${periodKey}:${cat.id}`,
          });
        }
      }
    }

    // 3. Budget alerts as insights
    for (const b of budgets) {
      if (b.status === "EXCEEDED") {
        candidates.push({
          type: "BUDGET_EXCEEDED",
          title: `${b.categoryName} budget exceeded`,
          description: `Spending reached ${b.utilizationPercent}% (${formatCurrency(
            b.spentAmount,
            currency
          )}) of your ${formatCurrency(b.limitAmount, currency)} budget.`,
          severity: "CRITICAL",
          categoryId: b.categoryId,
          dedupeKey: `budget-exceeded:${periodKey}:${b.id}`,
        });
      } else if (b.status === "HIGH" || b.status === "WARNING") {
        candidates.push({
          type: "BUDGET_NEARING",
          title: `${b.categoryName} budget is ${b.utilizationPercent}% used`,
          description: `You have ${formatCurrency(
            Math.max(0, b.remainingAmount),
            currency
          )} remaining in your ${b.categoryName.toLowerCase()} budget for this month.`,
          severity: b.status === "HIGH" ? "WARNING" : "INFO",
          categoryId: b.categoryId,
          dedupeKey: `budget-nearing:${periodKey}:${b.id}:${b.status}`,
        });
      }
    }

    // 4. Projected overspending
    if (
      forecast.hasSufficientData &&
      forecast.monthlyBudget &&
      forecast.status === "LIKELY_TO_EXCEED"
    ) {
      candidates.push({
        type: "OVERSPENDING_RISK",
        title: "Projected to exceed monthly budget",
        description: `Based on current spending, your projected monthly expenses are ${formatCurrency(
          forecast.projectedSpending,
          currency
        )} against a ${formatCurrency(forecast.monthlyBudget, currency)} budget.`,
        severity: "WARNING",
        dedupeKey: `forecast-risk:${periodKey}`,
      });
    }

    // 5. Unusual spending spike (single transaction > 3x average expense transaction)
    const expenseAmounts = currTx.filter((t) => t.type === "EXPENSE").map((t) => toMoneyNumber(t.amount));
    if (expenseAmounts.length >= 4) {
      const avg = expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length;
      const maxTx = currTx
        .filter((t) => t.type === "EXPENSE")
        .sort((a, b) => toMoneyNumber(b.amount) - toMoneyNumber(a.amount))[0];
      if (maxTx && toMoneyNumber(maxTx.amount) > avg * 2.75 && toMoneyNumber(maxTx.amount) > 500) {
        candidates.push({
          type: "UNUSUAL_SPENDING",
          title: `Large expense detected: ${maxTx.title}`,
          description: `${formatCurrency(
            toMoneyNumber(maxTx.amount),
            currency
          )} on ${maxTx.category.name} is significantly above your average expense of ${formatCurrency(
            roundMoney(avg),
            currency
          )}.`,
          severity: "INFO",
          categoryId: maxTx.categoryId,
          dedupeKey: `unusual:${periodKey}:${maxTx.id}`,
        });
      }
    }

    // 6. Savings opportunity
    if (currTotalInc > 0 && currTotalInc > currTotalExp && currTotalExp > 0) {
      const surplus = roundMoney(currTotalInc - currTotalExp);
      const rate = roundMoney((surplus / currTotalInc) * 100);
      if (rate >= 20) {
        candidates.push({
          type: "SAVINGS_OPPORTUNITY",
          title: `Healthy ${rate}% savings cushion this month`,
          description: `You currently have ${formatCurrency(
            surplus,
            currency
          )} net cash flow. Consider allocating part of it toward your active savings goals.`,
          severity: "POSITIVE",
          dedupeKey: `savings-opp:${periodKey}`,
        });
      }
    }

    // Also overall MoM check if no category insight triggered
    if (prevTotalExp > 0 && currTotalExp > prevTotalExp * 1.2) {
      const pct = Math.round(((currTotalExp - prevTotalExp) / prevTotalExp) * 100);
      candidates.push({
        type: "SPENDING_INCREASE",
        title: `Overall spending is ${pct}% higher than last month`,
        description: `Total expenses are ${formatCurrency(
          currTotalExp,
          currency
        )} compared to ${formatCurrency(prevTotalExp, currency)} in the previous month.`,
        severity: "WARNING",
        dedupeKey: `overall-inc:${periodKey}`,
      });
    }

    // Upsert insights idempotently by (userId, dedupeKey)
    for (const item of candidates.slice(0, 8)) {
      await prisma.insight.upsert({
        where: {
          userId_dedupeKey: { userId, dedupeKey: item.dedupeKey },
        },
        update: {
          title: item.title,
          description: item.description,
          severity: item.severity,
          generatedAt: new Date(),
        },
        create: {
          userId,
          type: item.type,
          title: item.title,
          description: item.description,
          severity: item.severity,
          categoryId: item.categoryId ?? null,
          periodKey,
          dedupeKey: item.dedupeKey,
        },
      });
    }
  }

  return prisma.insight.findMany({
    where: { userId },
    include: { category: { select: { name: true, color: true } } },
    orderBy: [{ generatedAt: "desc" }],
    take: 15,
  });
}

export async function markInsightRead(userId: string, insightId: string) {
  return prisma.insight.updateMany({
    where: { id: insightId, userId },
    data: { isRead: true },
  });
}
