import { Container } from "@swe-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-zinc-200/80 motion-safe:animate-pulse dark:bg-zinc-700 ${className}`} />;
}

export default function CompaniesLoading() {
  return (
    <Container className="space-y-8 py-10" role="status" aria-label="Loading companies">
      <div className="space-y-3 border-b border-slate-200 pb-5"><Skeleton className="h-3 w-28" /><Skeleton className="h-9 w-56" /></div>
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="space-y-4">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4"><div className="space-y-3"><Skeleton className="h-6 w-56" /><Skeleton className="h-4 w-72 max-w-[65vw]" /></div><Skeleton className="h-5 w-20" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          </div>
        ))}
      </div>
    </Container>
  );
}
