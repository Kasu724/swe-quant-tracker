import type { PropsWithChildren } from "react";
import { Card, CardContent } from "./card";

export function EmptyState({
  title,
  description,
  children
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <Card className="border-dashed bg-transparent shadow-none">
      <CardContent className="space-y-3 py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}
