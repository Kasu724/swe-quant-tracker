"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@swe-quant/db";
import { listingFilterSchema } from "@swe-quant/shared";
import { getLocalProfile, LOCAL_PROFILE_EMAIL } from "./local-profile";
import {
  applicationStateSchema,
  companySourceInputSchema,
  discordWebhookUrlSchema,
  isValidTimeZone,
  isPrismaErrorCode,
  postingIdSchema,
  safeInternalPath
} from "./validation";

function getRedirectPath(formData: FormData, fallback = "/internships") {
  return safeInternalPath(formData.get("redirectTo"), fallback);
}

export async function saveSearchAction(formData: FormData) {
  const user = await getLocalProfile();
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
  const user = await getLocalProfile();
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
  const user = await getLocalProfile();
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
  const user = await getLocalProfile();
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
  const user = await getLocalProfile();
  const alertEmailsEnabled = formData.get("alertEmailsEnabled") === "on";
  const digestTimezone = String(formData.get("digestTimezone") ?? "America/New_York");
  const notificationEmail = String(formData.get("notificationEmail") ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();

  if (
    !isValidTimeZone(digestTimezone) ||
    (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) ||
    notificationEmail.length > 320
  ) {
    return;
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: notificationEmail || LOCAL_PROFILE_EMAIL,
        alertEmailsEnabled: Boolean(notificationEmail) && alertEmailsEnabled,
        digestTimezone
      }
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      return;
    }

    throw error;
  }

  revalidatePath("/settings");
}

/**
 * Save the local profile's Discord destination and the companies it should
 * announce. The webhook is kept server-side and is never rendered back into
 * the settings page.
 */
export async function saveDiscordSettingsAction(formData: FormData) {
  const user = await getLocalProfile();
  const rawWebhookUrl = String(formData.get("discordWebhookUrl") ?? "").trim();
  const clearWebhook = formData.get("clearDiscordWebhook") === "on";
  const enabled = formData.get("discordEnabled") === "on";
  const requestedCompanyIds = Array.from(
    new Set(
      formData
        .getAll("discordCompanyId")
        .map((value) => String(value).trim())
        .filter((value) => postingIdSchema.safeParse(value).success)
    )
  );

  const parsedWebhook = rawWebhookUrl
    ? discordWebhookUrlSchema.safeParse(rawWebhookUrl)
    : { success: true as const, data: undefined };

  if (!parsedWebhook.success || requestedCompanyIds.length > 1_000) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.discordDestination.findUnique({
      where: { userId: user.id },
      select: { webhookUrl: true }
    });

    if (clearWebhook || (!existing && !parsedWebhook.data)) {
      if (existing) {
        await tx.discordDestination.delete({ where: { userId: user.id } });
      }
      return;
    }

    const companyRows = await tx.company.findMany({
      where: {
        id: { in: requestedCompanyIds },
        isActive: true,
        sources: {
          some: {
            isActive: true,
            pollingEnabled: true
          }
        }
      },
      select: { id: true }
    });
    const companyIds = companyRows.map((company) => company.id);
    const webhookUrl = parsedWebhook.data ?? existing?.webhookUrl;

    if (!webhookUrl) {
      return;
    }

    await tx.discordDestination.upsert({
      where: { userId: user.id },
      update: {
        enabled,
        ...(parsedWebhook.data
          ? {
              webhookUrl: parsedWebhook.data,
              lastTestedAt: null,
              lastTestStatus: null,
              lastError: null
            }
          : {}),
        companies: {
          deleteMany: {},
          create: companyIds.map((companyId) => ({ companyId }))
        }
      },
      create: {
        userId: user.id,
        webhookUrl,
        enabled,
        companies: {
          create: companyIds.map((companyId) => ({ companyId }))
        }
      }
    });
  });

  revalidatePath("/settings");
}

/** Send a small test message through the saved destination so setup is verifiable. */
export async function testDiscordDestinationAction() {
  const user = await getLocalProfile();
  const destination = await prisma.discordDestination.findUnique({
    where: { userId: user.id },
    select: { id: true, webhookUrl: true, enabled: true }
  });

  if (!destination) {
    return;
  }

  if (!discordWebhookUrlSchema.safeParse(destination.webhookUrl).success) {
    await prisma.discordDestination.update({
      where: { id: destination.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: false,
        lastError: "The saved value is not a valid Discord webhook URL"
      }
    });
    revalidatePath("/settings");
    return;
  }

  const testedAt = new Date();
  let lastError: string | null = null;
  let success = false;

  try {
    const url = new URL(destination.webhookUrl);
    url.searchParams.set("wait", "true");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "swe-quant-tracker/1.0"
        },
        body: JSON.stringify({
          content: "✅ SWE-Quant Tracker is connected.",
          allowed_mentions: { parse: [] }
        })
      });

      if (!response.ok) {
        const responseBody = (await response.text()).trim().slice(0, 500);
        lastError = responseBody
          ? `Discord webhook returned HTTP ${response.status}: ${responseBody}`
          : `Discord webhook returned HTTP ${response.status}`;
      } else {
        success = true;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Discord connection test failed";
  }

  await prisma.discordDestination.update({
    where: { id: destination.id },
    data: {
      lastTestedAt: testedAt,
      lastTestStatus: success,
      lastError: success ? null : lastError?.slice(0, 2_000) ?? "Discord connection test failed"
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

export async function toggleCompanyActiveAction(formData: FormData) {
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
