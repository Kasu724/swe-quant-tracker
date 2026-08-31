import { NextResponse } from "next/server";
import { prisma } from "@faang-quant/db";
import { getLocalProfile } from "../../../lib/local-profile";
import { postingIdSchema, readJsonObject } from "../../../lib/validation";

export const dynamic = "force-dynamic";

async function getRequestContext(request: Request) {
  const user = await getLocalProfile();

  const body = await readJsonObject(request);
  const postingId = postingIdSchema.safeParse(body?.postingId);

  if (!body || !postingId.success) {
    return { error: NextResponse.json({ error: "A valid posting ID is required" }, { status: 400 }) };
  }

  return { userId: user.id, postingId: postingId.data, body };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);

  if ("error" in context) {
    return context.error;
  }

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: context.postingId },
    select: { id: true }
  });

  if (!posting) {
    return NextResponse.json({ error: "Posting not found" }, { status: 404 });
  }

  const item = await prisma.userPostingListItem.upsert({
    where: {
      userId_internshipPostingId: {
        userId: context.userId,
        internshipPostingId: context.postingId
      }
    },
    update: {},
    create: {
      userId: context.userId,
      internshipPostingId: context.postingId
    }
  });

  return NextResponse.json({ item });
}

export async function PATCH(request: Request) {
  const context = await getRequestContext(request);

  if ("error" in context) {
    return context.error;
  }

  if (typeof context.body.isCompleted !== "boolean") {
    return NextResponse.json({ error: "isCompleted must be a boolean" }, { status: 400 });
  }

  const isCompleted = context.body.isCompleted;
  const existing = await prisma.userPostingListItem.findUnique({
    where: {
      userId_internshipPostingId: {
        userId: context.userId,
        internshipPostingId: context.postingId
      }
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "List item not found" }, { status: 404 });
  }

  const item = await prisma.userPostingListItem.update({
    where: { id: existing.id },
    data: {
      isCompleted,
      completedAt: isCompleted ? new Date() : null
    }
  });

  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext(request);

  if ("error" in context) {
    return context.error;
  }

  await prisma.userPostingListItem.deleteMany({
    where: {
      userId: context.userId,
      internshipPostingId: context.postingId
    }
  });

  return NextResponse.json({ removed: true });
}
