import { NextResponse } from "next/server";
import { prisma } from "@faang-quant/db";
import { getCurrentSession } from "../../../lib/auth";
import {
  applicationStateSchema,
  postingIdSchema,
  readJsonObject
} from "../../../lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);
  const postingId = postingIdSchema.safeParse(body?.postingId);
  const state = applicationStateSchema.safeParse(body?.state);

  if (!postingId.success || !state.success) {
    return NextResponse.json({ error: "A valid posting ID and state are required" }, { status: 400 });
  }

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId.data },
    select: { id: true }
  });

  if (!posting) {
    return NextResponse.json({ error: "Posting not found" }, { status: 404 });
  }

  const uniquePosting = {
    userId_internshipPostingId: {
      userId: session.user.id,
      internshipPostingId: postingId.data
    }
  };

  if (state.data === "NONE") {
    await prisma.userApplicationState.deleteMany({
      where: uniquePosting.userId_internshipPostingId
    });
    return NextResponse.json({ record: null });
  }

  const record = await prisma.userApplicationState.upsert({
    where: uniquePosting,
    update: { state: state.data },
    create: {
      ...uniquePosting.userId_internshipPostingId,
      state: state.data
    }
  });

  return NextResponse.json({ record });
}
