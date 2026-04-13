import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";

const temporaryDirectories: string[] = [];
let cachedSql: string | null = null;
let cachedGeneratedClientPath: string | null = null;

function buildSqliteSchemaContents() {
  const sourceSchemaPath = resolve(process.cwd(), "prisma/schema.prisma");
  return readFileSync(sourceSchemaPath, "utf8")
    .replace(
      'provider = "prisma-client-js"',
      'provider = "prisma-client-js"\n  output   = "./generated-client"',
    )
    .replace('provider = "postgresql"', 'provider = "sqlite"');
}

function getSchemaCacheKey(sqliteSchema: string) {
  return createHash("sha256").update(sqliteSchema).digest("hex").slice(0, 12);
}

function getCachedSql(schemaPath: string) {
  if (cachedSql) {
    return cachedSql;
  }

  cachedSql = execFileSync(
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

  return cachedSql;
}

function getGeneratedClientPath(schemaKey: string, schemaPath: string) {
  if (cachedGeneratedClientPath && existsSync(join(cachedGeneratedClientPath, "index.js"))) {
    return cachedGeneratedClientPath;
  }

  const cachedDirectory = resolve(process.cwd(), ".tmp", `generated-test-client-${schemaKey}`);
  const generatedClientPath = join(cachedDirectory, "generated-client");

  if (!existsSync(join(generatedClientPath, "index.js"))) {
    mkdirSync(cachedDirectory, { recursive: true });
    writeFileSync(schemaPath, buildSqliteSchemaContents());
    execFileSync("pnpm", ["exec", "prisma", "generate", "--schema", schemaPath], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        PRISMA_GENERATE_SKIP_AUTOINSTALL: "true",
      },
    });
  }

  cachedGeneratedClientPath = generatedClientPath;
  return generatedClientPath;
}

export async function createTestClient() {
  const temporaryRoot = resolve(process.cwd(), ".tmp");
  mkdirSync(temporaryRoot, { recursive: true });
  const directory = mkdtempSync(join(temporaryRoot, "coriolis-roster-"));
  const databasePath = join(directory, "test.db");
  const databaseUrl = `file:${databasePath}`;
  const schemaPath = join(directory, "schema.prisma");
  const sqliteSchema = buildSqliteSchemaContents();
  const schemaKey = getSchemaCacheKey(sqliteSchema);
  const sharedSchemaPath = resolve(
    process.cwd(),
    ".tmp",
    `generated-test-client-${schemaKey}`,
    "schema.prisma",
  );

  writeFileSync(schemaPath, sqliteSchema);
  const sql = getCachedSql(schemaPath);

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

  const generatedClientPath = getGeneratedClientPath(schemaKey, sharedSchemaPath);

  const generatedClient = (await import(
    pathToFileURL(join(generatedClientPath, "index.js")).href
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
