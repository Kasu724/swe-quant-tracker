import { Container, EmptyState, PageHeader, Button, Input, Select } from "@faang-quant/ui";
import type { ApplicationState } from "@faang-quant/db";
import { FilterSidebar } from "./filter-sidebar";
import { InfiniteListings } from "./infinite-listings";
import { saveSearchAction } from "../lib/actions";
import { getCurrentSession } from "../lib/auth";
import {
  getApplicationStateMap,
  getFavoritePostingIds,
  getPostingListIds,
  getListingFilterMetadata,
  getListings,
  parseListingFilters,
  serializeFeedListing
} from "../lib/queries";

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
  const filters = parseListingFilters(resolvedSearchParams);
  const [session, listings, companies] = await Promise.all([
    getCurrentSession(),
    getListings(filters),
    getListingFilterMetadata()
  ]);
  const initialListings = listings.slice(0, LISTINGS_PER_PAGE);
  const postingIds = initialListings.map((listing) => listing.id);
  const [favoriteIds, listIds, applicationStateMap] = session?.user?.id
    ? await Promise.all([
        getFavoritePostingIds(session.user.id, postingIds),
        getPostingListIds(session.user.id, postingIds),
        getApplicationStateMap(session.user.id, postingIds)
      ])
    : [new Set<string>(), new Set<string>(), new Map<string, string>()];
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
          eyebrow="Live Feed"
          title="Internship feed"
          description="Search and filter normalized internship postings across big tech, quant, and trading employers."
          actions={
            <Button asChild>
              <a href={exportHref}>Export CSV</a>
            </Button>
          }
        />

        {session ? (
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
        ) : null}

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
            {listings.length === 0 ? (
              <EmptyState
                title="No internships matched"
                description="Adjust season, location, pay, or company filters to widen the search."
              />
            ) : (
              <InfiniteListings
                initialListings={initialListings.map(serializeFeedListing)}
                total={listings.length}
                batchSize={LISTINGS_PER_PAGE}
                queryString={queryString}
                listHref={listHref}
                showPersonalActions={Boolean(session)}
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
