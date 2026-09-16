import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../cn";

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn("rounded-2xl border border-slate-200 bg-white shadow-none dark:bg-slate-900", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("p-5 sm:p-6", className)} {...props}>
      {children}
    </div>
  );
}
