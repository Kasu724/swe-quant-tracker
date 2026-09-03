import { NextResponse } from "next/server";
import { prisma } from "@swe-quant/db";
import { listingFilterSchema } from "@swe-quant/shared";
import { getLocalProfile } from "../../../lib/local-profile";
import { getUserSavedSearches } from "../../../lib/queries";
import {
  isPrismaErrorCode,
  readJsonObject,
  savedSearchInputSchema
} from "../../../lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getLocalProfile();
  const savedSearches = await getUserSavedSearches(user.id);
  return NextResponse.json({ savedSearches });
}

export async function POST(request: Request) {
  const user = await getLocalProfile();

  const body = await readJsonObject(request);

  if (!body) {
    return NextResponse.json({ error: "A JSON object is required" }, { status: 400 });
  }

  const filters = listingFilterSchema.safeParse(body.filters ?? {});
  const generatedName = `API search ${new Date().toISOString()}`;
  const input = savedSearchInputSchema.safeParse({
    name: body.name ?? generatedName,
    alertsEnabled: body.alertsEnabled,
    alertCadence: body.alertCadence
  });

  if (!filters.success || !input.success) {
    return NextResponse.json({ error: "Invalid saved search" }, { status: 400 });
  }

  const duplicate = await prisma.savedSearch.findFirst({
    where: {
      userId: user.id,
      name: input.data.name
    },
    select: { id: true }
  });

  if (duplicate) {
    return NextResponse.json({ error: "A saved search with that name already exists" }, { status: 409 });
  }

  let savedSearch;

  try {
    savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name: input.data.name ?? generatedName,
        filterJson: filters.data,
        alertsEnabled: input.data.alertsEnabled ?? true,
        alertCadence: input.data.alertCadence ?? "IMMEDIATE"
      }
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return NextResponse.json({ error: "A saved search with that name already exists" }, { status: 409 });
    }

    throw error;
  }

  return NextResponse.json({ savedSearch }, { status: 201 });
}
