import { SKILL_MAX, SKILL_MIN, clampNumber } from "@/lib/coriolis-rules";
import type { CharacterRecord } from "@/lib/roster-types";

export const characterSkillFields = [
  "dexterity",
  "force",
  "infiltration",
  "manipulation",
  "meleeCombat",
  "observation",
  "rangedCombat",
  "survival",
  "command",
  "culture",
  "dataDjinn",
  "medicurgy",
  "mysticPowers",
  "pilot",
  "science",
  "technology",
] as const satisfies ReadonlyArray<keyof CharacterRecord>;

export type CharacterSkillField = (typeof characterSkillFields)[number];
export type OptimisticCharacterSkillEdits = Partial<
  Record<CharacterSkillField, number>
>;
export type PendingOptimisticCharacterSkillEdits = Record<
  string,
  OptimisticCharacterSkillEdits
>;

const characterSkillFieldSet = new Set<CharacterSkillField>(characterSkillFields);

export function clampSkillValue(value: number) {
  return clampNumber(value, SKILL_MIN, SKILL_MAX);
}

export function isCharacterSkillField(field: string): field is CharacterSkillField {
  return characterSkillFieldSet.has(field as CharacterSkillField);
}

export function applyOptimisticSkillEdits(
  character: CharacterRecord,
  edits?: OptimisticCharacterSkillEdits,
) {
  if (!edits) {
    return character;
  }

  const overrides: Partial<Record<CharacterSkillField, number>> = {};
  let hasChanges = false;

  for (const field of characterSkillFields) {
    const nextValue = edits[field];

    if (typeof nextValue !== "number") {
      continue;
    }

    const clampedValue = clampSkillValue(nextValue);

    if (character[field] === clampedValue) {
      continue;
    }

    overrides[field] = clampedValue;
    hasChanges = true;
  }

  return hasChanges ? { ...character, ...overrides } : character;
}

export function setOptimisticSkillEdit(
  pendingEdits: PendingOptimisticCharacterSkillEdits,
  characterId: string,
  field: CharacterSkillField,
  value: number,
) {
  const nextValue = clampSkillValue(value);
  const currentCharacterEdits = pendingEdits[characterId];

  if (currentCharacterEdits?.[field] === nextValue) {
    return pendingEdits;
  }

  return {
    ...pendingEdits,
    [characterId]: {
      ...currentCharacterEdits,
      [field]: nextValue,
    },
  };
}

export function clearOptimisticSkillEdit(
  pendingEdits: PendingOptimisticCharacterSkillEdits,
  characterId: string,
  field: CharacterSkillField,
) {
  const currentCharacterEdits = pendingEdits[characterId];

  if (!currentCharacterEdits || typeof currentCharacterEdits[field] !== "number") {
    return pendingEdits;
  }

  const nextCharacterEdits = { ...currentCharacterEdits };
  delete nextCharacterEdits[field];

  if (Object.keys(nextCharacterEdits).length === 0) {
    const nextPendingEdits = { ...pendingEdits };
    delete nextPendingEdits[characterId];
    return nextPendingEdits;
  }

  return {
    ...pendingEdits,
    [characterId]: nextCharacterEdits,
  };
}

export function pruneOptimisticSkillEdits(
  pendingEdits: PendingOptimisticCharacterSkillEdits,
  characterIds: Iterable<string>,
) {
  const validCharacterIds = new Set(characterIds);
  let hasChanges = false;
  const nextPendingEdits: PendingOptimisticCharacterSkillEdits = {};

  for (const [characterId, edits] of Object.entries(pendingEdits)) {
    if (!validCharacterIds.has(characterId)) {
      hasChanges = true;
      continue;
    }

    nextPendingEdits[characterId] = edits;
  }

  return hasChanges ? nextPendingEdits : pendingEdits;
}

export function updateCharacterSkillValue(
  characters: CharacterRecord[],
  characterId: string,
  field: CharacterSkillField,
  value: number,
) {
  const nextValue = clampSkillValue(value);
  let hasChanges = false;

  const nextCharacters = characters.map((character) => {
    if (character.id !== characterId || character[field] === nextValue) {
      return character;
    }

    hasChanges = true;
    return {
      ...character,
      [field]: nextValue,
    };
  });

  return hasChanges ? nextCharacters : characters;
}

export function mergeCharacterWithPreservedSkills(
  currentCharacter: CharacterRecord | undefined,
  incomingCharacter: CharacterRecord,
) {
  if (!currentCharacter) {
    return incomingCharacter;
  }

  const preservedSkillValues: Partial<Record<CharacterSkillField, number>> = {};
  let hasChanges = false;

  for (const field of characterSkillFields) {
    if (currentCharacter[field] === incomingCharacter[field]) {
      continue;
    }

    preservedSkillValues[field] = currentCharacter[field];
    hasChanges = true;
  }

  return hasChanges
    ? { ...incomingCharacter, ...preservedSkillValues }
    : incomingCharacter;
}

export function mergeCharacterListWithPreservedSkills(
  currentCharacters: CharacterRecord[],
  incomingCharacters: CharacterRecord[],
) {
  const charactersById = new Map(
    currentCharacters.map((character) => [character.id, character] as const),
  );

  return incomingCharacters.map((character) =>
    mergeCharacterWithPreservedSkills(charactersById.get(character.id), character),
  );
}
