import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BAF2]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#009CE0] text-white hover:bg-[#0082BE] shadow-[0_4px_14px_-3px_rgba(0,186,242,0.38)]",
        accent:
          "bg-[#009CE0] text-white hover:bg-[#0082BE] shadow-[0_4px_14px_-3px_rgba(0,186,242,0.38)]",
        navy:
          "bg-[#002970] text-white hover:bg-[#001E54] shadow-sm",
        destructive:
          "bg-[#E11D48] text-white hover:bg-[#BE123C] shadow-sm",
        outline:
          "border border-[#E6EEF6] bg-card text-[#002970] hover:bg-[#E5F8FE] hover:border-[#00BAF2]/40 shadow-[0_1px_2px_rgba(0,41,112,0.03)] dark:border-border dark:text-foreground dark:hover:bg-muted",
        secondary:
          "bg-[#E5F8FE] text-[#002970] hover:bg-[#CFF1FC] dark:bg-secondary dark:text-foreground",
        ghost:
          "text-[#5C6B84] hover:bg-[#E5F8FE] hover:text-[#002970] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground",
        link: "text-[#009CE0] underline-offset-4 hover:underline dark:text-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-11 rounded-xl px-6 text-sm",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
