import type { PropsWithChildren, ReactNode } from "react";

export function PageHeader({
  title,
  actions
}: PropsWithChildren<{
  title: string;
  actions?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
