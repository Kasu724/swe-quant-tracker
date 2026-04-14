import { Card, CardContent } from "./card";

export function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
        {hint ? <div className="text-sm text-slate-600">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

