import { Container } from "@swe-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-zinc-200/80 motion-safe:animate-pulse dark:bg-zinc-700 ${className}`} />;
}

export default function InternshipDetailLoading() {
  return (
    <Container className="space-y-8 py-10" role="status" aria-label="Loading internship">
      <div className="flex items-end justify-between border-b border-slate-200 pb-5"><div className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-3/4 max-w-xl" /></div><Skeleton className="h-10 w-28" /></div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]"><div className="space-y-6"><div className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900"><div className="flex gap-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-20" /></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div><div className="mt-6 space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></div><div className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900"><Skeleton className="h-7 w-44" /><Skeleton className="mt-5 h-20 w-full" /></div></div><div className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900"><Skeleton className="h-4 w-32" /><Skeleton className="mt-5 h-10 w-full" /><Skeleton className="mt-3 h-10 w-full" /><Skeleton className="mt-3 h-10 w-full" /></div></div>
    </Container>
  );
}
