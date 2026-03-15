import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const schemaDir = resolve(process.cwd(), "prisma");
const rawDatabaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

if (!rawDatabaseUrl.startsWith("file:")) {
  throw new Error("reset-db.ts only supports SQLite file URLs.");
}

async function main() {
  const relativePath = rawDatabaseUrl.slice("file:".length);
  const absolutePath = resolve(schemaDir, relativePath);
  const sidecars = ["", "-journal", "-shm", "-wal"].map(
    (suffix) => `${absolutePath}${suffix}`,
  );

  await Promise.all(sidecars.map((path) => rm(path, { force: true })));

  console.log(`Removed SQLite database artifacts from ${dirname(absolutePath)}.`);
}

main();
