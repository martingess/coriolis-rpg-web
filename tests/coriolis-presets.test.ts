import { describe, expect, it } from "vitest";

import { inventoryCatalog } from "@/lib/coriolis-presets";

function findPreset(label: string) {
  const preset = inventoryCatalog.find((entry) => entry.label === label);

  if (!preset) {
    throw new Error(`Missing preset: ${label}`);
  }

  return preset;
}

describe("rulebook starter-gear catalog", () => {
  it("includes the Chapter 2 starter choices that were previously missing", () => {
    expect(findPreset("Modulation mask")).toBeDefined();
    expect(findPreset("Mechanical lockpick")).toBeDefined();
    expect(findPreset("An assortment of fake identities")).toBeDefined();
    expect(findPreset("Security tablet")).toBeDefined();
    expect(findPreset("Poison (5 doses)")).toBeDefined();
    expect(findPreset("Tools (Advanced)")).toBeDefined();
    expect(findPreset("Dura knife")).toBeDefined();
    expect(findPreset("Command unit")).toBeDefined();
    expect(findPreset("Advanced scope")).toBeDefined();
  });

  it("matches the audited encumbrance values from the Chapter 6 tables", () => {
    expect(findPreset("Communicator (IV)")).toMatchObject({ encumbranceUnits: 4 });
    expect(findPreset("Communicator (V)")).toMatchObject({ encumbranceUnits: 4 });
    expect(findPreset("Com link V")).toMatchObject({ encumbranceUnits: 4 });
    expect(findPreset("Personal holograph")).toMatchObject({ encumbranceUnits: 0 });
    expect(findPreset("Proximity sensor")).toMatchObject({ encumbranceUnits: 2 });
    expect(findPreset("Voice amplifier")).toMatchObject({ encumbranceUnits: 1 });
    expect(findPreset("Portable lab")).toMatchObject({ encumbranceUnits: 4 });
    expect(findPreset("Database")).toMatchObject({ encumbranceUnits: 0 });
    expect(findPreset("Vacuum sealer")).toMatchObject({ encumbranceUnits: 1 });
    expect(findPreset("Hyper rope")).toMatchObject({ encumbranceUnits: 0 });
  });
});
