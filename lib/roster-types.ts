export type TalentSource = "group" | "concept" | "icon" | "other";
export const originCultureValues = ["firstcome", "zenithian"] as const;
export const originSystemValues = [
  "algol",
  "mira",
  "kua",
  "dabaran",
  "zalos",
  "other",
] as const;
export const upbringingValues = ["plebeian", "stationary", "privileged"] as const;
export type OriginCulture = (typeof originCultureValues)[number];
export type OriginSystem = (typeof originSystemValues)[number];
export type Upbringing = (typeof upbringingValues)[number];
export type InventoryKind = "weapon" | "gear" | "tiny";
export type RepeaterKind =
  | "relationship"
  | "talent"
  | "weapon"
  | "gear"
  | "contact";

export type CharacterRelationshipRecord = {
  id: string;
  order: number;
  targetName: string;
  description: string;
  isBuddy: boolean;
};

export type CharacterTalentRecord = {
  id: string;
  order: number;
  name: string;
  source: TalentSource;
  notes: string;
};

export type CharacterWeaponRecord = {
  id: string;
  order: number;
  presetId: string | null;
  name: string;
  bonus: number;
  initiative: number;
  damage: number;
  crit: string;
  range: string;
  comments: string;
  reloads: number;
};

export type CharacterGearItemRecord = {
  id: string;
  order: number;
  presetId: string | null;
  name: string;
  bonus: string;
  comment: string;
  quantity: number;
  encumbranceUnits: number;
  isTiny: boolean;
};

export type CharacterContactRecord = {
  id: string;
  order: number;
  name: string;
  concept: string;
  notes: string;
};

export type CharacterRecord = {
  id: string;
  name: string;
  description: string;
  background: string;
  originCulture: OriginCulture | null;
  originSystem: OriginSystem | null;
  upbringing: Upbringing | null;
  concept: string;
  groupConcept: string;
  icon: string;
  reputation: number;
  personalProblem: string;
  face: string;
  clothing: string;
  portraitPath: string | null;
  strength: number;
  agility: number;
  wits: number;
  empathy: number;
  maxHitPoints: number;
  currentHitPoints: number;
  maxMindPoints: number;
  currentMindPoints: number;
  radiation: number;
  experience: number;
  criticalInjuries: string;
  notes: string;
  myCabinDescription: string;
  myCabinGear: string;
  myCabinOther: string;
  birr: number;
  armorName: string;
  armorRating: number;
  armorComment: string;
  dexterity: number;
  force: number;
  infiltration: number;
  manipulation: number;
  meleeCombat: number;
  observation: number;
  rangedCombat: number;
  survival: number;
  command: number;
  culture: number;
  dataDjinn: number;
  medicurgy: number;
  mysticPowers: number;
  pilot: number;
  science: number;
  technology: number;
  relationships: CharacterRelationshipRecord[];
  talents: CharacterTalentRecord[];
  weapons: CharacterWeaponRecord[];
  gearItems: CharacterGearItemRecord[];
  contacts: CharacterContactRecord[];
};

export type WeaponPreset = {
  id: string;
  kind: "weapon";
  label: string;
  category: string;
  bonus: number;
  initiative: number;
  damage: number;
  crit: string;
  range: string;
  comments: string;
  reloads: number;
};

export type GearPreset = {
  id: string;
  kind: "gear" | "tiny";
  label: string;
  category: string;
  bonus: string;
  comment: string;
  encumbranceUnits: number;
};

export type InventoryPreset = WeaponPreset | GearPreset;

export type CharacterScalarField =
  | "name"
  | "description"
  | "background"
  | "originCulture"
  | "originSystem"
  | "upbringing"
  | "concept"
  | "groupConcept"
  | "icon"
  | "reputation"
  | "personalProblem"
  | "face"
  | "clothing"
  | "strength"
  | "agility"
  | "wits"
  | "empathy"
  | "currentHitPoints"
  | "currentMindPoints"
  | "radiation"
  | "experience"
  | "criticalInjuries"
  | "notes"
  | "myCabinDescription"
  | "myCabinGear"
  | "myCabinOther"
  | "birr"
  | "armorName"
  | "armorRating"
  | "armorComment"
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
  | "technology";
