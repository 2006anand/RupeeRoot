"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { formatDateInTimezone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/providers/app-providers";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadNotifications = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      setItems(json.data.items ?? []);
      setUnreadCount(json.data.unreadCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (!res.ok) {
      toast({ title: "Could not mark notification as read", variant: "error" });
      return;
    }
    await loadNotifications();
    router.refresh();
  }

  async function markAllRead() {
    const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
    if (!res.ok) {
      toast({ title: "Could not mark all notifications as read", variant: "error" });
      return;
    }
    toast({ title: "All notifications marked as read", variant: "success" });
    await loadNotifications();
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Could not delete notification", variant: "error" });
      return;
    }
    await loadNotifications();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Budget warnings, goal milestones, and recurring transaction updates ({unreadCount}{" "}
              unread).
            </p>
          </div>
        </div>

        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </Button>
        ) : null}
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNotifications} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="You're all caught up"
          description="Alerts appear here automatically when spending crosses 75%, 90%, or 100% of a budget, or when a savings milestone is reached."
        />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card
              key={n.id}
              className={
                n.isRead
                  ? "opacity-80"
                  : "border-[#00BAF2]/50 bg-card"
              }
            >
              <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <Badge
                      variant={
                        n.type === "BUDGET_EXCEEDED"
                          ? "danger"
                          : n.type.startsWith("BUDGET") || n.type === "FORECAST_WARNING"
                          ? "warning"
                          : "info"
                      }
                    >
                      {n.type.replace(/_/g, " ")}
                    </Badge>
                    {!n.isRead ? <Badge variant="success">Unread</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateInTimezone(n.createdAt, "Asia/Kolkata", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  {!n.isRead ? (
                    <Button variant="outline" size="sm" onClick={() => markRead(n.id)}>
                      <Check className="h-3.5 w-3.5" /> Read
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete notification"
                    onClick={() => remove(n.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
