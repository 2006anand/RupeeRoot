import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  FileSpreadsheet,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#002970] dark:bg-background dark:text-foreground">
      {/* Paytm-Inspired Dual-Blue Accent Bar + Pure White Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-[#E6EEF6] bg-[#FFFFFF]/95 backdrop-blur-sm dark:border-border dark:bg-card/95">
        <div className="h-1 w-full bg-[#00BAF2]" />
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
          <Link href="/" className="flex items-center">
            <BrandLogo size="md" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#5C6B84] md:flex dark:text-muted-foreground">
            <a href="#overview" className="transition-colors hover:text-[#009CE0]">
              Overview
            </a>
            <a href="#features" className="transition-colors hover:text-[#009CE0]">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-[#009CE0]">
              How It Works
            </a>
            <a href="#benefits" className="transition-colors hover:text-[#009CE0]">
              For Students
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Open Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pure White Two-Column Hero Section */}
      <section className="bg-[#FFFFFF] pb-14 pt-10 dark:bg-background lg:pb-18 lg:pt-16">
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
          {/* Left Column */}
          <div className="lg:col-span-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#BDEBFB] bg-[#E5F8FE] px-3.5 py-1.5 text-xs font-semibold text-[#002970] dark:border-border dark:bg-secondary dark:text-primary">
              <Wallet className="h-3.5 w-3.5 text-[#009CE0]" />
              Build better money habits • INR (₹)
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#002970] sm:text-4xl lg:text-[2.9rem] lg:leading-[1.12] dark:text-foreground">
              Track Your Money.
              <br />
              Understand Your Spending.
              <br />
              <span className="text-[#009CE0] dark:text-primary">
                Stay Within Your Budget.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5C6B84] sm:text-lg dark:text-muted-foreground">
              RupeeRoot helps students track daily UPI and cash expenses, plan monthly
              budgets, forecast balances, and build better money habits.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/register"}>
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">Explore Dashboard</Link>
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-5 text-xs font-medium text-[#5C6B84] dark:text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00B86B]" />
                INR (₹) & IST ready
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00B86B]" />
                Instant budget alerts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00B86B]" />
                CSV & PDF reports
              </span>
            </div>
          </div>

          {/* Right Column: Pure White Dashboard Preview */}
          <div id="overview" className="lg:col-span-6">
            <div className="overflow-hidden rounded-[24px] border border-[#E6EEF6] bg-[#FFFFFF] shadow-[0_14px_40px_-14px_rgba(0,41,112,0.12)] dark:border-border dark:bg-card">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#002970] via-[#009CE0] to-[#00BAF2]" />
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between border-b border-[#E6EEF6] pb-4 dark:border-border">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6B84] dark:text-muted-foreground">
                      Dashboard Preview
                    </p>
                    <p className="mt-0.5 text-base font-bold text-[#002970] dark:text-foreground">
                      November Student Ledger
                    </p>
                  </div>
                  <span className="rounded-full border border-[#00B86B]/25 bg-[#00B86B]/10 px-3 py-1 text-xs font-semibold text-[#008C52]">
                    Wellness Score: 86/100
                  </span>
                </div>

                {/* White Financial Summary Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="rounded-[18px] border border-[#E6EEF6] bg-[#FFFFFF] p-4 dark:border-border dark:bg-card">
                    <p className="text-xs font-medium text-[#5C6B84] dark:text-muted-foreground">
                      Total Balance
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-[#002970] sm:text-2xl dark:text-foreground">
                      ₹4,340
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[#E6EEF6] bg-[#FFFFFF] p-4 dark:border-border dark:bg-card">
                    <p className="text-xs font-medium text-[#5C6B84] dark:text-muted-foreground">
                      Monthly Income
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-[#00B86B] sm:text-2xl">
                      ₹10,500
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[#E6EEF6] bg-[#FFFFFF] p-4 dark:border-border dark:bg-card">
                    <p className="text-xs font-medium text-[#5C6B84] dark:text-muted-foreground">
                      Monthly Expenses
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-[#002970] sm:text-2xl dark:text-foreground">
                      ₹6,160
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[#E6EEF6] bg-[#FFFFFF] p-4 dark:border-border dark:bg-card">
                    <p className="text-xs font-medium text-[#5C6B84] dark:text-muted-foreground">
                      Remaining Budget
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-[#009CE0] sm:text-2xl">
                      ₹1,340
                    </p>
                  </div>
                </div>

                {/* White Analytics & Budget Progress Preview */}
                <div className="mt-4 rounded-[18px] border border-[#E6EEF6] bg-[#FFFFFF] p-4 dark:border-border dark:bg-card">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#002970] dark:text-foreground">
                      Analytics Preview • Income vs Expenses
                    </span>
                    <span className="rounded-full bg-[#E5F8FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#002970]">
                      6-Month Trend
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-5 items-end gap-2.5 pt-2">
                    {[
                      { m: "Jul", inc: "h-12", exp: "h-8" },
                      { m: "Aug", inc: "h-14", exp: "h-10" },
                      { m: "Sep", inc: "h-12", exp: "h-9" },
                      { m: "Oct", inc: "h-16", exp: "h-11" },
                      { m: "Nov", inc: "h-16", exp: "h-10" },
                    ].map((col) => (
                      <div key={col.m} className="flex flex-col items-center gap-1.5">
                        <div className="flex items-end gap-1">
                          <span className={`w-2.5 rounded-t-md bg-[#002970] ${col.inc}`} />
                          <span className={`w-2.5 rounded-t-md bg-[#00BAF2] ${col.exp}`} />
                        </div>
                        <span className="text-[10px] font-medium text-[#5C6B84]">{col.m}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-[#E6EEF6] pt-3 text-xs dark:border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#002970] dark:text-foreground">
                        Food Budget (₹2,350 / ₹3,000)
                      </span>
                      <span className="font-semibold text-[#B45309]">78%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E5F8FE] dark:bg-muted">
                      <div className="h-full w-[78%] rounded-full bg-[#F59E0B]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pure White Features Section */}
      <section id="features" className="border-t border-[#E6EEF6] bg-[#FFFFFF] py-14 dark:border-border dark:bg-background lg:py-16">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#009CE0]">
              Built for Student Finances
            </span>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#002970] sm:text-3xl dark:text-foreground">
              Everything You Need in One Clean Workspace
            </h2>
            <p className="mt-2 text-sm text-[#5C6B84] sm:text-base dark:text-muted-foreground">
              Fast everyday expense tracking paired with PostgreSQL persistence,
              forecasting, savings goals, and exportable reports.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Wallet,
                title: "Income & Expense Tracking",
                desc: "Log monthly allowance, freelance payouts, UPI spends, and cash receipts quickly.",
              },
              {
                icon: BellRing,
                title: "Smart Budget Alerts",
                desc: "Configure overall and category limits with automated 75%, 90%, and 100% alerts.",
              },
              {
                icon: BarChart3,
                title: "Visual Analytics",
                desc: "Explore category donuts, daily expense curves, and 6-month cash flow bars.",
              },
              {
                icon: Sparkles,
                title: "Smart Spending Insights",
                desc: "Detect top expense categories, MoM changes, and potential overspending early.",
              },
              {
                icon: TrendingUp,
                title: "Budget Forecasting",
                desc: "Estimate end-of-month spending from your pace with transparent confidence levels.",
              },
              {
                icon: PiggyBank,
                title: "Savings Goals",
                desc: "Track targets for a laptop, course, or emergency fund with contribution logs.",
              },
              {
                icon: Repeat,
                title: "Recurring & CSV Import",
                desc: "Schedule monthly allowance or rent and bulk-import statements with duplicate checks.",
              },
              {
                icon: FileSpreadsheet,
                title: "CSV & PDF Reports",
                desc: "Download clean monthly financial reports and filtered transaction histories.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-[20px] border border-[#E6EEF6] bg-[#FFFFFF] p-5 shadow-[0_2px_10px_-4px_rgba(0,41,112,0.05)] transition-all duration-150 hover:border-[#00BAF2]/50 hover:shadow-md dark:border-border dark:bg-card"
                >
                  <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F8FE] text-[#009CE0]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#002970] dark:text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5C6B84] dark:text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pure White How It Works Section */}
      <section id="how-it-works" className="border-t border-[#E6EEF6] bg-[#FFFFFF] py-14 dark:border-border dark:bg-background lg:py-16">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
          <h2 className="text-2xl font-bold tracking-tight text-[#002970] sm:text-3xl dark:text-foreground">
            How RupeeRoot Works
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Record Transactions",
                desc: "Add income and daily expenses, categorize them cleanly, or import a CSV sheet.",
              },
              {
                step: "02",
                title: "Plan Monthly Limits",
                desc: "Define an overall monthly budget and category caps like Food, Travel, and Education.",
              },
              {
                step: "03",
                title: "Track, Forecast & Save",
                desc: "Receive timely alerts, review end-of-month forecasts, and grow your savings goals.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-[20px] border border-[#E6EEF6] bg-[#FFFFFF] p-6 shadow-[0_2px_10px_-4px_rgba(0,41,112,0.05)] dark:border-border dark:bg-card"
              >
                <span className="inline-flex rounded-full bg-[#E5F8FE] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#002970]">
                  Step {s.step}
                </span>
                <h3 className="mt-3 text-base font-semibold text-[#002970] dark:text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5C6B84] dark:text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pure White CTA Section */}
      <section id="benefits" className="border-t border-[#E6EEF6] bg-[#FFFFFF] py-12 dark:border-border dark:bg-background lg:py-14">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
          <div className="overflow-hidden rounded-[24px] border border-[#E6EEF6] bg-[#FFFFFF] shadow-[0_10px_30px_-12px_rgba(0,41,112,0.08)] dark:border-border dark:bg-card">
            <div className="h-1 w-full bg-[#00BAF2]" />
            <div className="flex flex-col items-start justify-between gap-8 p-8 lg:flex-row lg:items-center lg:p-10">
              <div className="max-w-xl">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#009CE0]">
                  <ShieldCheck className="h-4 w-4" />
                  Private & Student-Ready
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#002970] sm:text-3xl dark:text-foreground">
                  Build Better Money Habits Every Semester
                </h2>
                <p className="mt-2 text-sm text-[#5C6B84] sm:text-base dark:text-muted-foreground">
                  Powered by PostgreSQL persistence, accurate decimal calculations, responsive
                  mobile cards, and installable PWA support.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/register">Create Free Account</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">Explore Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E6EEF6] bg-[#FFFFFF] py-10 dark:border-border dark:bg-card lg:py-12">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
          <div className="flex flex-col justify-between gap-8 pb-8 md:flex-row md:items-center">
            <div className="max-w-sm space-y-3">
              <Link href="/" className="inline-flex items-center">
                <BrandLogo size="md" />
              </Link>
              <p className="text-sm leading-relaxed text-[#5C6B84] dark:text-muted-foreground">
                Track your expenses, manage your monthly budget, and build better
                money habits.
              </p>
            </div>

            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold text-[#002970] dark:text-foreground"
            >
              <a href="#overview" className="transition-colors hover:text-[#009CE0]">
                Overview
              </a>
              <a href="#features" className="transition-colors hover:text-[#009CE0]">
                Features
              </a>
              <a href="#how-it-works" className="transition-colors hover:text-[#009CE0]">
                How It Works
              </a>
              <a href="#benefits" className="transition-colors hover:text-[#009CE0]">
                For Students
              </a>
            </nav>
          </div>

          <div className="flex flex-col items-start justify-between gap-3 border-t border-[#E6EEF6] pt-6 text-xs sm:flex-row sm:items-center dark:border-border">
            <p className="text-[#5C6B84] dark:text-muted-foreground">
              © 2026 RupeeRoot. All rights reserved.
            </p>
            <p className="font-semibold text-[#009CE0]">
              Build better money habits.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
