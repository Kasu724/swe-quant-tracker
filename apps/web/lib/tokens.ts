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
  const record = await prisma.verificationToken.findUnique({
    where: { token }
  });

  if (!record || record.consumedAt || record.expires < new Date()) {
    return null;
  }

  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() }
  });

  if (record.userId) {
    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() }
    });
  }

  return record;
}

