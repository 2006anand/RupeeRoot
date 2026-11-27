"use client";

import * as React from "react";
import { Loader2, Moon, Smartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/states";
import { useTheme, useToast } from "@/components/providers/app-providers";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [currency, setCurrency] = React.useState("INR");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata");
  const [warningThreshold, setWarningThreshold] = React.useState("75");
  const [highThreshold, setHighThreshold] = React.useState("90");
  const [exceededThreshold, setExceededThreshold] = React.useState("100");
  const [monthlyIncomeTarget, setMonthlyIncomeTarget] = React.useState("");

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        const u = json?.data?.user;
        if (u) {
          setName(u.name);
          setEmail(u.email);
          setCurrency(u.currency);
          setTimezone(u.timezone);
          setWarningThreshold(String(u.warningThreshold));
          setHighThreshold(String(u.highThreshold));
          setExceededThreshold(String(u.exceededThreshold));
          setMonthlyIncomeTarget(
            u.monthlyIncomeTarget !== null ? String(u.monthlyIncomeTarget) : ""
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currency,
          timezone,
          warningThreshold: Number(warningThreshold),
          highThreshold: Number(highThreshold),
          exceededThreshold: Number(exceededThreshold),
          monthlyIncomeTarget:
            monthlyIncomeTarget.trim() !== "" ? Number(monthlyIncomeTarget) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast({
          title: "Could not save settings",
          description: json?.error?.message,
          variant: "error",
        });
        return;
      }
      toast({ title: "Profile & preferences updated", variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/dashboard" className="mt-0.5" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-sm text-muted-foreground">
            Customize currency, timezone, budget alert thresholds, and appearance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account & Finance Preferences</CardTitle>
            <CardDescription>
              Currency & timezone changes apply across dashboards, budgets, and reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-name">Full Name</Label>
                  <Input
                    id="set-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-email">Email Address</Label>
                  <Input id="set-email" value={email} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="set-currency">Primary Currency</Label>
                  <Select
                    id="set-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="set-tz">Timezone</Label>
                  <Select
                    id="set-tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="set-income-target">Monthly Income Target</Label>
                  <Input
                    id="set-income-target"
                    type="number"
                    min="0"
                    placeholder="e.g., 8000"
                    value={monthlyIncomeTarget}
                    onChange={(e) => setMonthlyIncomeTarget(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-semibold">Budget Alert Thresholds (%)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="th-warn">Warning %</Label>
                    <Input
                      id="th-warn"
                      type="number"
                      min="10"
                      max="95"
                      value={warningThreshold}
                      onChange={(e) => setWarningThreshold(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="th-high">High Warning %</Label>
                    <Input
                      id="th-high"
                      type="number"
                      min="20"
                      max="99"
                      value={highThreshold}
                      onChange={(e) => setHighThreshold(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="th-exc">Exceeded %</Label>
                    <Input
                      id="th-exc"
                      type="number"
                      min="50"
                      max="200"
                      value={exceededThreshold}
                      onChange={(e) => setExceededThreshold(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Switch between light and dark themes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" /> Switch to Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" /> Switch to Dark Mode
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#009CE0]" />
                Install RupeeRoot (PWA)
              </CardTitle>
              <CardDescription>
                Use RupeeRoot like a native app on desktop and mobile
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">
              RupeeRoot includes a web app manifest and service worker. On Chrome or
              Edge, click the <strong>Install</strong> icon in the address bar; on iOS
              Safari, tap <strong>Share → Add to Home Screen</strong>.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
