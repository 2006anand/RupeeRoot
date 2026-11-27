import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string }> = {
  INR: { symbol: "₹", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "en-IE" },
  GBP: { symbol: "£", locale: "en-GB" },
};

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "INR"
): string {
  const num = Number(amount ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  const cfg = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.INR;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatNumberIN(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toMoneyNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return roundMoney(value);
  if (typeof value === "string") return roundMoney(Number(value) || 0);
  if (typeof value === "object" && "toNumber" in (value as Record<string, unknown>)) {
    return roundMoney((value as { toNumber: () => number }).toNumber());
  }
  return roundMoney(Number(value) || 0);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getCurrentYearMonthInTimezone(
  timezone = "Asia/Kolkata",
  now = new Date()
): { year: number; month: number; day: number } {
  const zoned = toZonedTime(now, timezone);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth() + 1,
    day: zoned.getDate(),
  };
}

export function getMonthRangeInTimezone(
  year: number,
  month: number,
  timezone = "Asia/Kolkata"
): { start: Date; end: Date } {
  const days = getDaysInMonth(year, month);
  const startStr = `${year}-${pad2(month)}-01T00:00:00.000`;
  const endStr = `${year}-${pad2(month)}-${pad2(days)}T23:59:59.999`;
  return {
    start: fromZonedTime(startStr, timezone),
    end: fromZonedTime(endStr, timezone),
  };
}

export function getDayRangeInTimezone(
  dateStr: string,
  timezone = "Asia/Kolkata"
): { start: Date; end: Date } {
  const clean = dateStr.slice(0, 10);
  return {
    start: fromZonedTime(`${clean}T00:00:00.000`, timezone),
    end: fromZonedTime(`${clean}T23:59:59.999`, timezone),
  };
}

export function parseTransactionDate(
  input: string | Date,
  timezone = "Asia/Kolkata"
): Date {
  if (input instanceof Date) return input;
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return fromZonedTime(`${trimmed}T12:00:00.000`, timezone);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parsed;
}

export function formatDateInTimezone(
  date: Date | string,
  timezone = "Asia/Kolkata",
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    ...options,
  }).format(d);
}

export function toISODateInTimezone(
  date: Date | string,
  timezone = "Asia/Kolkata"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, timezone);
  return `${zoned.getFullYear()}-${pad2(zoned.getMonth() + 1)}-${pad2(zoned.getDate())}`;
}

export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function getMonthLabel(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 15));
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
