import { Container } from "@swe-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-zinc-200/80 motion-safe:animate-pulse dark:bg-zinc-700 ${className}`} />;
}

function FilterSkeleton() {
  return (
    <div className="space-y-4 border-t border-slate-200 pt-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((field) => <Skeleton key={field} className="h-10 w-full" />)}
      </div>
      <div className="space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-44" /></div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <Container className="space-y-8 py-10" role="status" aria-label="Loading settings">
      <div className="space-y-3 border-b border-slate-200 pb-5"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-80 max-w-full" /></div>

      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:bg-zinc-900">
        <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-3 w-72 max-w-full" /><Skeleton className="h-4 w-44" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-32" /></div>
      </section>

      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:bg-zinc-900">
        <div className="space-y-3"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
        <Skeleton className="mt-5 h-14 w-full" />
        <div className="mt-5 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-56" /><FilterSkeleton /><Skeleton className="h-10 w-40" /></div>
      </section>

      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:bg-zinc-900">
        <div className="space-y-3"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-full" /></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        <FilterSkeleton />
        <Skeleton className="mt-5 h-10 w-32" />
      </section>

      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:bg-zinc-900">
        <div className="space-y-3"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
        <div className="mt-5 flex gap-3"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-36" /></div>
      </section>
      <span className="sr-only">Loading settings…</span>
    </Container>
  );
}
