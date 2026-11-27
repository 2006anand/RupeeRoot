"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { registerSchema } from "@/lib/validation";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";

type RegisterValues = z.input<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setServerError(json?.error?.message ?? "Unable to create account");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout
      backFallbackHref="/"
      badgeText="Build better money habits • Free Student Account"
      heroTitle="Start building smarter financial habits today."
      heroDescription="Create your RupeeRoot workspace in seconds to track expenses, plan monthly limits, and reach your savings goals."
    >
      <Card className="overflow-hidden shadow-[0_14px_40px_-14px_rgba(0,41,112,0.12)] dark:shadow-none">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#002970] via-[#009CE0] to-[#00BAF2]" />
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Create your account</CardTitle>
          <CardDescription>
            Start tracking expenses and planning monthly budgets in INR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError ? (
              <div
                role="alert"
                className="rounded-xl border border-[#D94B4B]/25 bg-[#D94B4B]/10 px-3.5 py-2.5 text-xs font-medium text-[#D94B4B]"
              >
                {serverError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Aarav Sharma" {...register("name")} />
                {errors.name ? (
                  <p className="text-xs text-[#D94B4B]">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="aarav@college.edu"
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-[#D94B4B]">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-xs text-[#D94B4B]">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Select id="currency" {...register("currency")}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Select id="timezone" {...register("timezone")}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#009CE0] hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
