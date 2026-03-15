import { describe, expect, it } from "vitest";

import {
  applyDerivedStats,
  calculateMaxHitPoints,
  calculateMaxMindPoints,
} from "@/lib/coriolis-rules";
import {
  applyOptimisticSkillEdits,
  clearOptimisticSkillEdit,
  mergeCharacterListWithPreservedSkills,
  mergeCharacterWithPreservedSkills,
  pruneOptimisticSkillEdits,
  setOptimisticSkillEdit,
  updateCharacterSkillValue,
} from "@/lib/optimistic-skills";
import type { CharacterRecord } from "@/lib/roster-types";
import { seededCharacters } from "@/lib/seed-data";

function makeCharacter(
  id: string,
  overrides: Partial<CharacterRecord> = {},
): CharacterRecord {
  const seed = seededCharacters[0];
  const strength = overrides.strength ?? seed.strength;
  const agility = overrides.agility ?? seed.agility;
  const wits = overrides.wits ?? seed.wits;
  const empathy = overrides.empathy ?? seed.empathy;
  const maxHitPoints =
    overrides.maxHitPoints ?? calculateMaxHitPoints(strength, agility);
  const maxMindPoints =
    overrides.maxMindPoints ?? calculateMaxMindPoints(wits, empathy);
  const derived = applyDerivedStats({
    strength,
    agility,
    wits,
    empathy,
    currentHitPoints: overrides.currentHitPoints ?? seed.currentHitPoints,
    currentMindPoints: overrides.currentMindPoints ?? seed.currentMindPoints,
  });

  return {
    ...seed,
    id,
    portraitPath: null,
    maxHitPoints,
    maxMindPoints,
    currentHitPoints: derived.currentHitPoints,
    currentMindPoints: derived.currentMindPoints,
    relationships: seed.relationships.map((relationship, index) => ({
      id: `${id}-relationship-${index}`,
      ...relationship,
    })),
    talents: seed.talents.map((talent, index) => ({
      id: `${id}-talent-${index}`,
      ...talent,
    })),
    weapons: seed.weapons.map((weapon, index) => ({
      id: `${id}-weapon-${index}`,
      ...weapon,
    })),
    gearItems: seed.gearItems.map((item, index) => ({
      id: `${id}-gear-${index}`,
      ...item,
    })),
    contacts: seed.contacts.map((contact, index) => ({
      id: `${id}-contact-${index}`,
      ...contact,
    })),
    ...overrides,
  };
}

describe("optimistic skills helpers", () => {
  it("applies optimistic skill edits without mutating the original character", () => {
    const character = makeCharacter("char-1", { pilot: 2, technology: 1 });

    const updated = applyOptimisticSkillEdits(character, {
      pilot: 4,
      technology: 8,
    });

    expect(updated).not.toBe(character);
    expect(updated.pilot).toBe(4);
    expect(updated.technology).toBe(5);
    expect(character.pilot).toBe(2);
    expect(character.technology).toBe(1);
  });

  it("preserves current skill values when a stale character snapshot lands", () => {
    const current = makeCharacter("char-1", {
      name: "Sabah",
      pilot: 4,
      technology: 3,
    });
    const incoming = makeCharacter("char-1", {
      name: "Captain Sabah",
      pilot: 1,
      technology: 0,
    });

    const merged = mergeCharacterWithPreservedSkills(current, incoming);

    expect(merged.name).toBe("Captain Sabah");
    expect(merged.pilot).toBe(4);
    expect(merged.technology).toBe(3);
  });

  it("preserves confirmed skill values when replacing a character list", () => {
    const currentCharacters = [
      makeCharacter("char-1", { pilot: 4 }),
      makeCharacter("char-2", { pilot: 1 }),
    ];
    const incomingCharacters = [
      makeCharacter("char-1", { name: "Captain Sabah", pilot: 0 }),
    ];

    const merged = mergeCharacterListWithPreservedSkills(
      currentCharacters,
      incomingCharacters,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe("Captain Sabah");
    expect(merged[0]?.pilot).toBe(4);
  });

  it("updates only the targeted skill field in the character list", () => {
    const characters = [
      makeCharacter("char-1", { pilot: 1, technology: 2 }),
      makeCharacter("char-2", { pilot: 3 }),
    ];

    const updated = updateCharacterSkillValue(
      characters,
      "char-1",
      "pilot",
      9,
    );

    expect(updated[0]?.pilot).toBe(5);
    expect(updated[0]?.technology).toBe(2);
    expect(updated[1]).toBe(characters[1]);
  });

  it("adds, clears, and prunes pending optimistic skill edits", () => {
    const withEdits = setOptimisticSkillEdit({}, "char-1", "pilot", 4);
    const withMoreEdits = setOptimisticSkillEdit(
      withEdits,
      "char-2",
      "technology",
      2,
    );
    const cleared = clearOptimisticSkillEdit(withMoreEdits, "char-1", "pilot");
    const pruned = pruneOptimisticSkillEdits(cleared, ["char-1"]);

    expect(withMoreEdits).toEqual({
      "char-1": { pilot: 4 },
      "char-2": { technology: 2 },
    });
    expect(cleared).toEqual({
      "char-2": { technology: 2 },
    });
    expect(pruned).toEqual({});
  });
});
