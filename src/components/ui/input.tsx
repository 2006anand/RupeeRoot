import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#E6EEF6] bg-card px-3.5 py-2 text-sm text-foreground transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#5C6B84] focus-visible:border-[#00BAF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BAF2]/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-input",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
