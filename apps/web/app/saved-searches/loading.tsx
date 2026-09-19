import { Container } from "@swe-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-zinc-200/80 motion-safe:animate-pulse dark:bg-zinc-700 ${className}`} />;
}

export default function SavedSearchesLoading() {
  return (
    <Container className="space-y-10 py-10" role="status" aria-label="Loading saved searches">
      <div className="space-y-3 border-b border-slate-200 pb-5"><Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-72" /></div>
      {["searches", "favorites"].map((section) => <section key={section} className="space-y-4"><Skeleton className="h-7 w-40" /><div className="space-y-3"><div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-zinc-900"><Skeleton className="h-5 w-48" /><Skeleton className="mt-3 h-20 w-full" /></div><div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-zinc-900"><Skeleton className="h-5 w-64" /><Skeleton className="mt-3 h-4 w-44" /></div></div></section>)}
    </Container>
  );
}
