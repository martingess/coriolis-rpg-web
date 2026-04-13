"use server";

import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";

import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { logMutation } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import {
  addInventoryPreset,
  createConditionModifier,
  createCharacter,
  createRepeaterItem,
  deleteConditionModifier,
  deleteCharacter,
  deleteRepeaterItem,
  renameCharacter,
  setBuddy,
  updateConditionModifier,
  updateCharacterField,
  updateRepeaterField,
} from "@/lib/roster";
import {
  createTeamRepeaterItem,
  deleteTeamRepeaterItem,
  promoteKnownFaceToCharacter,
  updateTeamField,
  updateTeamRepeaterField,
} from "@/lib/team";
import type {
  CharacterScalarField,
  InventoryKind,
  RepeaterKind,
} from "@/lib/roster-types";
import type {
  TeamRepeaterKind,
  TeamScalarField,
} from "@/lib/team-types";

type MutationMetadata = Record<string, number | string | null | undefined>;
type CreateCharacterResult = Awaited<ReturnType<typeof createCharacter>>;

async function runAuthorizedMutation<T>(input: {
  action: string;
  entityId?: string | ((result: T) => string | null | undefined);
  entityType: string;
  metadata?: MutationMetadata;
  summary: string | ((user: SessionUser, result: T) => string);
  task: (
    user: SessionUser,
    db: Prisma.TransactionClient,
  ) => Promise<T>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    await logMutation({
      action: `${input.action}.denied`,
      actorUsername: "anonymous",
      entityType: input.entityType,
      metadata: {
        ...(input.metadata ?? {}),
        reason: "unauthenticated",
      },
      summary: `Blocked anonymous attempt to ${input.action}.`,
      userId: null,
    });
    throw new Error("Authentication required. Please log in.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const mutationResult = await input.task(user, tx);
      const entityId =
        typeof input.entityId === "function" ? input.entityId(mutationResult) : input.entityId;
      const summary =
        typeof input.summary === "function"
          ? input.summary(user, mutationResult)
          : input.summary;

      await logMutation({
        action: input.action,
        db: tx,
        entityId,
        entityType: input.entityType,
        metadata: input.metadata,
        summary,
        userId: user.id,
      });

      return mutationResult;
    });

    revalidatePath("/");
    return result;
  } catch (error) {
    await logMutation({
      action: `${input.action}.failed`,
      actorUsername: user.username,
      entityId: typeof input.entityId === "string" ? input.entityId : null,
      entityType: input.entityType,
      metadata: {
        ...(input.metadata ?? {}),
        error: error instanceof Error ? error.message : "unknown-error",
      },
      summary: `Failed to execute ${input.action}.`,
      userId: user.id,
    });
    throw error;
  }
}

export async function createCharacterAction() {
  return runAuthorizedMutation<CreateCharacterResult>({
    action: "character.create",
    entityId: (character) => character.id,
    entityType: "character",
    summary: (_user, character) => `Created character ${character.name}.`,
    task: async (_user, db) => createCharacter(db),
  });
}

export async function renameCharacterAction(input: {
  characterId: string;
  name: string;
}) {
  return runAuthorizedMutation({
    action: "character.rename",
    entityId: input.characterId,
    entityType: "character",
    metadata: { characterId: input.characterId, name: input.name },
    summary: `Renamed character ${input.characterId}.`,
    task: async (_user, db) => renameCharacter(input.characterId, input.name, db),
  });
}

export async function deleteCharacterAction(characterId: string) {
  return runAuthorizedMutation({
    action: "character.delete",
    entityId: characterId,
    entityType: "character",
    metadata: { characterId },
    summary: `Deleted character ${characterId}.`,
    task: async (_user, db) => deleteCharacter(characterId, db),
  });
}

export async function updateCharacterFieldAction(input: {
  characterId: string;
  field: CharacterScalarField;
  value: number | string;
}) {
  return runAuthorizedMutation({
    action: "character.field.update",
    entityId: input.characterId,
    entityType: "character",
    metadata: {
      characterId: input.characterId,
      field: input.field,
      value: String(input.value),
    },
    summary: `Updated ${input.field} on character ${input.characterId}.`,
    task: async (_user, db) =>
      updateCharacterField(input.characterId, input.field, input.value, db),
  });
}

export async function createConditionModifierAction(input: {
  characterId: string;
  description: string;
  name: string;
  target: string;
  value: number | string;
}) {
  return runAuthorizedMutation({
    action: "condition-modifier.create",
    entityId: input.characterId,
    entityType: "character",
    metadata: {
      characterId: input.characterId,
      target: input.target,
      value: String(input.value),
    },
    summary: `Added condition modifier on ${input.target} for character ${input.characterId}.`,
    task: async (_user, db) => createConditionModifier(input, db),
  });
}

export async function updateConditionModifierAction(input: {
  id: string;
  description: string;
  name: string;
  target: string;
  value: number | string;
}) {
  return runAuthorizedMutation({
    action: "condition-modifier.update",
    entityId: input.id,
    entityType: "conditionModifier",
    metadata: { modifierId: input.id, target: input.target, value: String(input.value) },
    summary: `Updated condition modifier ${input.id}.`,
    task: async (_user, db) => updateConditionModifier(input.id, input, db),
  });
}

export async function deleteConditionModifierAction(id: string) {
  return runAuthorizedMutation({
    action: "condition-modifier.delete",
    entityId: id,
    entityType: "conditionModifier",
    metadata: { modifierId: id },
    summary: `Deleted condition modifier ${id}.`,
    task: async (_user, db) => deleteConditionModifier(id, db),
  });
}

export async function createRepeaterItemAction(input: {
  characterId: string;
  kind: Extract<RepeaterKind, "relationship" | "talent" | "contact">;
  relationshipTargetName?: string;
}) {
  return runAuthorizedMutation({
    action: `${input.kind}.create`,
    entityId: input.characterId,
    entityType: "character",
    metadata: {
      characterId: input.characterId,
      kind: input.kind,
      relationshipTargetName: input.relationshipTargetName,
    },
    summary: `Created ${input.kind} row for character ${input.characterId}.`,
    task: async (_user, db) =>
      createRepeaterItem(input.characterId, input.kind, {
        relationshipTargetName: input.relationshipTargetName,
      }, db),
  });
}

export async function addInventoryPresetAction(input: {
  characterId: string;
  kind: InventoryKind;
  presetId: string;
}) {
  return runAuthorizedMutation({
    action: "inventory.preset.add",
    entityId: input.characterId,
    entityType: "character",
    metadata: {
      characterId: input.characterId,
      kind: input.kind,
      presetId: input.presetId,
    },
    summary: `Added ${input.kind} preset ${input.presetId} to character ${input.characterId}.`,
    task: async (_user, db) =>
      addInventoryPreset(input.characterId, input.kind, input.presetId, db),
  });
}

export async function updateRepeaterFieldAction(input: {
  kind: RepeaterKind;
  id: string;
  field: string;
  value: number | string;
}) {
  return runAuthorizedMutation({
    action: `${input.kind}.update`,
    entityId: input.id,
    entityType: input.kind,
    metadata: {
      repeaterId: input.id,
      kind: input.kind,
      field: input.field,
      value: String(input.value),
    },
    summary: `Updated ${input.field} on ${input.kind} ${input.id}.`,
    task: async (_user, db) =>
      updateRepeaterField(input.kind, input.id, input.field, input.value, db),
  });
}

export async function deleteRepeaterItemAction(input: {
  kind: RepeaterKind;
  id: string;
}) {
  return runAuthorizedMutation({
    action: `${input.kind}.delete`,
    entityId: input.id,
    entityType: input.kind,
    metadata: { kind: input.kind, repeaterId: input.id },
    summary: `Deleted ${input.kind} ${input.id}.`,
    task: async (_user, db) => deleteRepeaterItem(input.kind, input.id, db),
  });
}

export async function setBuddyAction(input: {
  characterId: string;
  relationshipId: string;
}) {
  return runAuthorizedMutation({
    action: "relationship.set-buddy",
    entityId: input.relationshipId,
    entityType: "relationship",
    metadata: { characterId: input.characterId, relationshipId: input.relationshipId },
    summary: `Updated buddy relationship ${input.relationshipId}.`,
    task: async (_user, db) => setBuddy(input.characterId, input.relationshipId, db),
  });
}

export async function updateTeamFieldAction(input: {
  teamId: string;
  field: TeamScalarField;
  value: number | string;
}) {
  return runAuthorizedMutation({
    action: "team.field.update",
    entityId: input.teamId,
    entityType: "team",
    metadata: { teamId: input.teamId, field: input.field, value: String(input.value) },
    summary: `Updated ${input.field} on team ${input.teamId}.`,
    task: async (_user, db) => updateTeamField(input.teamId, input.field, input.value, db),
  });
}

export async function createTeamRepeaterItemAction(input: {
  teamId: string;
  kind: Exclude<TeamRepeaterKind, "crewPosition">;
  parentBeatId?: string | null;
}) {
  return runAuthorizedMutation({
    action: `team.${input.kind}.create`,
    entityId: input.teamId,
    entityType: "team",
    metadata: {
      teamId: input.teamId,
      kind: input.kind,
      parentBeatId: input.parentBeatId ?? null,
    },
    summary: `Created ${input.kind} row for team ${input.teamId}.`,
    task: async (_user, db) =>
      createTeamRepeaterItem(input.teamId, input.kind, {
        parentBeatId: input.parentBeatId,
      }, db),
  });
}

export async function updateTeamRepeaterFieldAction(input: {
  kind: TeamRepeaterKind;
  id: string;
  field: string;
  value: number | string;
}) {
  return runAuthorizedMutation({
    action: `team.${input.kind}.update`,
    entityId: input.id,
    entityType: input.kind,
    metadata: {
      kind: input.kind,
      repeaterId: input.id,
      field: input.field,
      value: String(input.value),
    },
    summary: `Updated ${input.field} on team ${input.kind} ${input.id}.`,
    task: async (_user, db) =>
      updateTeamRepeaterField(input.kind, input.id, input.field, input.value, db),
  });
}

export async function deleteTeamRepeaterItemAction(input: {
  kind: Exclude<TeamRepeaterKind, "crewPosition">;
  id: string;
}) {
  return runAuthorizedMutation({
    action: `team.${input.kind}.delete`,
    entityId: input.id,
    entityType: input.kind,
    metadata: { kind: input.kind, repeaterId: input.id },
    summary: `Deleted team ${input.kind} ${input.id}.`,
    task: async (_user, db) => deleteTeamRepeaterItem(input.kind, input.id, db),
  });
}

export async function promoteKnownFaceToCharacterAction(knownFaceId: string) {
  return runAuthorizedMutation({
    action: "team.known-face.promote",
    entityId: knownFaceId,
    entityType: "knownFace",
    metadata: { knownFaceId },
    summary: `Promoted known face ${knownFaceId} to a character.`,
    task: async (_user, db) => promoteKnownFaceToCharacter(knownFaceId, db),
  });
}
