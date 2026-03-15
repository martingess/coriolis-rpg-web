"use server";

import { revalidatePath } from "next/cache";

import {
  addInventoryPreset,
  createCharacter,
  createRepeaterItem,
  deleteCharacter,
  deleteRepeaterItem,
  renameCharacter,
  setBuddy,
  updateCharacterField,
  updateRepeaterField,
} from "@/lib/roster";
import type {
  CharacterScalarField,
  InventoryKind,
  RepeaterKind,
} from "@/lib/roster-types";

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

export async function createRepeaterItemAction(input: {
  characterId: string;
  kind: Extract<RepeaterKind, "relationship" | "talent" | "contact">;
}) {
  const character = await createRepeaterItem(input.characterId, input.kind);
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
