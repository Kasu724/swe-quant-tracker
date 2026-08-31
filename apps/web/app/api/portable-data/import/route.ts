import { NextResponse } from "next/server";
import { z } from "zod";
import { importPortableData, portableDataSchema } from "../../../../lib/portable-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Backup files must be smaller than 5 MB." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The selected file is not valid JSON." }, { status: 400 });
  }

  const envelope = zEnvelope.safeParse(body);
  if (!envelope.success) {
    return NextResponse.json({ error: "The selected file is not a supported tracker backup." }, { status: 400 });
  }

  const parsed = portableDataSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "The backup is invalid or was created by an unsupported version." },
      { status: 400 }
    );
  }

  try {
    const result = await importPortableData(parsed.data, envelope.data.replacePersonalData);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[portable-data-import]", error);
    return NextResponse.json({ error: "The backup could not be imported." }, { status: 500 });
  }
}

const zEnvelope = z.object({
  data: z.unknown(),
  replacePersonalData: z.boolean().default(false)
});
