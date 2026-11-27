"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [token, setToken] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [step, setStep] = React.useState<"request" | "reset">("request");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Request failed");
      } else {
        setMessage(json.data.message);
        if (json.data.devResetToken) {
          setToken(json.data.devResetToken);
        }
        setStep("reset");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Could not reset password");
      } else {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      backFallbackHref="/login"
      backOverride={step === "reset" ? () => setStep("request") : undefined}
      badgeText="Account Recovery • RupeeRoot"
      heroTitle="Recover access to your budget workspace."
      heroDescription="Generate a secure reset token and choose a new password to jump straight back into your financial tracker."
    >
      <Card className="overflow-hidden shadow-[0_14px_40px_-14px_rgba(0,41,112,0.12)] dark:shadow-none">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#002970] via-[#009CE0] to-[#00BAF2]" />
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {step === "request"
              ? "Enter your account email to generate a reset token."
              : "Enter your reset token and choose a new password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-xl border border-[#238B68]/25 bg-[#238B68]/10 px-3.5 py-2.5 text-xs text-[#238B68]">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-[#D94B4B]/25 bg-[#D94B4B]/10 px-3.5 py-2.5 text-xs text-[#D94B4B]">
              {error}
            </div>
          ) : null}

          {step === "request" ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Sending..." : "Request Reset Token"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token">Reset Token</Label>
                <Input
                  id="token"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/login" className="font-semibold text-[#009CE0] hover:underline">
              Back to Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
