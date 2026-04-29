import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../lib/auth";
import {
  exportListingsCsv,
  getApplicationStateMap,
  getFavoritePostingIds,
  getListings,
  parseListingFilters,
  serializeFeedListing
} from "../../../lib/queries";

export const dynamic = "force-dynamic";

function searchParamsToObject(searchParams: URLSearchParams) {
  const entries: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = entries[key];

    if (existing === undefined) {
      entries[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      entries[key] = [existing, value];
    }
  }

  return entries;
}

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = value ? Number(value) : fallback;

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseListingFilters(searchParamsToObject(url.searchParams));
  const format = url.searchParams.get("format");

  if (format === "csv") {
    const csv = await exportListingsCsv(filters);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="internships.csv"'
      }
    });
  }

  const listings = await getListings(filters);
  const offset = readPositiveInteger(url.searchParams.get("offset"), 0);
  const limit = Math.min(readPositiveInteger(url.searchParams.get("limit"), 25), 100);
  const batch = listings.slice(offset, offset + limit);
  const nextOffset = offset + batch.length;
  const session = await getCurrentSession();
  const postingIds = batch.map((listing) => listing.id);
  const [favoriteIds, applicationStateMap] = session?.user?.id
    ? await Promise.all([
        getFavoritePostingIds(session.user.id, postingIds),
        getApplicationStateMap(session.user.id, postingIds)
      ])
    : [new Set<string>(), new Map<string, string>()];

  return NextResponse.json({
    listings: batch.map(serializeFeedListing),
    total: listings.length,
    nextOffset,
    hasMore: nextOffset < listings.length,
    favoriteIds: Array.from(favoriteIds),
    applicationStates: Object.fromEntries(applicationStateMap.entries())
  });
}
