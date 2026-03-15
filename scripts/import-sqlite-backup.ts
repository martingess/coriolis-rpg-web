// @ts-nocheck
import { readFile } from "node:fs/promises";

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env.local", override: true });
loadEnv();

type BackupData = {
  characters: Array<Record<string, unknown>>;
  characterRelationships: Array<Record<string, unknown>>;
  characterTalents: Array<Record<string, unknown>>;
  characterWeapons: Array<Record<string, unknown>>;
  characterGearItems: Array<Record<string, unknown>>;
  characterContacts: Array<Record<string, unknown>>;
  teams: Array<Record<string, unknown>>;
  teamCrewPositions: Array<Record<string, unknown>>;
  teamStoryBeats: Array<Record<string, unknown>>;
  teamNotes: Array<Record<string, unknown>>;
  teamKnownFaces: Array<Record<string, unknown>>;
  teamFactionTies: Array<Record<string, unknown>>;
};

async function createManyIfPresent(
  run: (data: Array<Record<string, unknown>>) => Promise<unknown>,
  data: Array<Record<string, unknown>>,
) {
  if (data.length === 0) {
    return;
  }

  await run(data);
}

async function main() {
  const prisma = new PrismaClient();
  const rawBackup = await readFile("output/sqlite-backup.json", "utf8");
  const backup = JSON.parse(rawBackup) as BackupData;

  await prisma.$transaction(async (tx) => {
    await tx.characterContact.deleteMany();
    await tx.characterGearItem.deleteMany();
    await tx.characterWeapon.deleteMany();
    await tx.characterTalent.deleteMany();
    await tx.characterRelationship.deleteMany();
    await tx.teamFactionTie.deleteMany();
    await tx.teamKnownFace.deleteMany();
    await tx.teamNote.deleteMany();
    await tx.teamStoryBeat.deleteMany();
    await tx.teamCrewPosition.deleteMany();
    await tx.team.deleteMany();
    await tx.character.deleteMany();

    await createManyIfPresent((data) => tx.character.createMany({ data }), backup.characters);
    await createManyIfPresent(
      (data) => tx.team.createMany({ data }),
      backup.teams,
    );
    await createManyIfPresent(
      (data) => tx.teamCrewPosition.createMany({ data }),
      backup.teamCrewPositions,
    );
    await createManyIfPresent(
      (data) => tx.teamStoryBeat.createMany({ data }),
      backup.teamStoryBeats,
    );
    await createManyIfPresent(
      (data) => tx.teamNote.createMany({ data }),
      backup.teamNotes,
    );
    await createManyIfPresent(
      (data) => tx.teamKnownFace.createMany({ data }),
      backup.teamKnownFaces,
    );
    await createManyIfPresent(
      (data) => tx.teamFactionTie.createMany({ data }),
      backup.teamFactionTies,
    );
    await createManyIfPresent(
      (data) => tx.characterRelationship.createMany({ data }),
      backup.characterRelationships,
    );
    await createManyIfPresent(
      (data) => tx.characterTalent.createMany({ data }),
      backup.characterTalents,
    );
    await createManyIfPresent(
      (data) => tx.characterWeapon.createMany({ data }),
      backup.characterWeapons,
    );
    await createManyIfPresent(
      (data) => tx.characterGearItem.createMany({ data }),
      backup.characterGearItems,
    );
    await createManyIfPresent(
      (data) => tx.characterContact.createMany({ data }),
      backup.characterContacts,
    );
  });

  await prisma.$disconnect();
  console.log("Imported backup into PostgreSQL.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
