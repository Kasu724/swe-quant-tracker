import { PrismaClient } from "@prisma/client";
import { ensureRepoEnvLoaded } from "@swe-quant/config";

declare global {
  var __sweQuantPrisma__: PrismaClient | undefined;
}

ensureRepoEnvLoaded();

const prismaClient =
  global.__sweQuantPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__sweQuantPrisma__ = prismaClient;
}

export const prisma = prismaClient;
