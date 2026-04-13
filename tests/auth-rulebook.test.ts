import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createUserAccount,
  deleteUserAccount,
  ensureSuperadminAccount,
  verifyPassword,
} from "@/lib/auth";
import { cleanupTestDatabases, createTestClient } from "@/tests/test-db";

const originalSuperadminUsername = process.env.SUPERADMIN_USERNAME;
const originalSuperadminPassword = process.env.SUPERADMIN_PASSWORD;

beforeEach(() => {
  process.env.SUPERADMIN_USERNAME = "admin";
  process.env.SUPERADMIN_PASSWORD = "superadmin-pass-123";
});

afterEach(() => {
  cleanupTestDatabases();

  if (originalSuperadminUsername === undefined) {
    delete process.env.SUPERADMIN_USERNAME;
  } else {
    process.env.SUPERADMIN_USERNAME = originalSuperadminUsername;
  }

  if (originalSuperadminPassword === undefined) {
    delete process.env.SUPERADMIN_PASSWORD;
  } else {
    process.env.SUPERADMIN_PASSWORD = originalSuperadminPassword;
  }
});

describe("auth behavior for the superadmin-only account model", () => {
  it("reserves the configured superadmin username from normal account creation", async () => {
    const client = await createTestClient();

    try {
      await expect(
        createUserAccount(
          {
            username: "ADMIN",
            password: "user-pass-123",
          },
          client,
        ),
      ).rejects.toThrow("reserved for the superadmin");
    } finally {
      await client.$disconnect();
    }
  });

  it("bootstraps the superadmin idempotently and keeps a single account", async () => {
    const client = await createTestClient();

    try {
      const firstBootstrap = await ensureSuperadminAccount(client);
      const secondBootstrap = await ensureSuperadminAccount(client);

      expect(firstBootstrap).toMatchObject({
        created: true,
        passwordSynced: false,
        user: {
          username: "admin",
        },
      });
      expect(secondBootstrap).toMatchObject({
        created: false,
        passwordSynced: false,
        user: {
          username: "admin",
        },
      });

      const users = await client.user.findMany();
      const auditLogs = await client.auditLog.findMany({
        orderBy: {
          createdAt: "asc",
        },
      });

      expect(users).toHaveLength(1);
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]?.action).toBe("system.superadmin.bootstrap");
    } finally {
      await client.$disconnect();
    }
  });

  it("synchronizes the configured superadmin password without creating duplicates", async () => {
    const client = await createTestClient();

    try {
      const initialBootstrap = await ensureSuperadminAccount(client);

      process.env.SUPERADMIN_PASSWORD = "superadmin-pass-456";

      const syncedBootstrap = await ensureSuperadminAccount(client);
      const persistedUser = await client.user.findUniqueOrThrow({
        where: {
          username: "admin",
        },
        select: {
          passwordHash: true,
        },
      });
      const auditActions = (
        await client.auditLog.findMany({
          orderBy: {
            createdAt: "asc",
          },
          select: {
            action: true,
          },
        })
      ).map((entry) => entry.action);

      expect(initialBootstrap?.created).toBe(true);
      expect(syncedBootstrap).toMatchObject({
        created: false,
        passwordSynced: true,
        user: {
          username: "admin",
        },
      });
      expect(await verifyPassword("superadmin-pass-456", persistedUser.passwordHash)).toBe(true);
      expect(await client.user.count()).toBe(1);
      expect(auditActions).toEqual([
        "system.superadmin.bootstrap",
        "system.superadmin.password-sync",
      ]);
    } finally {
      await client.$disconnect();
    }
  });

  it("does not allow deleting the configured superadmin account", async () => {
    const client = await createTestClient();

    try {
      const bootstrap = await ensureSuperadminAccount(client);

      if (!bootstrap) {
        throw new Error("Expected superadmin bootstrap to be configured.");
      }

      await expect(deleteUserAccount(bootstrap.user.id, client)).rejects.toThrow(
        "cannot be deleted",
      );
    } finally {
      await client.$disconnect();
    }
  });
});
