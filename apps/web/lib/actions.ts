"use server";

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createMailProvider, renderVerificationEmail } from "@faang-quant/email";
import { prisma, ApplicationState } from "@faang-quant/db";
import { listingFilterSchema } from "@faang-quant/shared";
import { readBaseEnv } from "@faang-quant/config";
import { requireAdmin, requireUser } from "./auth";
import { createVerificationToken } from "./tokens";

function getRedirectPath(formData: FormData, fallback = "/internships") {
  const redirectTo = formData.get("redirectTo");
  return typeof redirectTo === "string" && redirectTo ? redirectTo : fallback;
}

export async function registerUserAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || password.length < 8) {
    redirect("/auth/register?error=invalid");
  }

  const passwordHash = await hash(password, 12);
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  let userId = existing?.id;

  if (existing?.emailVerified) {
    redirect("/auth/register?error=email-in-use");
  }

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash
      }
    });
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      }
    });

    userId = created.id;
  }

  if (!userId) {
    redirect("/auth/register?error=failed");
  }

  await prisma.verificationToken.deleteMany({
    where: {
      userId,
      consumedAt: null
    }
  });

  const token = await createVerificationToken(userId, email);
  const env = readBaseEnv();
  const verificationUrl = `${env.APP_BASE_URL}/auth/verify?token=${token}`;
  const emailContent = renderVerificationEmail({
    name,
    verifyUrl: verificationUrl
  });

  await createMailProvider().send({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text
  });

  redirect(`/auth/verify?sent=1&email=${encodeURIComponent(email)}`);
}

export async function saveSearchAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const rawFilter = String(formData.get("filterPayload") ?? "{}");
  const cadence = String(formData.get("alertCadence") ?? "IMMEDIATE");
  const filters = listingFilterSchema.parse(JSON.parse(rawFilter));

  await prisma.savedSearch.create({
    data: {
      userId: user.id,
      name: name || `Search ${new Date().toLocaleString()}`,
      filterJson: filters,
      alertsEnabled: true,
      alertCadence: cadence === "DAILY" ? "DAILY" : "IMMEDIATE"
    }
  });

  revalidatePath("/saved-searches");
  revalidatePath("/internships");
}

export async function deleteSavedSearchAction(formData: FormData) {
  const user = await requireUser();
  const searchId = String(formData.get("savedSearchId") ?? "");

  await prisma.savedSearch.deleteMany({
    where: {
      id: searchId,
      userId: user.id
    }
  });

  revalidatePath("/saved-searches");
}

export async function toggleFavoriteAction(formData: FormData) {
  const user = await requireUser();
  const postingId = String(formData.get("postingId") ?? "");
  const redirectTo = getRedirectPath(formData);
  const existing = await prisma.userFavorite.findFirst({
    where: {
      userId: user.id,
      internshipPostingId: postingId
    }
  });

  if (existing) {
    await prisma.userFavorite.delete({
      where: { id: existing.id }
    });
  } else {
    await prisma.userFavorite.create({
      data: {
        userId: user.id,
        internshipPostingId: postingId
      }
    });
  }

  revalidatePath("/saved-searches");
  revalidatePath("/internships");
  revalidatePath(redirectTo);
}

export async function updateApplicationStateAction(formData: FormData) {
  const user = await requireUser();
  const postingId = String(formData.get("postingId") ?? "");
  const redirectTo = getRedirectPath(formData);
  const state = String(formData.get("state") ?? ApplicationState.NONE);

  await prisma.userApplicationState.upsert({
    where: {
      userId_internshipPostingId: {
        userId: user.id,
        internshipPostingId: postingId
      }
    },
    update: {
      state: state as ApplicationState
    },
    create: {
      userId: user.id,
      internshipPostingId: postingId,
      state: state as ApplicationState
    }
  });

  revalidatePath("/saved-searches");
  revalidatePath("/internships");
  revalidatePath(redirectTo);
}

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();
  const alertEmailsEnabled = formData.get("alertEmailsEnabled") === "on";
  const digestTimezone = String(formData.get("digestTimezone") ?? "America/New_York");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      alertEmailsEnabled,
      digestTimezone
    }
  });

  revalidatePath("/settings");
}

export async function unsubscribeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  await prisma.user.updateMany({
    where: { unsubscribeToken: token },
    data: { alertEmailsEnabled: false }
  });

  redirect("/unsubscribe?success=1");
}

export async function triggerIngestionAction() {
  await requireAdmin();

  const repoRoot = resolve(process.cwd(), "../..");
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(command, ["--filter", "@faang-quant/worker", "ingest"], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore"
  });

  child.unref();
  revalidatePath("/admin");
}

export async function toggleCompanyActiveAction(formData: FormData) {
  await requireAdmin();
  const companyId = String(formData.get("companyId") ?? "");
  const nextValue = formData.get("isActive") === "true";

  await prisma.company.update({
    where: { id: companyId },
    data: { isActive: nextValue }
  });

  revalidatePath("/admin");
  revalidatePath("/companies");
}

export async function toggleSourceActiveAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") ?? "");
  const isActive = formData.get("isActive") === "true";
  const pollingEnabled = formData.get("pollingEnabled") === "true";

  await prisma.companySource.update({
    where: { id: sourceId },
    data: {
      isActive,
      pollingEnabled
    }
  });

  revalidatePath("/admin");
}

export async function createCompanySourceAction(formData: FormData) {
  await requireAdmin();
  const companyId = String(formData.get("companyId") ?? "");
  const sourceType = String(formData.get("sourceType") ?? "GREENHOUSE");
  const sourceIdentifier = String(formData.get("sourceIdentifier") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const priority = Number(formData.get("priority") ?? 100);
  const sourceName = String(formData.get("sourceName") ?? "").trim() || `Official ${sourceType} Board`;

  if (!companyId || !sourceIdentifier || !sourceUrl) {
    return;
  }

  await prisma.companySource.create({
    data: {
      companyId,
      sourceType: sourceType as never,
      sourceName,
      sourceIdentifier,
      sourceUrl,
      priority: Number.isFinite(priority) ? priority : 100,
      isActive: true,
      pollingEnabled: true
    }
  });

  revalidatePath("/admin");
}

export async function mergeDuplicatePostingsAction(formData: FormData) {
  await requireAdmin();
  const sourcePostingId = String(formData.get("sourcePostingId") ?? "");
  const targetPostingId = String(formData.get("targetPostingId") ?? "");

  if (!sourcePostingId || !targetPostingId || sourcePostingId === targetPostingId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const [sourcePosting, targetPosting] = await Promise.all([
      tx.internshipPosting.findUnique({
        where: { id: sourcePostingId }
      }),
      tx.internshipPosting.findUnique({
        where: { id: targetPostingId }
      })
    ]);

    if (!sourcePosting || !targetPosting) {
      return;
    }

    const favorites = await tx.userFavorite.findMany({
      where: { internshipPostingId: sourcePostingId }
    });

    for (const favorite of favorites) {
      const targetFavorite = await tx.userFavorite.findFirst({
        where: {
          userId: favorite.userId,
          internshipPostingId: targetPostingId
        }
      });

      if (targetFavorite) {
        await tx.userFavorite.delete({ where: { id: favorite.id } });
      } else {
        await tx.userFavorite.update({
          where: { id: favorite.id },
          data: { internshipPostingId: targetPostingId }
        });
      }
    }

    const applicationStates = await tx.userApplicationState.findMany({
      where: { internshipPostingId: sourcePostingId }
    });

    for (const state of applicationStates) {
      const targetState = await tx.userApplicationState.findFirst({
        where: {
          userId: state.userId,
          internshipPostingId: targetPostingId
        }
      });

      if (targetState) {
        await tx.userApplicationState.delete({ where: { id: state.id } });
      } else {
        await tx.userApplicationState.update({
          where: { id: state.id },
          data: { internshipPostingId: targetPostingId }
        });
      }
    }

    await tx.postingSourceRecord.updateMany({
      where: { internshipPostingId: sourcePostingId },
      data: { internshipPostingId: targetPostingId }
    });

    await tx.internshipPosting.update({
      where: { id: sourcePostingId },
      data: {
        isActive: false,
        metadataJson: {
          mergedInto: targetPostingId,
          mergedAt: new Date().toISOString()
        }
      }
    });
  });

  revalidatePath("/admin");
  revalidatePath("/internships");
}
