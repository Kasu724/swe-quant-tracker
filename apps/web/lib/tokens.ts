import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";
import { prisma, VerificationPurpose } from "@faang-quant/db";

export async function createVerificationToken(userId: string, email: string) {
  const token = randomBytes(24).toString("hex");

  await prisma.verificationToken.create({
    data: {
      userId,
      identifier: email.toLowerCase(),
      token,
      purpose: VerificationPurpose.EMAIL_VERIFY,
      expires: addHours(new Date(), 24)
    }
  });

  return token;
}

export async function consumeVerificationToken(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.verificationToken.findUnique({
      where: { token }
    });
    const consumedAt = new Date();

    if (!record || record.consumedAt || record.expires <= consumedAt) {
      return null;
    }

    const claimed = await tx.verificationToken.updateMany({
      where: {
        id: record.id,
        consumedAt: null,
        expires: { gt: consumedAt }
      },
      data: { consumedAt }
    });

    if (claimed.count !== 1) {
      return null;
    }

    if (record.userId) {
      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: consumedAt }
      });
    }

    return record;
  });
}

