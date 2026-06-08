import { NextResponse } from "next/server";
import { prisma } from "@faang-quant/db";
import { getCurrentSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

async function getRequestContext(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const body = await request.json();
  const postingId = String(body.postingId ?? "");

  if (!postingId) {
    return { error: NextResponse.json({ error: "Posting ID is required" }, { status: 400 }) };
  }

  return { userId: session.user.id, postingId, body };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);

  if ("error" in context) {
    return context.error;
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

  const isCompleted = Boolean(context.body.isCompleted);
  const item = await prisma.userPostingListItem.update({
    where: {
      userId_internshipPostingId: {
        userId: context.userId,
        internshipPostingId: context.postingId
      }
    },
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
