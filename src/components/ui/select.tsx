import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[#E6EEF6] bg-card px-3.5 py-2 text-sm text-foreground transition-colors focus-visible:border-[#00BAF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BAF2]/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-input",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
