import { NextResponse } from "next/server";
import { prisma } from "@faang-quant/db";
import { listingFilterSchema } from "@faang-quant/shared";
import { getCurrentSession } from "../../../lib/auth";
import { getUserSavedSearches } from "../../../lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const savedSearches = await getUserSavedSearches(session.user.id);
  return NextResponse.json({ savedSearches });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const filters = listingFilterSchema.parse(body.filters ?? {});

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: body.name ?? `API search ${new Date().toLocaleString()}`,
      filterJson: filters,
      alertsEnabled: body.alertsEnabled ?? true,
      alertCadence: body.alertCadence === "DAILY" ? "DAILY" : "IMMEDIATE"
    }
  });

  return NextResponse.json({ savedSearch }, { status: 201 });
}
