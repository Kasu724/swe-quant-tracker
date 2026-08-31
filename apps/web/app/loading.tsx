import { Container } from "@faang-quant/ui";

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-xl bg-slate-200/70 motion-safe:animate-pulse ${className}`} />;
}

/** A lightweight route fallback keeps navigation responsive while server data loads. */
export default function Loading() {
  return (
    <Container className="space-y-8 py-12" role="status" aria-label="Loading page">
      <div className="flex items-end justify-between border-b border-slate-200 pb-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <Skeleton className="h-52 w-full rounded-3xl" />
      </div>
      <span className="sr-only">Loading page…</span>
    </Container>
  );
}
