import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const projectRoot = process.cwd();
const schemaPath = resolve(projectRoot, "prisma/schema.prisma");
const schemaDir = dirname(schemaPath);
const rawDatabaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

function resolveSqliteUrl(url: string) {
  if (!url.startsWith("file:")) {
    throw new Error("Only SQLite file URLs are supported by scripts/db-push.ts");
  }

  const relativePath = url.slice("file:".length);
  const absolutePath = resolve(schemaDir, relativePath);

  return {
    absolutePath,
    fileUrl: `file:${absolutePath}`,
  };
}

function runPrisma(args: string[], options: { input?: string } = {}) {
  return execFileSync("pnpm", ["exec", "prisma", ...args], {
    cwd: projectRoot,
    stdio: options.input ? ["pipe", "pipe", "pipe"] : "pipe",
    input: options.input,
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: rawDatabaseUrl,
    },
  });
}

function main() {
  const { absolutePath, fileUrl } = resolveSqliteUrl(rawDatabaseUrl);
  const hasDatabase = existsSync(absolutePath) && statSync(absolutePath).size > 0;

  const diffArgs = hasDatabase
    ? ["migrate", "diff", "--from-url", fileUrl, "--to-schema-datamodel", schemaPath, "--script"]
    : ["migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script"];

  const sql = runPrisma(diffArgs).trim();

  if (sql.length === 0) {
    console.log("Database schema is already up to date.");
    return;
  }

  runPrisma(["db", "execute", "--stdin", "--url", fileUrl], { input: sql });
  console.log(`Database schema synchronized at ${absolutePath}.`);
}

main();
