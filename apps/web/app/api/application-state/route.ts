import { NextResponse } from "next/server";
import { prisma, ApplicationState } from "@faang-quant/db";
import { getCurrentSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const postingId = String(body.postingId ?? "");
  const state = String(body.state ?? ApplicationState.NONE) as ApplicationState;

  const record = await prisma.userApplicationState.upsert({
    where: {
      userId_internshipPostingId: {
        userId: session.user.id,
        internshipPostingId: postingId
      }
    },
    update: { state },
    create: {
      userId: session.user.id,
      internshipPostingId: postingId,
      state
    }
  });

  return NextResponse.json({ record });
}
