import { NextResponse } from "next/server";
import { getIngestionStatus, requestIngestion } from "../../../lib/ingestion-control";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getIngestionStatus(), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read ingestion status." },
      { status: 503 }
    );
  }
}

export async function POST() {
  try {
    const result = await requestIngestion();
    return NextResponse.json(result.status, { status: result.started ? 202 : 409 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start ingestion." },
      { status: 503 }
    );
  }
}
