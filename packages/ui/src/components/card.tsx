import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../cn";

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn("rounded-3xl border border-slate-200 bg-white shadow-panel", className)}
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
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

