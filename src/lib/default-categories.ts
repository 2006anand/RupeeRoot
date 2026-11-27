import type { TransactionType } from "@/types";

export interface DefaultCategorySeed {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export const SYSTEM_CATEGORIES: DefaultCategorySeed[] = [
  // Expense categories
  { name: "Food", type: "EXPENSE", icon: "Utensils", color: "#EA580C" },
  { name: "Travel", type: "EXPENSE", icon: "Bus", color: "#0284C7" },
  { name: "Shopping", type: "EXPENSE", icon: "ShoppingBag", color: "#9333EA" },
  { name: "Education", type: "EXPENSE", icon: "GraduationCap", color: "#2563EB" },
  { name: "Entertainment", type: "EXPENSE", icon: "Film", color: "#DB2777" },
  { name: "Healthcare", type: "EXPENSE", icon: "HeartPulse", color: "#DC2626" },
  { name: "Rent", type: "EXPENSE", icon: "Home", color: "#0D9488" },
  { name: "Bills", type: "EXPENSE", icon: "Receipt", color: "#D97706" },
  { name: "Other", type: "EXPENSE", icon: "CircleEllipsis", color: "#64748B" },

  // Income categories
  { name: "Allowance", type: "INCOME", icon: "Wallet", color: "#059669" },
  { name: "Salary", type: "INCOME", icon: "Briefcase", color: "#16A34A" },
  { name: "Freelancing", type: "INCOME", icon: "Laptop", color: "#0D9488" },
  { name: "Other", type: "INCOME", icon: "PlusCircle", color: "#475569" },
];
