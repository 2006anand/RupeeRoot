import * as React from "react";
import { AlertTriangle, CheckCircle2, Inbox, OctagonAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BudgetStatus } from "@/types";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#E6EEF6] bg-card px-6 py-10 text-center dark:border-border">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E5F8FE] text-[#009CE0] dark:bg-secondary dark:text-primary">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 w-full animate-pulse rounded-[18px] border border-[#E6EEF6] bg-slate-50 dark:border-border dark:bg-muted/40"
        />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-[20px] border border-[#E11D48]/25 bg-card px-6 py-8 text-center"
    >
      <AlertTriangle className="mb-2 h-6 w-6 text-[#E11D48]" />
      <p className="text-sm font-semibold text-[#E11D48]">Something went wrong</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </Button>
      ) : null}
    </div>
  );
}

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  if (status === "EXCEEDED") {
    return (
      <Badge variant="danger">
        <OctagonAlert className="h-3 w-3" /> Exceeded
      </Badge>
    );
  }
  if (status === "HIGH") {
    return (
      <Badge variant="warning">
        <AlertTriangle className="h-3 w-3" /> High Alert (90%+)
      </Badge>
    );
  }
  if (status === "WARNING") {
    return (
      <Badge variant="warning">
        <AlertTriangle className="h-3 w-3" /> Warning (75%+)
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <CheckCircle2 className="h-3 w-3" /> On Track
    </Badge>
  );
}
