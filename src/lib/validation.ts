import { z } from "zod";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const paymentMethodSchema = z.enum([
  "CASH",
  "UPI",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "NET_BANKING",
  "WALLET",
  "OTHER",
]);

export const recurrenceIntervalSchema = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255).toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).optional().default("INR"),
  timezone: z.string().trim().min(1).max(64).optional().default("Asia/Kolkata"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid reset token"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    currency: z.enum(["INR", "USD", "EUR", "GBP"]).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    warningThreshold: z.coerce.number().int().min(10).max(95).optional(),
    highThreshold: z.coerce.number().int().min(20).max(99).optional(),
    exceededThreshold: z.coerce.number().int().min(50).max(200).optional(),
    monthlyIncomeTarget: z.coerce.number().nonnegative().max(100000000).nullable().optional(),
  })
  .refine(
    (d) => {
      if (
        d.warningThreshold !== undefined &&
        d.highThreshold !== undefined &&
        d.warningThreshold >= d.highThreshold
      ) {
        return false;
      }
      if (
        d.highThreshold !== undefined &&
        d.exceededThreshold !== undefined &&
        d.highThreshold >= d.exceededThreshold
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Thresholds must satisfy warning < high < exceeded",
    }
  );

export const transactionCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero")
    .max(100000000, "Amount exceeds maximum limit"),
  type: transactionTypeSchema,
  categoryId: z.string().uuid("Select a valid category"),
  date: z.string().min(1, "Date is required"),
  paymentMethod: paymentMethodSchema.optional().default("UPI"),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60),
  type: transactionTypeSchema,
  icon: z.string().trim().min(1).max(40).optional().default("Tag"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex code like #3B82F6")
    .optional()
    .default("#3B82F6"),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const budgetUpsertSchema = z.object({
  categoryId: z.string().uuid("Invalid category").nullable().optional(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  limitAmount: z.coerce
    .number({ invalid_type_error: "Budget limit must be a number" })
    .positive("Budget limit must be greater than zero")
    .max(100000000),
});

export const budgetUpdateSchema = z.object({
  limitAmount: z.coerce.number().positive("Budget limit must be greater than zero").max(100000000),
});

export const savingsGoalCreateSchema = z.object({
  title: z.string().trim().min(1, "Goal title is required").max(120),
  targetAmount: z.coerce.number().positive("Target amount must be greater than zero").max(100000000),
  currentAmount: z.coerce.number().nonnegative().max(100000000).optional().default(0),
  targetDate: z.string().optional().nullable(),
  description: z.string().trim().max(400).optional().nullable(),
});

export const savingsGoalUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  targetAmount: z.coerce.number().positive().max(100000000).optional(),
  targetDate: z.string().optional().nullable(),
  description: z.string().trim().max(400).optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

export const contributionCreateSchema = z.object({
  amount: z.coerce.number().positive("Contribution must be greater than zero").max(100000000),
  note: z.string().trim().max(250).optional().nullable(),
  contributedAt: z.string().optional(),
});

export const recurringCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(100000000),
  type: transactionTypeSchema,
  categoryId: z.string().uuid("Select a valid category"),
  paymentMethod: paymentMethodSchema.optional().default("UPI"),
  notes: z.string().trim().max(500).optional().nullable(),
  interval: recurrenceIntervalSchema,
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const recurringUpdateSchema = recurringCreateSchema.partial();

export const csvImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  title: z.string().trim().min(1, "Title is required").max(160),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  type: transactionTypeSchema,
  categoryName: z.string().trim().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  paymentMethod: paymentMethodSchema.optional().default("UPI"),
  notes: z.string().trim().max(500).optional().nullable(),
});
