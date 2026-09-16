"use client";

import { useRef } from "react";
import { Button, Input, Select } from "@swe-quant/ui";
import type { ListingFilters } from "@swe-quant/shared";
import { saveSearchAction } from "../lib/actions";
import { parseListingFilterForm } from "../lib/listing-filter-params";
import { ListingFilterFields } from "./listing-filter-fields";

type Company = { slug: string; name: string; _count: { postings: number } };

export function SaveSearchSettingsForm({
  companies,
  filters
}: {
  companies: Company[];
  filters: ListingFilters;
}) {
  const payloadRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={saveSearchAction}
      className="space-y-5"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const parsedFilters = parseListingFilterForm(new FormData(form));
        if (payloadRef.current) {
          payloadRef.current.value = JSON.stringify(parsedFilters);
        }
      }}
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

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-slate-700">Search filters</legend>
        <p className="text-sm text-slate-600">
          Save a search using the same filters as the internships feed and receive alerts for new matches.
        </p>
        <ListingFilterFields companies={companies} filters={filters} idPrefix="saved-search-filter" />
      </fieldset>

      <input ref={payloadRef} type="hidden" name="filterPayload" defaultValue={JSON.stringify(filters)} />
      <Button type="submit">Save search</Button>
    </form>
  );
}
