import type { CharacterRecord, Upbringing } from "@/lib/roster-types";

export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 5;
export const SKILL_MIN = 0;
export const SKILL_MAX = 5;
export const RADIATION_MAX = 10;
export const RELOAD_MAX = 6;
export const CONDITION_MODIFIER_ABS_MAX = 20;

const skillPointFields = [
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

export const starterGuidanceLabels = {
  attributePoints: "Attribute points",
  skillPoints: "Skill points",
  groupTalents: "Group talents",
  conceptTalents: "Personal talents",
  iconTalents: "Icon talents",
  totalTalents: "Total talents",
  baseReputation: "Base upbringing reputation",
  startingCapital: "Starting capital",
} as const;

export const starterGuidanceHints = {
  emptyState: "Choose an upbringing to activate starter guidance.",
  baseReputation:
    "Base upbringing reputation only. Concept modifiers and humanite exceptions are not modeled in v1.",
  otherTalents:
    "Other-tagged talents count toward the total row, but they do not have a dedicated rulebook starter target.",
} as const;

const upbringingStarterTargets = {
  plebeian: {
    attributePoints: 15,
    skillPoints: 8,
    baseReputation: 2,
    startingCapital: 500,
  },
  stationary: {
    attributePoints: 14,
    skillPoints: 10,
    baseReputation: 4,
    startingCapital: 1000,
  },
  privileged: {
    attributePoints: 13,
    skillPoints: 12,
    baseReputation: 6,
    startingCapital: 5000,
  },
} as const satisfies Record<
  Upbringing,
  {
    attributePoints: number;
    skillPoints: number;
    baseReputation: number;
    startingCapital: number;
  }
>;

export type StarterGuidanceInput = Pick<
  CharacterRecord,
  | "upbringing"
  | "strength"
  | "agility"
  | "wits"
  | "empathy"
  | "reputation"
  | "birr"
  | "dexterity"
  | "force"
  | "infiltration"
  | "manipulation"
  | "meleeCombat"
  | "observation"
  | "rangedCombat"
  | "survival"
  | "command"
  | "culture"
  | "dataDjinn"
  | "medicurgy"
  | "mysticPowers"
  | "pilot"
  | "science"
  | "technology"
  | "talents"
>;

export type StarterGuidanceTarget = {
  attributePoints: number;
  skillPoints: number;
  groupTalents: number;
  conceptTalents: number;
  iconTalents: number;
  totalTalents: number;
  baseReputation: number;
  startingCapital: number;
};

export type StarterGuidanceActual = {
  attributePoints: number;
  skillPoints: number;
  groupTalents: number;
  conceptTalents: number;
  iconTalents: number;
  otherTalents: number;
  totalTalents: number;
  reputation: number;
  startingCapital: number;
};

export type StarterGuidanceSummary = {
  selectedUpbringing: Upbringing | null;
  target: StarterGuidanceTarget | null;
  actual: StarterGuidanceActual;
};

export type DerivedStatInput = {
  agility: number;
  currentHitPoints: number;
  currentMindPoints: number;
  empathy: number;
  strength: number;
  wits: number;
};

export type ConditionModifierTotals = {
  hitPoints: number;
  mindPoints: number;
  radiation: number;
};

type ConditionModifierLike = {
  target: keyof ConditionModifierTotals;
  value: number;
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

export function sumConditionModifierTotals(
  modifiers: ConditionModifierLike[],
): ConditionModifierTotals {
  return modifiers.reduce<ConditionModifierTotals>(
    (totals, modifier) => ({
      ...totals,
      [modifier.target]:
        totals[modifier.target] +
        clampNumber(modifier.value, -CONDITION_MODIFIER_ABS_MAX, CONDITION_MODIFIER_ABS_MAX),
    }),
    {
      hitPoints: 0,
      mindPoints: 0,
      radiation: 0,
    },
  );
}

export function calculateEffectiveConditionMaximums(input: {
  agility: number;
  empathy: number;
  modifiers: ConditionModifierLike[];
  strength: number;
  wits: number;
}) {
  const totals = sumConditionModifierTotals(input.modifiers);

  return {
    maxHitPoints: Math.max(
      1,
      calculateMaxHitPoints(input.strength, input.agility) + totals.hitPoints,
    ),
    maxMindPoints: Math.max(
      1,
      calculateMaxMindPoints(input.wits, input.empathy) + totals.mindPoints,
    ),
    maxRadiation: Math.max(1, RADIATION_MAX + totals.radiation),
  };
}

export function applyConditionTrackMaximums(input: {
  agility: number;
  currentHitPoints: number;
  currentMindPoints: number;
  empathy: number;
  modifiers: ConditionModifierLike[];
  radiation: number;
  strength: number;
  wits: number;
}) {
  const maximums = calculateEffectiveConditionMaximums(input);

  return {
    ...maximums,
    currentHitPoints: clampNumber(input.currentHitPoints, 0, maximums.maxHitPoints),
    currentMindPoints: clampNumber(input.currentMindPoints, 0, maximums.maxMindPoints),
    radiation: clampNumber(input.radiation, 0, maximums.maxRadiation),
  };
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
  items: Array<{ encumbranceUnits: number; isTiny: boolean; quantity?: number }>,
) {
  return items.reduce((total, item) => {
    if (item.isTiny) {
      return total;
    }

    return total + Math.max(0, item.encumbranceUnits) * Math.max(1, item.quantity ?? 1);
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

export function calculateStarterGuidance(
  input: StarterGuidanceInput,
): StarterGuidanceSummary {
  const actual = {
    attributePoints: input.strength + input.agility + input.wits + input.empathy,
    skillPoints: skillPointFields.reduce((total, field) => total + input[field], 0),
    groupTalents: input.talents.filter((talent) => talent.source === "group").length,
    conceptTalents: input.talents.filter((talent) => talent.source === "concept").length,
    iconTalents: input.talents.filter((talent) => talent.source === "icon").length,
    otherTalents: input.talents.filter((talent) => talent.source === "other").length,
    totalTalents: input.talents.length,
    reputation: input.reputation,
    startingCapital: input.birr,
  };

  if (!input.upbringing) {
    return {
      selectedUpbringing: null,
      target: null,
      actual,
    };
  }

  const selectedTarget = upbringingStarterTargets[input.upbringing];

  return {
    selectedUpbringing: input.upbringing,
    target: {
      ...selectedTarget,
      groupTalents: 1,
      conceptTalents: 1,
      iconTalents: 1,
      totalTalents: 3,
    },
    actual,
  };
}
