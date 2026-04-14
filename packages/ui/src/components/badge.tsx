import type { PropsWithChildren } from "react";
import { cn } from "../cn";

export function Badge({
  children,
  tone = "neutral",
  className
}: PropsWithChildren<{ tone?: "neutral" | "brand" | "success" | "warning"; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "brand" && "bg-brand-100 text-brand-700",
        tone === "success" && "bg-emerald-100 text-emerald-700",
        tone === "warning" && "bg-amber-100 text-amber-700",
        className
      )}
    >
      {children}
    </span>
  );
}

