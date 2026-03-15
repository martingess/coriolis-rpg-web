import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

const temporaryDirectories: string[] = [];

export function createTestClient() {
  const directory = mkdtempSync(join(tmpdir(), "coriolis-roster-"));
  const databasePath = join(directory, "test.db");
  const databaseUrl = `file:${databasePath}`;
  const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
  const sql = execFileSync(
    "pnpm",
    [
      "exec",
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      schemaPath,
      "--script",
    ],
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

export function cleanupTestDatabases() {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) {
      rmSync(directory, { force: true, recursive: true });
    }
  }
}
