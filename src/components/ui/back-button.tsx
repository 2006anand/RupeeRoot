"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function BackButton({
  fallbackHref = "/dashboard",
  label = "Back",
  onClickOverride,
  className,
}: {
  fallbackHref?: string;
  label?: string;
  onClickOverride?: () => void;
  className?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (onClickOverride) {
      onClickOverride();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleBack}
      aria-label={label}
      className={cn("shrink-0 gap-1.5", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
