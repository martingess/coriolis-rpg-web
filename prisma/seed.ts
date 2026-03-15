import { prisma } from "@/lib/prisma";
import { seedRosterIfEmpty } from "@/lib/roster";

async function main() {
  await seedRosterIfEmpty(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
