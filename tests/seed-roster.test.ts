import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";

import { getRoster, seedRosterIfEmpty } from "@/lib/roster";

const temporaryDirectories: string[] = [];

function createTestClient() {
  const directory = mkdtempSync(join(tmpdir(), "coriolis-roster-"));
  const databasePath = join(directory, "test.db");
  const databaseUrl = `file:${databasePath}`;
  const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
  const sql = execFileSync(
    "pnpm",
    ["exec", "prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  execFileSync(
    "pnpm",
    ["exec", "prisma", "db", "execute", "--stdin", "--url", databaseUrl],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      input: sql,
    },
  );

  temporaryDirectories.push(directory);

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) {
      rmSync(directory, { force: true, recursive: true });
    }
  }
});

describe("seeded roster behavior", () => {
  it("only inserts sample characters when the database is empty", async () => {
    const client = createTestClient();

    try {
      const firstLoad = await getRoster(client);

      expect(firstLoad).toHaveLength(2);
      expect(firstLoad.map((character) => character.name)).toEqual([
        "Sabah al-Malik",
        "Nassim Vale",
      ]);

      await seedRosterIfEmpty(client);
      const secondLoad = await getRoster(client);

      expect(secondLoad).toHaveLength(2);
      expect(await client.character.count()).toBe(2);
    } finally {
      await client.$disconnect();
    }
  });
});
