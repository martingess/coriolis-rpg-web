import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";

const temporaryDirectories: string[] = [];

export async function createTestClient() {
  const temporaryRoot = resolve(process.cwd(), ".tmp");
  mkdirSync(temporaryRoot, { recursive: true });
  const directory = mkdtempSync(join(temporaryRoot, "coriolis-roster-"));
  const databasePath = join(directory, "test.db");
  const databaseUrl = `file:${databasePath}`;
  const sourceSchemaPath = resolve(process.cwd(), "prisma/schema.prisma");
  const schemaPath = join(directory, "schema.prisma");
  const sqliteSchema = readFileSync(sourceSchemaPath, "utf8")
    .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output   = "./generated-client"')
    .replace('provider = "postgresql"', 'provider = "sqlite"');

  writeFileSync(schemaPath, sqliteSchema);
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

  execFileSync("pnpm", ["exec", "prisma", "generate", "--schema", schemaPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PRISMA_GENERATE_SKIP_AUTOINSTALL: "true",
    },
  });

  const generatedClient = (await import(
    pathToFileURL(join(directory, "generated-client", "index.js")).href
  )) as { PrismaClient: typeof PrismaClient };

  return new generatedClient.PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  }) as PrismaClient;
}

export function cleanupTestDatabases() {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) {
      rmSync(directory, { force: true, recursive: true });
    }
  }
}
