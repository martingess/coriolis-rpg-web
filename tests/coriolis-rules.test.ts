import { describe, expect, it } from "vitest";

import {
  applyDerivedStats,
  calculateStarterGuidance,
  formatEncumbranceUnits,
  getEncumbranceCapacityUnits,
  getEncumbranceUsedUnits,
  starterGuidanceHints,
  starterGuidanceLabels,
} from "@/lib/coriolis-rules";
import type { StarterGuidanceInput } from "@/lib/coriolis-rules";

function createStarterInput(
  overrides: Partial<StarterGuidanceInput> = {},
): StarterGuidanceInput {
  return {
    upbringing: null,
    strength: 2,
    agility: 2,
    wits: 2,
    empathy: 2,
    reputation: 0,
    birr: 0,
    dexterity: 0,
    force: 0,
    infiltration: 0,
    manipulation: 0,
    meleeCombat: 0,
    observation: 0,
    rangedCombat: 0,
    survival: 0,
    command: 0,
    culture: 0,
    dataDjinn: 0,
    medicurgy: 0,
    mysticPowers: 0,
    pilot: 0,
    science: 0,
    technology: 0,
    talents: [],
    ...overrides,
  };
}

describe("coriolis derived rules", () => {
  it("recalculates max HP and MP and clamps current values", () => {
    expect(
      applyDerivedStats({
        strength: 4,
        agility: 3,
        wits: 5,
        empathy: 2,
        currentHitPoints: 10,
        currentMindPoints: 99,
      }),
    ).toEqual({
      maxHitPoints: 7,
      currentHitPoints: 7,
      maxMindPoints: 7,
      currentMindPoints: 7,
    });
  });

  it("tracks encumbrance in half-row units", () => {
    expect(
      getEncumbranceUsedUnits([
        { encumbranceUnits: 2, isTiny: false, quantity: 2 },
        { encumbranceUnits: 1, isTiny: false, quantity: 1 },
        { encumbranceUnits: 4, isTiny: false, quantity: 1 },
        { encumbranceUnits: 0, isTiny: true, quantity: 5 },
      ]),
    ).toBe(9);

    expect(getEncumbranceCapacityUnits(3)).toBe(12);
    expect(formatEncumbranceUnits(1)).toBe("Light");
    expect(formatEncumbranceUnits(4)).toBe("Heavy");
    expect(formatEncumbranceUnits(6)).toBe("3 rows");
  });

  it("returns actual totals even when no upbringing is selected", () => {
    const guidance = calculateStarterGuidance(
      createStarterInput({
        strength: 3,
        agility: 4,
        wits: 2,
        empathy: 3,
        reputation: 5,
        birr: 900,
        dexterity: 1,
        survival: 2,
        pilot: 3,
        talents: [
          { id: "1", order: 1, name: "Pathfinder", source: "concept", notes: "" },
          { id: "2", order: 2, name: "Traveler's Grace", source: "icon", notes: "" },
        ],
      }),
    );

    expect(guidance.selectedUpbringing).toBeNull();
    expect(guidance.target).toBeNull();
    expect(guidance.actual).toMatchObject({
      attributePoints: 12,
      skillPoints: 6,
      conceptTalents: 1,
      iconTalents: 1,
      totalTalents: 2,
      reputation: 5,
      startingCapital: 900,
    });
  });

  it.each([
    ["plebeian", 15, 8, 2, 500],
    ["stationary", 14, 10, 4, 1000],
    ["privileged", 13, 12, 6, 5000],
  ] as const)(
    "loads the %s starter bundle targets",
    (upbringing, attributePoints, skillPoints, baseReputation, startingCapital) => {
      const guidance = calculateStarterGuidance(
        createStarterInput({
          upbringing,
        }),
      );

      expect(guidance.target).toEqual({
        attributePoints,
        skillPoints,
        groupTalents: 1,
        conceptTalents: 1,
        iconTalents: 1,
        totalTalents: 3,
        baseReputation,
        startingCapital,
      });
    },
  );

  it("counts talents by source and reveals over/under starter totals", () => {
    const guidance = calculateStarterGuidance(
      createStarterInput({
        upbringing: "stationary",
        strength: 3,
        agility: 4,
        wits: 3,
        empathy: 3,
        reputation: 5,
        birr: 750,
        dexterity: 1,
        force: 1,
        observation: 1,
        rangedCombat: 1,
        survival: 2,
        command: 1,
        culture: 1,
        pilot: 2,
        science: 1,
        talents: [
          { id: "1", order: 1, name: "Group Edge", source: "group", notes: "" },
          { id: "2", order: 2, name: "Pathfinder", source: "concept", notes: "" },
          { id: "3", order: 3, name: "Second Concept", source: "concept", notes: "" },
          { id: "4", order: 4, name: "Icon Favor", source: "icon", notes: "" },
          { id: "5", order: 5, name: "Smuggler's Instinct", source: "other", notes: "" },
        ],
      }),
    );

    expect(guidance.actual).toMatchObject({
      attributePoints: 13,
      skillPoints: 11,
      groupTalents: 1,
      conceptTalents: 2,
      iconTalents: 1,
      otherTalents: 1,
      totalTalents: 5,
      reputation: 5,
      startingCapital: 750,
    });
    expect(guidance.target?.attributePoints).toBeGreaterThan(guidance.actual.attributePoints);
    expect(guidance.actual.totalTalents).toBeGreaterThan(guidance.target?.totalTalents ?? 0);
  });

  it("exports guidance copy that calls out base upbringing reputation scope", () => {
    expect(starterGuidanceLabels.baseReputation).toBe("Base upbringing reputation");
    expect(starterGuidanceHints.baseReputation).toContain("Concept modifiers");
    expect(starterGuidanceHints.baseReputation).toContain("humanite exceptions");
  });
});
