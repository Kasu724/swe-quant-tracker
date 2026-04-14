import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "../cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            {eyebrow}
          </div>
        ) : null}
        <h1 className={cn("font-display text-3xl font-semibold tracking-tight text-ink", eyebrow && "mt-1")}>
          {title}
        </h1>
        {description ? <p className="max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
