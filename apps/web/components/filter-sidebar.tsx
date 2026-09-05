import { ListingFilterFields } from "./listing-filter-fields";
import { Badge, Button, Card, CardContent } from "@swe-quant/ui";
import { cn } from "@swe-quant/ui";
import type { ListingFilters } from "@swe-quant/shared";

function FilterSidebarForm({
  companies,
  filters,
  basePath,
  compact
}: {
  companies: Array<{ slug: string; name: string; _count: { postings: number } }>;
  filters: ListingFilters;
  basePath: string;
  compact: boolean;
}) {
  return (
    <form className="space-y-4" method="GET" action={basePath}>
      <ListingFilterFields companies={companies} filters={filters} compact={compact} />
      <div className={cn("flex gap-3", compact && "flex-col")}>
        <Button type="submit" className="flex-1">
          Apply
        </Button>
        <Button variant="secondary" asChild>
          <a href={basePath}>Reset</a>
        </Button>
      </div>
    </form>
  );
}

export function FilterSidebar({
  companies,
  filters,
  basePath,
  variant = "card"
}: {
  companies: Array<{ slug: string; name: string; _count: { postings: number } }>;
  filters: ListingFilters;
  basePath: string;
  variant?: "card" | "rail" | "responsive";
}) {
  const shellClassName =
    variant === "rail"
      ? "h-full rounded-none border-0 border-r border-slate-200 bg-white/88 shadow-none backdrop-blur-xl"
      : variant === "responsive"
        ? "border border-slate-200 bg-white shadow-panel xl:h-full xl:rounded-none xl:border-0 xl:border-r xl:bg-white/88 xl:shadow-none xl:backdrop-blur-xl"
      : "border border-slate-200 bg-white shadow-panel";

  const contentClassName = variant === "rail" || variant === "responsive" ? "space-y-5 p-5" : "space-y-5";

  return (
    <Card className={cn(shellClassName)}>
      <CardContent className={contentClassName}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
              Filters
            </div>
            <h2 className="font-display text-xl font-semibold text-ink">Search the feed</h2>
          </div>
          <Badge tone="neutral">{companies.length} companies</Badge>
        </div>
        <FilterSidebarForm
          companies={companies}
          filters={filters}
          basePath={basePath}
          compact={variant === "rail" || variant === "responsive"}
        />
      </CardContent>
    </Card>
  );
}
