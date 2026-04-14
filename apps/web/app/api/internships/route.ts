import { NextResponse } from "next/server";
import { exportListingsCsv, getListings, parseListingFilters } from "../../../lib/queries";

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
  return NextResponse.json({ listings });
}
