import { afterEach, describe, expect, it } from "vitest";

import {
  createConditionModifier,
  createCharacter,
  createRepeaterItem,
  deleteConditionModifier,
  deleteCharacter,
  getRoster,
  renameCharacter,
  setBuddy,
  updateConditionModifier,
  updateCharacterField,
  updateRepeaterField,
} from "@/lib/roster";
import { cleanupTestDatabases, createTestClient } from "@/tests/test-db";

afterEach(() => {
  cleanupTestDatabases();
});

describe("roster behavior aligned with the rulebook", () => {
  it("lets experience grow beyond ten and keeps it persisted", async () => {
    const client = await createTestClient();

    try {
      const character = await createCharacter(client);
      const updated = await updateCharacterField(character.id, "experience", 12, client);

      expect(updated.experience).toBe(12);

      const roster = await getRoster(client);
      expect(roster[0]?.experience).toBe(12);
    } finally {
      await client.$disconnect();
    }
  });

  it("keeps relationships tied to other active sheets and propagates rename/delete changes", async () => {
    const client = await createTestClient();

    try {
      const firstCharacter = await createCharacter(client);
      const secondCharacter = await createCharacter(client);

      const layla = await renameCharacter(firstCharacter.id, "Layla Kassar", client);
      await renameCharacter(secondCharacter.id, "Sabah al-Malik", client);

      const withRelationship = await createRepeaterItem(
        layla.id,
        "relationship",
        {
          relationshipTargetName: "Sabah al-Malik",
        },
        client,
      );
      const relationshipId = withRelationship.relationships[0]?.id;

      expect(withRelationship.relationships[0]).toMatchObject({
        targetName: "Sabah al-Malik",
      });

      if (!relationshipId) {
        throw new Error("Expected a relationship row to be created.");
      }

      await expect(
        updateRepeaterField(
          "relationship",
          relationshipId,
          "targetName",
          "Dockmaster Farouk",
          client,
        ),
      ).rejects.toThrow("Relationships can only point to other current sheets.");

      const withBuddy = await setBuddy(layla.id, relationshipId, client);
      expect(withBuddy.relationships[0]).toMatchObject({
        isBuddy: true,
        targetName: "Sabah al-Malik",
      });

      await renameCharacter(secondCharacter.id, "Sabah din Ghani", client);
      const rosterAfterRename = await getRoster(client);
      const laylaAfterRename = rosterAfterRename.find(
        (character) => character.id === layla.id,
      );

      expect(laylaAfterRename?.relationships[0]).toMatchObject({
        targetName: "Sabah din Ghani",
        isBuddy: true,
      });

      const rosterAfterDelete = await deleteCharacter(secondCharacter.id, client);
      const laylaAfterDelete = rosterAfterDelete.find(
        (character) => character.id === layla.id,
      );

      expect(laylaAfterDelete?.relationships).toHaveLength(0);
    } finally {
      await client.$disconnect();
    }
  });

  it("persists condition modifiers and recalculates effective track maximums", async () => {
    const client = await createTestClient();

    try {
      const character = await createCharacter(client);

      const withHitPointsModifier = await createConditionModifier(
        {
          characterId: character.id,
          target: "hitPoints",
          name: "Exo shell reinforcement",
          description: "Extra plating and harness support.",
          value: 2,
        },
        client,
      );

      expect(withHitPointsModifier.maxHitPoints).toBe(6);
      expect(withHitPointsModifier.conditionModifiers).toHaveLength(1);

      const withRadiationModifier = await createConditionModifier(
        {
          characterId: character.id,
          target: "radiation",
          name: "Lead-lined cloak",
          description: "Improvised shielding around the suit seams.",
          value: -7,
        },
        client,
      );

      expect(withRadiationModifier.maxRadiation).toBe(3);

      const cappedRadiation = await updateCharacterField(
        character.id,
        "radiation",
        8,
        client,
      );

      expect(cappedRadiation.radiation).toBe(3);

      const radiationModifierId = withRadiationModifier.conditionModifiers.find(
        (modifier: (typeof withRadiationModifier.conditionModifiers)[number]) =>
          modifier.target === "radiation",
      )?.id;

      if (!radiationModifierId) {
        throw new Error("Expected a radiation modifier to be created.");
      }

      const withTighterRadiationCap = await updateConditionModifier(
        radiationModifierId,
        {
          target: "radiation",
          name: "Lead-lined cloak",
          description: "Damaged shielding leaves almost no tolerance.",
          value: -9,
        },
        client,
      );

      expect(withTighterRadiationCap.maxRadiation).toBe(1);
      expect(withTighterRadiationCap.radiation).toBe(1);

      const hitPointsModifierId = withHitPointsModifier.conditionModifiers[0]?.id;

      if (!hitPointsModifierId) {
        throw new Error("Expected a hit-point modifier to be created.");
      }

      const withoutHitPointsModifier = await deleteConditionModifier(
        hitPointsModifierId,
        client,
      );

      expect(withoutHitPointsModifier.maxHitPoints).toBe(4);
      expect(withoutHitPointsModifier.conditionModifiers).toHaveLength(1);
    } finally {
      await client.$disconnect();
    }
  });
});
