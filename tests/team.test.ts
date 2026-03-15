import { afterEach, describe, expect, it } from "vitest";

import {
  createTeamRepeaterItem,
  getTeam,
  promoteKnownFaceToCharacter,
  updateTeamRepeaterField,
} from "@/lib/team";
import { cleanupTestDatabases, createTestClient } from "@/tests/test-db";

afterEach(() => {
  cleanupTestDatabases();
});

describe("team dossier behavior", () => {
  it("creates a singleton team with the default five crew stations", async () => {
    const client = createTestClient();

    try {
      const firstTeam = await getTeam(client);
      const secondTeam = await getTeam(client);

      expect(firstTeam.id).toBe(secondTeam.id);
      expect(firstTeam.crewPositions.map((position) => position.role)).toEqual([
        "captain",
        "engineer",
        "pilot",
        "sensorOperator",
        "gunner",
      ]);
    } finally {
      await client.$disconnect();
    }
  });

  it("promotes a known face into a crew sheet and keeps the link on the team", async () => {
    const client = createTestClient();

    try {
      const team = await getTeam(client);
      const withKnownFace = await createTeamRepeaterItem(team.id, "knownFace", client);
      const knownFaceId = withKnownFace.knownFaces[0]?.id;

      if (!knownFaceId) {
        throw new Error("Expected a known face row to be created.");
      }

      await updateTeamRepeaterField("knownFace", knownFaceId, "name", "Amina Vale", client);
      await updateTeamRepeaterField("knownFace", knownFaceId, "concept", "Negotiator / Fixer", client);
      await updateTeamRepeaterField("knownFace", knownFaceId, "faction", "Free League", client);
      await updateTeamRepeaterField(
        "knownFace",
        knownFaceId,
        "notes",
        "Knows who is buying and who is bluffing.",
        client,
      );

      const result = await promoteKnownFaceToCharacter(knownFaceId, client);

      expect(result.character).toMatchObject({
        name: "Amina Vale",
        concept: "Negotiator / Fixer",
        notes: "Knows who is buying and who is bluffing.",
      });

      const persistedKnownFace = result.team.knownFaces.find((face) => face.id === knownFaceId);
      expect(persistedKnownFace?.promotedCharacterId).toBe(result.character.id);
      expect(await client.character.count()).toBe(1);
    } finally {
      await client.$disconnect();
    }
  });
});
