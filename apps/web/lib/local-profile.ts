import { prisma } from "@swe-quant/db";

export const LOCAL_PROFILE_EMAIL = "local@swe-quant-tracker.invalid";

/**
 * The desktop app has one implicit local profile. The existing User row is kept
 * as an implementation detail so upgrades preserve favorites, lists, searches,
 * and alert preferences without retaining any authentication behavior.
 */
export async function getLocalProfile() {
  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (!existing) {
    return prisma.user.create({
      data: {
        email: LOCAL_PROFILE_EMAIL,
        name: "Local profile",
        alertEmailsEnabled: false
      }
    });
  }

  return existing;
}

export function isPlaceholderLocalEmail(email: string) {
  return email.endsWith(".invalid");
}
