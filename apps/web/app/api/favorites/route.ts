import { NextResponse } from "next/server";
import { prisma } from "@faang-quant/db";
import { getCurrentSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const postingId = String(body.postingId ?? "");
  const existing = await prisma.userFavorite.findFirst({
    where: {
      userId: session.user.id,
      internshipPostingId: postingId
    }
  });

  if (existing) {
    await prisma.userFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorite: false });
  }

  await prisma.userFavorite.create({
    data: {
      userId: session.user.id,
      internshipPostingId: postingId
    }
  });

  return NextResponse.json({ favorite: true });
}
