"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { loginSchema } from "@/lib/validation";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";

type LoginValues = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setServerError(json?.error?.message ?? "Invalid email or password");
      return;
    }
    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout
      backFallbackHref="/"
      badgeText="Build better money habits • Secure Sign In"
      heroTitle="Welcome back to your personal finance hub."
      heroDescription="Review your monthly budget utilization, check smart spending alerts, and stay ahead of your savings goals."
    >
      <Card className="overflow-hidden shadow-[0_14px_40px_-14px_rgba(0,41,112,0.12)] dark:shadow-none">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#002970] via-[#009CE0] to-[#00BAF2]" />
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to manage your expenses and monthly budgets.
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

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="student@college.edu"
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-[#D94B4B]">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#009CE0] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-[#D94B4B]">{errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            New to RupeeRoot?{" "}
            <Link href="/register" className="font-semibold text-[#009CE0] hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginFormContent />
    </React.Suspense>
  );
}
