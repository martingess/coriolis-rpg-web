import { describe, expect, it } from "vitest";

import {
  applyDerivedStats,
  formatEncumbranceUnits,
  getEncumbranceCapacityUnits,
  getEncumbranceUsedUnits,
} from "@/lib/coriolis-rules";

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
        { encumbranceUnits: 2, isTiny: false },
        { encumbranceUnits: 1, isTiny: false },
        { encumbranceUnits: 4, isTiny: false },
        { encumbranceUnits: 0, isTiny: true },
      ]),
    ).toBe(7);

    expect(getEncumbranceCapacityUnits(3)).toBe(12);
    expect(formatEncumbranceUnits(1)).toBe("Light");
    expect(formatEncumbranceUnits(4)).toBe("Heavy");
  });
});
