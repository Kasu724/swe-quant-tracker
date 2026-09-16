import { Container } from "@swe-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-slate-200/80 motion-safe:animate-pulse dark:bg-slate-800 ${className}`} />;
}

/** A lightweight route fallback keeps navigation responsive while server data loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading page">
      <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-80 border-r border-slate-200 bg-white p-5 xl:block dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </aside>
      <Container className="space-y-8 py-10 xl:max-w-none xl:pl-[22rem]">
        <div className="flex items-end justify-between border-b border-slate-200 pb-5">
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-56" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-9 w-24" />
          </div>
          {[0, 1, 2].map((row) => (
            <div key={row} className="space-y-4 border-b border-slate-200 py-5 first:pt-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-6 w-72 max-w-[70vw]" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-64 max-w-[60%]" />
                <div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-24" /></div>
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">Loading page…</span>
      </Container>
    </div>
  );
}
