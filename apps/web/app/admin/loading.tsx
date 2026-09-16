import { Container } from "@swe-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-slate-200/80 motion-safe:animate-pulse dark:bg-slate-800 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <Container className="space-y-10 py-10" role="status" aria-label="Loading source operations">
      <div className="flex items-end justify-between border-b border-slate-200 pb-5"><div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-9 w-80 max-w-[70vw]" /></div><Skeleton className="h-10 w-36" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((row) => <div key={row} className="space-y-3 border-l-2 border-slate-200 px-4 py-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-14" /></div>)}</div>
      {[0, 1, 2].map((section) => <section key={section} className="space-y-4"><Skeleton className="h-7 w-48" /><div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900"><Skeleton className="h-10 w-full" /><Skeleton className="mt-4 h-16 w-full" /></div></section>)}
    </Container>
  );
}
