import { NextResponse } from "next/server";
import { createPortableData } from "../../../../lib/portable-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestedTheme = new URL(request.url).searchParams.get("theme");
  const theme = requestedTheme === "light" || requestedTheme === "dark" ? requestedTheme : "system";
  const data = await createPortableData(theme);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="swe-quant-tracker-backup-${date}.json"`,
      "Cache-Control": "no-store"
    }
  });
}
