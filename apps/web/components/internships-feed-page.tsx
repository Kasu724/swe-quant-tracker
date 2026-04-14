import { Container, EmptyState, PageHeader, Button, Input, Select } from "@faang-quant/ui";
import { FilterSidebar } from "./filter-sidebar";
import { ListingCard } from "./listing-card";
import { saveSearchAction } from "../lib/actions";
import { getCurrentSession } from "../lib/auth";
import {
  getApplicationStateMap,
  getFavoritePostingIds,
  getListingFilterMetadata,
  getListings,
  parseListingFilters
} from "../lib/queries";

export function buildSearchQuery(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
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
  const postingIds = listings.map((listing) => listing.id);
  const [favoriteIds, applicationStateMap] = session?.user?.id
    ? await Promise.all([
        getFavoritePostingIds(session.user.id, postingIds),
        getApplicationStateMap(session.user.id, postingIds)
      ])
    : [new Set<string>(), new Map<string, string>()];
  const queryString = buildSearchQuery(resolvedSearchParams);
  const listHref = queryString ? `${basePath}?${queryString}` : basePath;
  const exportHref = `/api/internships${queryString ? `?${queryString}&` : "?"}format=csv`;

  return (
    <div className="relative">
      <aside className="fixed bottom-0 left-0 top-20 z-20 hidden w-80 overflow-hidden xl:block">
        <div className="h-full overflow-y-auto border-r border-white/60 bg-white/84 shadow-[12px_0_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <FilterSidebar
            companies={companies}
            filters={filters}
            basePath={basePath}
            variant="rail"
          />
        </div>
      </aside>

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
          <div className="xl:hidden">
            <FilterSidebar companies={companies} filters={filters} basePath={basePath} />
          </div>
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              {listings.length} internships matched your filters.
            </div>
            {listings.length === 0 ? (
              <EmptyState
                title="No internships matched"
                description="Adjust season, location, pay, or company filters to widen the search."
              />
            ) : (
              listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  posting={listing}
                  isFavorite={favoriteIds.has(listing.id)}
                  applicationState={applicationStateMap.get(listing.id) as never}
                  redirectTo={listHref}
                />
              ))
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
