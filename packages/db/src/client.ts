import { PrismaClient } from "@prisma/client";
import { ensureRepoEnvLoaded } from "@faang-quant/config";

declare global {
  var __faangQuantPrisma__: PrismaClient | undefined;
}

ensureRepoEnvLoaded();

const prismaClient =
  global.__faangQuantPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__faangQuantPrisma__ = prismaClient;
}

export const prisma = prismaClient;
