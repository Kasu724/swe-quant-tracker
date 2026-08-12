"use server";

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createMailProvider, renderVerificationEmail } from "@faang-quant/email";
import { prisma } from "@faang-quant/db";
import { listingFilterSchema } from "@faang-quant/shared";
import { readBaseEnv } from "@faang-quant/config";
import { requireAdmin, requireUser } from "./auth";
import { createVerificationToken } from "./tokens";
import {
  accountRegistrationSchema,
  applicationStateSchema,
  companySourceInputSchema,
  isValidTimeZone,
  isPrismaErrorCode,
  postingIdSchema,
  safeInternalPath
} from "./validation";

function getRedirectPath(formData: FormData, fallback = "/internships") {
  return safeInternalPath(formData.get("redirectTo"), fallback);
}

export async function registerUserAction(formData: FormData) {
  const input = accountRegistrationSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!input.success) {
    redirect("/auth/register?error=invalid");
  }

  const { name, email, password } = input.data;

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

  try {
    await createMailProvider().send({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });
  } catch (error) {
    console.error("[verification-email]", error);
    redirect("/auth/register?error=email-delivery");
  }

  const verificationParams = new URLSearchParams({
    sent: "1",
    email
  });

  if (env.EMAIL_PROVIDER === "console") {
    verificationParams.set("delivery", "console");
    verificationParams.set("localToken", token);
  }

  redirect(`/auth/verify?${verificationParams.toString()}`);
}

export async function saveSearchAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const rawFilter = String(formData.get("filterPayload") ?? "{}");
  const cadence = String(formData.get("alertCadence") ?? "IMMEDIATE");
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(rawFilter);
  } catch {
    return;
  }

  const parsedFilters = listingFilterSchema.safeParse(parsedPayload);

  if (!parsedFilters.success || name.length > 100) {
    return;
  }

  try {
    await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name: name || `Search ${new Date().toISOString()}`,
        filterJson: parsedFilters.data,
        alertsEnabled: true,
        alertCadence: cadence === "DAILY" ? "DAILY" : "IMMEDIATE"
      }
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return;
    }

    throw error;
  }

  revalidatePath("/saved-searches");
  revalidatePath("/internships");
}

export async function deleteSavedSearchAction(formData: FormData) {
  const user = await requireUser();
  const searchId = String(formData.get("savedSearchId") ?? "");

  if (!postingIdSchema.safeParse(searchId).success) {
    return;
  }

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

  if (!postingIdSchema.safeParse(postingId).success) {
    return;
  }
  const uniqueFavorite = {
    userId_internshipPostingId: {
      userId: user.id,
      internshipPostingId: postingId
    }
  };
  const existing = await prisma.userFavorite.findUnique({
    where: uniqueFavorite
  });

  if (existing) {
    await prisma.userFavorite.deleteMany({
      where: uniqueFavorite.userId_internshipPostingId
    });
  } else {
    try {
      await prisma.userFavorite.create({
        data: uniqueFavorite.userId_internshipPostingId
      });
    } catch (error) {
      if (!isPrismaErrorCode(error, "P2002")) {
        throw error;
      }
    }
  }

  revalidatePath("/saved-searches");
  revalidatePath("/internships");
  revalidatePath(redirectTo);
}

export async function updateApplicationStateAction(formData: FormData) {
  const user = await requireUser();
  const postingId = String(formData.get("postingId") ?? "");
  const redirectTo = getRedirectPath(formData);
  const state = applicationStateSchema.safeParse(formData.get("state"));

  if (!postingIdSchema.safeParse(postingId).success || !state.success) {
    return;
  }

  const uniquePosting = {
    userId_internshipPostingId: {
      userId: user.id,
      internshipPostingId: postingId
    }
  };

  if (state.data === "NONE") {
    await prisma.userApplicationState.deleteMany({
      where: uniquePosting.userId_internshipPostingId
    });
  } else {
    await prisma.userApplicationState.upsert({
      where: uniquePosting,
      update: { state: state.data },
      create: {
        ...uniquePosting.userId_internshipPostingId,
        state: state.data
      }
    });
  }

  revalidatePath("/saved-searches");
  revalidatePath("/internships");
  revalidatePath(redirectTo);
}

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();
  const alertEmailsEnabled = formData.get("alertEmailsEnabled") === "on";
  const digestTimezone = String(formData.get("digestTimezone") ?? "America/New_York");

  if (!isValidTimeZone(digestTimezone)) {
    return;
  }

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

  if (!postingIdSchema.safeParse(token).success) {
    redirect("/unsubscribe?error=invalid");
  }

  const result = await prisma.user.updateMany({
    where: { unsubscribeToken: token },
    data: { alertEmailsEnabled: false }
  });

  redirect(result.count > 0 ? "/unsubscribe?success=1" : "/unsubscribe?error=invalid");
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

  if (!postingIdSchema.safeParse(companyId).success) {
    return;
  }

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

  if (!postingIdSchema.safeParse(sourceId).success) {
    return;
  }

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
  const sourceType = String(formData.get("sourceType") ?? "GREENHOUSE");
  const sourceIdentifier = String(formData.get("sourceIdentifier") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const sourceName = String(formData.get("sourceName") ?? "").trim() || `Official ${sourceType} Board`;
  const input = companySourceInputSchema.safeParse({
    companyId: formData.get("companyId"),
    sourceType,
    sourceIdentifier,
    sourceUrl,
    priority: formData.get("priority") ?? 100,
    sourceName
  });

  if (!input.success) {
    return;
  }

  await prisma.companySource.create({
    data: {
      ...input.data,
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

  if (
    !postingIdSchema.safeParse(sourcePostingId).success ||
    !postingIdSchema.safeParse(targetPostingId).success
  ) {
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
