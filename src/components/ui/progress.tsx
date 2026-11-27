import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  indicatorClassName,
  className,
  label,
}: {
  value: number;
  indicatorClassName?: string;
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-[#E5F8FE] dark:bg-muted",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-[#00BAF2] transition-all duration-300",
          indicatorClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
