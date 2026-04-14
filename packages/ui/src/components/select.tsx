import type { PropsWithChildren, SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export function Select({
  children,
  className,
  ...props
}: PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

