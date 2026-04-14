import { NextResponse } from "next/server";
import { getCompaniesOverview } from "../../../lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const companies = await getCompaniesOverview();
  return NextResponse.json({ companies });
}
