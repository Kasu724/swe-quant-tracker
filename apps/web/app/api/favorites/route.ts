import { NextResponse } from "next/server";
import { prisma } from "@swe-quant/db";
import { getLocalProfile } from "../../../lib/local-profile";
import { isPrismaErrorCode, postingIdSchema, readJsonObject } from "../../../lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getLocalProfile();

  const body = await readJsonObject(request);
  const postingId = postingIdSchema.safeParse(body?.postingId);

  if (!postingId.success) {
    return NextResponse.json({ error: "A valid posting ID is required" }, { status: 400 });
  }

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId.data },
    select: { id: true }
  });

  if (!posting) {
    return NextResponse.json({ error: "Posting not found" }, { status: 404 });
  }

  const uniqueFavorite = {
    userId_internshipPostingId: {
      userId: user.id,
      internshipPostingId: postingId.data
    }
  };
  const existing = await prisma.userFavorite.findUnique({
    where: {
      ...uniqueFavorite
    }
  });

  if (existing) {
    await prisma.userFavorite.deleteMany({
      where: uniqueFavorite.userId_internshipPostingId
    });
    return NextResponse.json({ favorite: false });
  }

  try {
    await prisma.userFavorite.create({
      data: uniqueFavorite.userId_internshipPostingId
    });
  } catch (error) {
    if (!isPrismaErrorCode(error, "P2002")) {
      throw error;
    }
  }

  return NextResponse.json({ favorite: true });
}
