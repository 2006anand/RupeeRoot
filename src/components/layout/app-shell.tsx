"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  Repeat,
  Settings,
  Sun,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/app-providers";
import { BrandLogo } from "@/components/ui/brand-logo";
import type { AuthUser } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/goals", label: "Savings Goals", icon: Target },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Txns", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/goals", label: "Goals", icon: PiggyBank },
];

export function AppShell({
  user,
  unreadNotifications = 0,
  children,
}: {
  user: AuthUser;
  unreadNotifications?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Pure White Sidebar with Paytm Two-Tone Accent */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E6EEF6] bg-card dark:border-border lg:flex xl:w-64">
        <div className="h-1 w-full bg-[#00BAF2]" />
        <div className="flex h-16 items-center border-b border-[#E6EEF6] px-4 dark:border-border">
          <Link href="/dashboard" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3.5">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-[#E5F8FE] font-semibold text-[#002970] ring-1 ring-[#00BAF2]/35 dark:bg-secondary dark:text-primary"
                    : "text-[#5C6B84] hover:bg-[#E5F8FE]/55 hover:text-[#002970] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active ? "text-[#009CE0] dark:text-primary" : ""
                    )}
                  />
                  {item.label}
                </span>
                {item.href === "/notifications" && unreadNotifications > 0 ? (
                  <span className="rounded-full bg-[#00BAF2] px-2 py-0.5 text-[10px] font-bold text-[#002970]">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E6EEF6] p-3.5 dark:border-border">
          <div className="mb-2 flex items-center justify-between rounded-xl border border-[#E6EEF6] bg-card px-3 py-2.5 dark:border-border">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-[#5C6B84] dark:text-muted-foreground">
                {user.currency} • {user.timezone}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="rounded-lg p-1.5 text-[#5C6B84] transition-colors hover:bg-[#E5F8FE] hover:text-[#002970] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#E11D48] transition-colors hover:bg-[#E11D48]/10"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Top Mobile/Tablet White Bar */}
        <header className="sticky top-0 z-30 border-b border-[#E6EEF6] bg-card dark:border-border lg:hidden">
          <div className="h-1 w-full bg-[#00BAF2]" />
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-[#002970] hover:bg-[#E5F8FE] dark:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/dashboard" className="flex items-center">
                <BrandLogo size="sm" />
              </Link>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative rounded-lg p-2 text-[#5C6B84] hover:bg-[#E5F8FE] hover:text-[#002970]"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#00BAF2]" />
                ) : null}
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle color theme"
                className="rounded-lg p-2 text-[#5C6B84] hover:bg-[#E5F8FE] hover:text-[#002970]"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-[#002970]/30 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-2xl">
              <div className="h-1 w-full bg-[#00BAF2]" />
              <div className="flex h-14 items-center justify-between border-b border-[#E6EEF6] px-4 dark:border-border">
                <span className="font-extrabold text-[#002970] dark:text-foreground">
                  Rupee<span className="text-[#00BAF2]">Root</span> Menu
                </span>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-[#E5F8FE]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-[#E5F8FE] font-semibold text-[#002970] ring-1 ring-[#00BAF2]/35 dark:bg-secondary dark:text-primary"
                          : "text-[#5C6B84] hover:bg-[#E5F8FE]/55 hover:text-[#002970]"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.href === "/notifications" && unreadNotifications > 0 ? (
                        <span className="rounded-full bg-[#00BAF2] px-2 py-0.5 text-[10px] font-bold text-[#002970]">
                          {unreadNotifications}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-[#E6EEF6] p-3 dark:border-border">
                <p className="mb-2 px-3 text-xs text-[#5C6B84]">{user.email}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#E11D48] hover:bg-[#E11D48]/10"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1680px] flex-1 px-3.5 py-4 pb-24 sm:px-5 sm:py-5 lg:px-6 lg:py-6 lg:pb-8 xl:px-8">
          {children}
        </main>

        {/* Bottom Mobile Quick Navigation */}
        <nav
          aria-label="Mobile quick navigation"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#E6EEF6] bg-card dark:border-border lg:hidden"
        >
          {MOBILE_TABS.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 text-[11px] font-medium transition-colors",
                  active ? "font-semibold text-[#009CE0] dark:text-primary" : "text-[#5C6B84]"
                )}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
