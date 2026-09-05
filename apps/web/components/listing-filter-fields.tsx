import { Checkbox, Input, Select, cn } from "@swe-quant/ui";
import type { ListingFilters } from "@swe-quant/shared";

export function ListingFilterFields({
  companies, filters, compact = false, multipleCompanies = false, showSort = true
}: {
  companies: Array<{ slug: string; name: string; _count: { postings: number } }>;
  filters: ListingFilters;
  compact?: boolean;
  multipleCompanies?: boolean;
  showSort?: boolean;
}) {
  return (
    <>
      <input type="hidden" name="usOnly" value={String(filters.usOnly)} />
      {filters.recentlyPostedDays ? <input type="hidden" name="recent" value={filters.recentlyPostedDays} /> : null}
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
        <Select
          name="company"
          multiple={multipleCompanies}
          size={multipleCompanies ? 6 : undefined}
          className={multipleCompanies ? "h-auto min-h-32" : undefined}
          defaultValue={multipleCompanies ? filters.companySlugs : filters.companySlugs[0] ?? ""}
        >
          {!multipleCompanies ? <option value="">All companies</option> : null}
          {companies.map((company) => (
            <option key={company.slug} value={company.slug}>
              {company.name} ({company._count.postings})
            </option>
          ))}
        </Select>
        {multipleCompanies ? <p className="text-xs text-slate-500">Leave empty for all companies. Hold Ctrl or Command to select multiple companies.</p> : null}
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
          <input type="hidden" name="activeOnly" value="false" />
          <Checkbox name="activeOnly" defaultChecked={filters.activeOnly} />
          Active listings only
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="hidden" name="includeMissingLocation" value="false" />
          <Checkbox
            name="includeMissingLocation"
            defaultChecked={filters.includeMissingLocation}
          />
          Include missing location
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="hidden" name="includeMissingPay" value="false" />
          <Checkbox name="includeMissingPay" defaultChecked={filters.includeMissingPay} />
          Include missing pay
        </label>
      </div>
      {showSort ? (
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
      ) : <input type="hidden" name="sort" value={filters.sort} />}
    </>
  );
}
