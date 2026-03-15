export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 5;
export const SKILL_MIN = 0;
export const SKILL_MAX = 5;
export const RADIATION_MAX = 10;
export const EXPERIENCE_MAX = 10;
export const RELOAD_MAX = 6;

export type DerivedStatInput = {
  agility: number;
  currentHitPoints: number;
  currentMindPoints: number;
  empathy: number;
  strength: number;
  wits: number;
};

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

export function calculateMaxHitPoints(strength: number, agility: number) {
  return clampNumber(strength, ATTRIBUTE_MIN, ATTRIBUTE_MAX) +
    clampNumber(agility, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
}

export function calculateMaxMindPoints(wits: number, empathy: number) {
  return clampNumber(wits, ATTRIBUTE_MIN, ATTRIBUTE_MAX) +
    clampNumber(empathy, ATTRIBUTE_MIN, ATTRIBUTE_MAX);
}

export function applyDerivedStats(input: DerivedStatInput) {
  const maxHitPoints = calculateMaxHitPoints(input.strength, input.agility);
  const maxMindPoints = calculateMaxMindPoints(input.wits, input.empathy);

  return {
    maxHitPoints,
    currentHitPoints: clampNumber(input.currentHitPoints, 0, maxHitPoints),
    maxMindPoints,
    currentMindPoints: clampNumber(input.currentMindPoints, 0, maxMindPoints),
  };
}

export function getEncumbranceCapacityUnits(strength: number) {
  return clampNumber(strength, ATTRIBUTE_MIN, ATTRIBUTE_MAX) * 4;
}

export function getEncumbranceUsedUnits(
  items: Array<{ encumbranceUnits: number; isTiny: boolean }>,
) {
  return items.reduce((total, item) => {
    if (item.isTiny) {
      return total;
    }

    return total + Math.max(0, item.encumbranceUnits);
  }, 0);
}

export function formatEncumbranceUnits(units: number) {
  if (units === 0) {
    return "Tiny";
  }

  if (units === 1) {
    return "Light";
  }

  if (units === 2) {
    return "Normal";
  }

  if (units === 4) {
    return "Heavy";
  }

  return `${units / 2} rows`;
}
