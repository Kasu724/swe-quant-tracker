import { NextResponse } from "next/server";
import { getLocalProfile } from "../../../lib/local-profile";
import {
  exportListingsCsv,
  getApplicationStateMap,
  getFavoritePostingIds,
  getPostingListIds,
  getListings,
  parseListingFilters,
  serializeFeedListing
} from "../../../lib/queries";
import { ZodError } from "zod";

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
  let filters;

  try {
    filters = parseListingFilters(searchParamsToObject(url.searchParams));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid listing filters" }, { status: 400 });
    }

    throw error;
  }
  const format = url.searchParams.get("format");
  const user = await getLocalProfile();

  if (format === "csv") {
    const csv = await exportListingsCsv(filters, user.id);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="internships.csv"'
      }
    });
  }

  const listings = await getListings(filters, user.id);
  const offset = readPositiveInteger(url.searchParams.get("offset"), 0);
  const limit = Math.max(1, Math.min(readPositiveInteger(url.searchParams.get("limit"), 25), 100));
  const batch = listings.slice(offset, offset + limit);
  const nextOffset = offset + batch.length;
  const postingIds = batch.map((listing) => listing.id);
  const [favoriteIds, listIds, applicationStateMap] = await Promise.all([
    getFavoritePostingIds(user.id, postingIds),
    getPostingListIds(user.id, postingIds),
    getApplicationStateMap(user.id, postingIds)
  ]);

  return NextResponse.json({
    listings: batch.map(serializeFeedListing),
    total: listings.length,
    nextOffset,
    hasMore: nextOffset < listings.length,
    favoriteIds: Array.from(favoriteIds),
    listIds: Array.from(listIds),
    applicationStates: Object.fromEntries(applicationStateMap.entries())
  });
}
