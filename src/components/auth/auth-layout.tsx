"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, PieChart, Wallet } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { BrandLogo } from "@/components/ui/brand-logo";

export function AuthLayout({
  backFallbackHref = "/",
  backOverride,
  badgeText,
  heroTitle,
  heroDescription,
  children,
}: {
  backFallbackHref?: string;
  backOverride?: () => void;
  badgeText: string;
  heroTitle: string;
  heroDescription: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFFFFF] text-[#002970] dark:bg-background dark:text-foreground">
      {/* Paytm-inspired cyan accent bar + pure white top header */}
      <header className="border-b border-[#E6EEF6] bg-[#FFFFFF] dark:border-border dark:bg-card">
        <div className="h-1 w-full bg-[#00BAF2]" />
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
          <BackButton
            fallbackHref={backFallbackHref}
            label="Back"
            onClickOverride={backOverride}
          />
          <Link href="/" className="flex items-center">
            <BrandLogo size="md" />
          </Link>
        </div>
      </header>

      {/* Responsive Split Grid: 1-col on mobile, 2-col on tablet/laptop/desktop/monitor */}
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 items-center px-4 py-8 sm:px-6 md:py-10 lg:px-8 xl:px-10 2xl:max-w-[1600px]">
        <div className="grid w-full items-center gap-8 md:grid-cols-12 lg:gap-12">
          {/* Left Showcase Panel (visible on tablet, laptop, desktop, monitor) */}
          <div className="hidden space-y-6 md:col-span-5 md:block lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BDEBFB] bg-[#E5F8FE] px-3.5 py-1.5 text-xs font-semibold text-[#002970] dark:border-border dark:bg-secondary dark:text-primary">
              <Wallet className="h-3.5 w-3.5 text-[#009CE0]" />
              {badgeText}
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#002970] lg:text-4xl lg:leading-[1.15] dark:text-foreground">
                {heroTitle}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-[#5C6B84] lg:text-base dark:text-muted-foreground">
                {heroDescription}
              </p>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-1">
              {[
                {
                  icon: Wallet,
                  title: "Track Every Rupee in Real Time",
                  desc: "Log UPI, cash, and monthly allowances with automatic balance updates.",
                },
                {
                  icon: BellRing,
                  title: "Smart Budget Guardrails",
                  desc: "Get warned at 75%, 90%, and 100% before overspending happens.",
                },
                {
                  icon: PieChart,
                  title: "Visual Insights & PDF Reports",
                  desc: "Understand category trends, pace forecasts, and savings goals.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3.5 rounded-[18px] border border-[#E6EEF6] bg-[#FFFFFF] p-4 shadow-[0_2px_10px_-4px_rgba(0,41,112,0.05)] dark:border-border dark:bg-card"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F8FE] text-[#009CE0]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#002970] dark:text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#5C6B84] dark:text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#5C6B84] dark:text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00B86B]" />
                Default Currency: INR (₹)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00B86B]" />
                Timezone: Asia/Kolkata
              </span>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="w-full md:col-span-7 lg:col-span-6">
            <div className="mx-auto w-full max-w-lg lg:max-w-xl">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
