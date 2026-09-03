import { Container, EmptyState, PageHeader, Button, Input, Select } from "@swe-quant/ui";
import type { ApplicationState } from "@swe-quant/db";
import { FilterSidebar } from "./filter-sidebar";
import { InfiniteListings } from "./infinite-listings";
import { saveSearchAction } from "../lib/actions";
import { getLocalProfile } from "../lib/local-profile";
import {
  getApplicationStateMap,
  getFavoritePostingIds,
  getPostingListIds,
  getListingFilterMetadata,
  getListingsPage,
  parseListingFilters,
  serializeFeedListing
} from "../lib/queries";
import type { ListingFilters } from "@swe-quant/shared";

const LISTINGS_PER_PAGE = 25;

export function buildSearchQuery(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  const internalParams = new Set(["format", "limit", "offset", "page"]);

  for (const [key, value] of Object.entries(searchParams)) {
    if (internalParams.has(key)) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }

  return params.toString();
}

export async function InternshipsFeedPage({
  searchParams,
  basePath
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  basePath: string;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  let filters: ListingFilters;

  try {
    filters = parseListingFilters(resolvedSearchParams);
  } catch {
    filters = parseListingFilters({});
  }
  const user = await getLocalProfile();
  const [{ listings, total }, companies] = await Promise.all([
    getListingsPage(filters, user.id, { offset: 0, limit: LISTINGS_PER_PAGE }),
    getListingFilterMetadata()
  ]);
  const initialListings = listings;
  const postingIds = initialListings.map((listing) => listing.id);
  const [favoriteIds, listIds, applicationStateMap] = await Promise.all([
    getFavoritePostingIds(user.id, postingIds),
    getPostingListIds(user.id, postingIds),
    getApplicationStateMap(user.id, postingIds)
  ]);
  const queryString = buildSearchQuery(resolvedSearchParams);
  const listHref = queryString ? `${basePath}?${queryString}` : basePath;
  const exportHref = `/api/internships${queryString ? `?${queryString}&` : "?"}format=csv`;
  const applicationStates = Object.fromEntries(applicationStateMap.entries()) as Record<
    string,
    ApplicationState
  >;

  return (
    <div className="relative">
      <Container className="space-y-8 py-12 xl:max-w-none xl:pl-[22rem]">
        <PageHeader
          title="Internship feed"
          actions={
            <Button asChild>
              <a href={exportHref}>Export CSV</a>
            </Button>
          }
        />

        <form
          action={saveSearchAction}
          className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-panel md:grid-cols-[1.4fr_0.8fr_0.6fr_auto]"
        >
            <Input name="name" placeholder="Saved search name" />
            <input type="hidden" name="filterPayload" value={JSON.stringify(filters)} />
            <Select name="alertCadence" defaultValue="IMMEDIATE">
              <option value="IMMEDIATE">Immediate alerts</option>
              <option value="DAILY">Daily digest</option>
            </Select>
            <div className="text-sm text-slate-500">
              Save the current filter set and receive email alerts for new matches.
            </div>
            <Button type="submit">Save search</Button>
        </form>

        <div className="space-y-8">
          <aside className="xl:fixed xl:bottom-0 xl:left-0 xl:top-20 xl:z-20 xl:w-80 xl:overflow-hidden">
            <div className="xl:h-full xl:overflow-y-auto xl:border-r xl:border-white/60 xl:bg-white/84 xl:shadow-[12px_0_40px_rgba(15,23,42,0.12)] xl:backdrop-blur-xl">
              <FilterSidebar
                companies={companies}
                filters={filters}
                basePath={basePath}
                variant="responsive"
              />
            </div>
          </aside>
          <div className="space-y-4">
            {total === 0 ? (
              <EmptyState
                title="No internships matched"
                description="Adjust season, location, pay, or company filters to widen the search."
              />
            ) : (
              <InfiniteListings
                initialListings={initialListings.map(serializeFeedListing)}
                total={total}
                batchSize={LISTINGS_PER_PAGE}
                queryString={queryString}
                listHref={listHref}
                favoriteIds={Array.from(favoriteIds)}
                listIds={Array.from(listIds)}
                applicationStates={applicationStates}
              />
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
