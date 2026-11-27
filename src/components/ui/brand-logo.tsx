import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const heightClass =
    size === "sm"
      ? "h-7 sm:h-8"
      : size === "lg"
      ? "h-10 sm:h-11"
      : "h-9 sm:h-10";

  return (
    <Image
      src="/images/rupeeroot-logo.png"
      alt="RupeeRoot — Build Better Money Habits"
      width={931}
      height={211}
      priority
      unoptimized
      className={cn(heightClass, "w-auto shrink-0 object-contain", className)}
    />
  );
}
