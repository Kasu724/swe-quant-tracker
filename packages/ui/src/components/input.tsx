import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
      {...props}
    />
  );
}
