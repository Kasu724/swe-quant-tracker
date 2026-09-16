import { Button, Input, Select } from "@swe-quant/ui";
import type { ListingFilters } from "@swe-quant/shared";
import { saveSearchAction } from "../lib/actions";
import { ListingFilterFields } from "./listing-filter-fields";

type Company = { slug: string; name: string; _count: { postings: number } };

export function SaveSearchSettingsForm({
  companies,
  filters
}: {
  companies: Company[];
  filters: ListingFilters;
}) {
  return (
    <form
      action={saveSearchAction}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="saved-search-name">
            Search name
          </label>
          <Input id="saved-search-name" name="name" placeholder="e.g. Quant internships" required maxLength={100} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="saved-search-cadence">
            Alert cadence
          </label>
          <Select id="saved-search-cadence" name="alertCadence" defaultValue="IMMEDIATE">
            <option value="IMMEDIATE">Immediate alerts</option>
            <option value="DAILY">Daily digest</option>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-4 border-t border-slate-200 pt-5">
        <legend className="text-sm font-medium text-slate-700">Search filters</legend>
        <p className="text-sm text-slate-600">
          Save a search using the same filters as the internships feed and receive alerts for new matches.
        </p>
        <ListingFilterFields companies={companies} filters={filters} idPrefix="saved-search-filter" />
      </fieldset>

      <div className="flex justify-start border-t border-slate-200 pt-5">
        <Button type="submit">Save search</Button>
      </div>
    </form>
  );
}
