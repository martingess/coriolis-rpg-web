import { PrismaClient } from "@prisma/client";

declare global {
  var __coriolisPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__coriolisPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__coriolisPrisma__ = prisma;
}
