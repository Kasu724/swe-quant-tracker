import { Container } from "@swe-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-slate-200/80 motion-safe:animate-pulse dark:bg-slate-800 ${className}`} />;
}

export default function ListLoading() {
  return (
    <Container className="space-y-8 py-10" role="status" aria-label="Loading list">
      <div className="flex items-end justify-between border-b border-slate-200 pb-5"><Skeleton className="h-9 w-24" /><Skeleton className="h-10 w-40" /></div>
      <div className="space-y-4">{[0, 1, 2].map((row) => <div key={row} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900"><Skeleton className="h-5 w-5 shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-56" /><div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-24" /></div></div></div>)}</div>
    </Container>
  );
}
