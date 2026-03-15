"use server";

import { revalidatePath } from "next/cache";

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

export async function createCharacterAction() {
  const character = await createCharacter();
  revalidatePath("/");
  return character;
}

export async function renameCharacterAction(input: {
  characterId: string;
  name: string;
}) {
  const character = await renameCharacter(input.characterId, input.name);
  revalidatePath("/");
  return character;
}

export async function deleteCharacterAction(characterId: string) {
  const characters = await deleteCharacter(characterId);
  revalidatePath("/");
  return characters;
}

export async function updateCharacterFieldAction(input: {
  characterId: string;
  field: CharacterScalarField;
  value: number | string;
}) {
  const character = await updateCharacterField(input.characterId, input.field, input.value);
  revalidatePath("/");
  return character;
}

export async function createConditionModifierAction(input: {
  characterId: string;
  description: string;
  name: string;
  target: string;
  value: number | string;
}) {
  const character = await createConditionModifier(input);
  revalidatePath("/");
  return character;
}

export async function updateConditionModifierAction(input: {
  id: string;
  description: string;
  name: string;
  target: string;
  value: number | string;
}) {
  const character = await updateConditionModifier(input.id, input);
  revalidatePath("/");
  return character;
}

export async function deleteConditionModifierAction(id: string) {
  const character = await deleteConditionModifier(id);
  revalidatePath("/");
  return character;
}

export async function createRepeaterItemAction(input: {
  characterId: string;
  kind: Extract<RepeaterKind, "relationship" | "talent" | "contact">;
  relationshipTargetName?: string;
}) {
  const character = await createRepeaterItem(input.characterId, input.kind, {
    relationshipTargetName: input.relationshipTargetName,
  });
  revalidatePath("/");
  return character;
}

export async function addInventoryPresetAction(input: {
  characterId: string;
  kind: InventoryKind;
  presetId: string;
}) {
  const character = await addInventoryPreset(input.characterId, input.kind, input.presetId);
  revalidatePath("/");
  return character;
}

export async function updateRepeaterFieldAction(input: {
  kind: RepeaterKind;
  id: string;
  field: string;
  value: number | string;
}) {
  const character = await updateRepeaterField(
    input.kind,
    input.id,
    input.field,
    input.value,
  );
  revalidatePath("/");
  return character;
}

export async function deleteRepeaterItemAction(input: {
  kind: RepeaterKind;
  id: string;
}) {
  const character = await deleteRepeaterItem(input.kind, input.id);
  revalidatePath("/");
  return character;
}

export async function setBuddyAction(input: {
  characterId: string;
  relationshipId: string;
}) {
  const character = await setBuddy(input.characterId, input.relationshipId);
  revalidatePath("/");
  return character;
}

export async function updateTeamFieldAction(input: {
  teamId: string;
  field: TeamScalarField;
  value: number | string;
}) {
  const team = await updateTeamField(input.teamId, input.field, input.value);
  revalidatePath("/");
  return team;
}

export async function createTeamRepeaterItemAction(input: {
  teamId: string;
  kind: Exclude<TeamRepeaterKind, "crewPosition">;
}) {
  const team = await createTeamRepeaterItem(input.teamId, input.kind);
  revalidatePath("/");
  return team;
}

export async function updateTeamRepeaterFieldAction(input: {
  kind: TeamRepeaterKind;
  id: string;
  field: string;
  value: number | string;
}) {
  const team = await updateTeamRepeaterField(
    input.kind,
    input.id,
    input.field,
    input.value,
  );
  revalidatePath("/");
  return team;
}

export async function deleteTeamRepeaterItemAction(input: {
  kind: Exclude<TeamRepeaterKind, "crewPosition">;
  id: string;
}) {
  const team = await deleteTeamRepeaterItem(input.kind, input.id);
  revalidatePath("/");
  return team;
}

export async function promoteKnownFaceToCharacterAction(knownFaceId: string) {
  const result = await promoteKnownFaceToCharacter(knownFaceId);
  revalidatePath("/");
  return result;
}
