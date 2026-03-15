import { describe, expect, it } from "vitest";

import {
  applyDerivedStats,
  calculateMaxHitPoints,
  calculateMaxMindPoints,
} from "@/lib/coriolis-rules";
import {
  findBestCharactersByField,
  findBestCharactersBySkill,
  findBestCharactersForRole,
  formatBestMatchNames,
  getSkillDicePool,
  hasRoleTraining,
  scoreCharacterForRole,
} from "@/lib/team-readouts";
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
    maxRadiation: overrides.maxRadiation ?? 10,
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
    conditionModifiers: overrides.conditionModifiers ?? [],
    ...overrides,
  };
}

describe("team readout helpers", () => {
  it("returns every tied winner for a field instead of silently picking the first", () => {
    const farid = makeCharacter("char-1", {
      name: "Farid",
      observation: 3,
    });
    const layla = makeCharacter("char-2", {
      name: "Layla",
      observation: 3,
    });
    const samir = makeCharacter("char-3", {
      name: "Samir",
      observation: 1,
    });

    const bestMatch = findBestCharactersByField(
      [farid, layla, samir],
      "observation",
      1,
    );

    expect(bestMatch).toMatchObject({
      value: 3,
    });
    expect(bestMatch?.winners.map((character) => character.name)).toEqual([
      "Farid",
      "Layla",
    ]);
    expect(formatBestMatchNames(bestMatch?.winners ?? [])).toBe("Farid, Layla");
  });

  it("does not report a best skill specialist when everyone is untrained", () => {
    const farid = makeCharacter("char-1", { name: "Farid", technology: 0 });
    const layla = makeCharacter("char-2", { name: "Layla", technology: 0 });

    expect(findBestCharactersBySkill([farid, layla], "technology")).toBeNull();
  });

  it("ranks best skill specialists by linked dice pool instead of raw skill only", () => {
    const instinctiveScout = makeCharacter("char-1", {
      name: "Instinctive Scout",
      wits: 5,
      observation: 1,
    });
    const trainedSpotter = makeCharacter("char-2", {
      name: "Trained Spotter",
      wits: 2,
      observation: 3,
    });

    expect(getSkillDicePool(instinctiveScout, "observation")).toBe(6);
    expect(getSkillDicePool(trainedSpotter, "observation")).toBe(5);
    expect(
      findBestCharactersBySkill([instinctiveScout, trainedSpotter], "observation")
        ?.winners.map((character) => character.name),
    ).toEqual(["Instinctive Scout"]);
  });

  it("requires relevant role training before a character can be called the best fit", () => {
    const tactician = makeCharacter("char-1", {
      name: "Tactician",
      wits: 5,
      technology: 0,
      dataDjinn: 0,
      science: 0,
    });
    const engineer = makeCharacter("char-2", {
      name: "Engineer",
      wits: 2,
      technology: 2,
      dataDjinn: 1,
      science: 0,
    });

    expect(scoreCharacterForRole(tactician, "engineer")).toBeGreaterThan(0);
    expect(hasRoleTraining(tactician, "engineer")).toBe(false);

    const bestMatch = findBestCharactersForRole([tactician, engineer], "engineer");

    expect(bestMatch?.winners.map((character) => character.name)).toEqual(["Engineer"]);
  });

  it("returns no role fit when the entire crew lacks relevant training", () => {
    const farid = makeCharacter("char-1", {
      name: "Farid",
      agility: 5,
      pilot: 0,
      observation: 0,
      survival: 0,
    });
    const layla = makeCharacter("char-2", {
      name: "Layla",
      agility: 4,
      pilot: 0,
      observation: 0,
      survival: 0,
    });

    expect(findBestCharactersForRole([farid, layla], "pilot")).toBeNull();
  });
});
