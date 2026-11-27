import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#002970] text-white",
        secondary:
          "border-[#BDEBFB] bg-[#E5F8FE] text-[#002970] dark:border-border dark:bg-secondary dark:text-foreground",
        success:
          "border-[#00B86B]/25 bg-[#00B86B]/10 text-[#008C52]",
        warning:
          "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#B45309]",
        danger:
          "border-[#E11D48]/25 bg-[#E11D48]/10 text-[#E11D48]",
        info:
          "border-[#00BAF2]/30 bg-[#E5F8FE] text-[#002970] dark:border-border dark:bg-secondary dark:text-primary",
        outline: "border-[#E6EEF6] bg-card text-foreground dark:border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
