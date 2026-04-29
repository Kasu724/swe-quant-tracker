import { Badge, Button, Card, CardContent, Checkbox, Input, Select } from "@faang-quant/ui";
import { cn } from "@faang-quant/ui";
import type { ListingFilters } from "@faang-quant/shared";

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
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Keyword</label>
        <Input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Company, title, location"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Company</label>
        <Select name="company" defaultValue={filters.companySlugs[0] ?? ""}>
          <option value="">All companies</option>
          {companies.map((company) => (
            <option key={company.slug} value={company.slug}>
              {company.name} ({company._count.postings})
            </option>
          ))}
        </Select>
      </div>
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Bucket</label>
          <Select name="bucket" defaultValue={filters.companyBuckets[0] ?? ""}>
            <option value="">All buckets</option>
            <option value="FAANG">FAANG</option>
            <option value="BIG_TECH">Big Tech</option>
            <option value="QUANT">Quant</option>
            <option value="TRADING">Trading</option>
            <option value="HEDGE_FUND">Hedge Fund</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Role</label>
          <Select name="category" defaultValue={filters.roleCategories[0] ?? ""}>
            <option value="">All roles</option>
            <option value="SWE">SWE</option>
            <option value="QUANT_DEV">Quant Dev</option>
            <option value="QUANT_RESEARCH">Quant Research</option>
            <option value="TRADING">Trading</option>
            <option value="DATA_ML_AI">Data / ML / AI</option>
            <option value="SECURITY">Security</option>
            <option value="INFRA_SYSTEMS">Infra / Systems</option>
            <option value="HARDWARE_FPGA_LOW_LATENCY">Hardware / FPGA</option>
            <option value="PRODUCT_PM">Product</option>
          </Select>
        </div>
      </div>
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Season</label>
          <Select name="season" defaultValue={filters.seasons[0] ?? ""}>
            <option value="">All seasons</option>
            <option value="SPRING">Spring</option>
            <option value="SUMMER">Summer</option>
            <option value="FALL">Fall</option>
            <option value="WINTER">Winter</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Year</label>
          <Input name="year" defaultValue={filters.years[0] ?? ""} placeholder="2027" />
        </div>
      </div>
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Location</label>
          <Input
            name="location"
            defaultValue={filters.locations[0] ?? ""}
            placeholder="New York"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Workplace</label>
          <Select name="remote" defaultValue={filters.remoteTypes[0] ?? ""}>
            <option value="">All</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </Select>
        </div>
      </div>
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Pay</label>
          <Select name="payKnown" defaultValue={filters.payKnown}>
            <option value="all">All</option>
            <option value="known">Pay known</option>
            <option value="unknown">Pay unknown</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Minimum pay</label>
          <Input
            name="minimumPay"
            type="number"
            defaultValue={filters.minimumPay ?? ""}
            placeholder="35"
          />
        </div>
      </div>
      <div className="grid gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox name="activeOnly" defaultChecked={filters.activeOnly} />
          Active listings only
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            name="includeMissingLocation"
            defaultChecked={filters.includeMissingLocation}
          />
          Include missing location
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox name="includeMissingPay" defaultChecked={filters.includeMissingPay} />
          Include missing pay
        </label>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Sort</label>
        <Select name="sort" defaultValue={filters.sort}>
          <option value="postingDate">Posting date</option>
          <option value="discoveredDate">Discovered date</option>
          <option value="company">Company</option>
          <option value="pay">Pay</option>
          <option value="location">Location</option>
        </Select>
      </div>
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
  variant?: "card" | "rail";
}) {
  const shellClassName =
    variant === "rail"
      ? "h-full rounded-none border-0 border-r border-slate-200 bg-white/88 shadow-none backdrop-blur-xl"
      : "border border-slate-200 bg-white shadow-panel";

  const contentClassName = variant === "rail" ? "space-y-5 p-5" : "space-y-5";

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
          compact={variant === "rail"}
        />
      </CardContent>
    </Card>
  );
}
