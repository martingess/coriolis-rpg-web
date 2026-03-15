export const teamNoteTagValues = [
  "mission",
  "npc",
  "faction",
  "ship",
  "mystery",
  "debt",
  "session",
] as const;

export const teamFactionStanceValues = ["ally", "neutral", "enemy"] as const;

export const teamCrewRoleValues = [
  "captain",
  "engineer",
  "pilot",
  "sensorOperator",
  "gunner",
] as const;

export const groupConceptValues = [
  "Agents",
  "Mercenaries",
  "Free Traders",
  "Pilgrims",
  "Explorers",
] as const;

export type TeamNoteTag = (typeof teamNoteTagValues)[number];
export type TeamFactionStance = (typeof teamFactionStanceValues)[number];
export type TeamCrewRole = (typeof teamCrewRoleValues)[number];
export type GroupConcept = (typeof groupConceptValues)[number];

export type TeamCrewPositionRecord = {
  id: string;
  order: number;
  role: TeamCrewRole;
  primaryCharacterId: string | null;
  backupCharacterId: string | null;
  notes: string;
};

export type TeamStoryBeatRecord = {
  id: string;
  order: number;
  title: string;
  description: string;
  createdAt: string;
};

export type TeamNoteRecord = {
  id: string;
  order: number;
  tag: TeamNoteTag;
  title: string;
  body: string;
};

export type TeamKnownFaceRecord = {
  id: string;
  order: number;
  name: string;
  concept: string;
  faction: string;
  lastSeen: string;
  trustLevel: number;
  notes: string;
  portraitPath: string | null;
  promotedCharacterId: string | null;
};

export type TeamFactionTieRecord = {
  id: string;
  order: number;
  faction: string;
  stance: TeamFactionStance;
  heat: number;
  leverageHolder: string;
  notes: string;
};

export type TeamRecord = {
  id: string;
  name: string;
  manifesto: string;
  story: string;
  groupConcept: string;
  groupTalent: string;
  patron: string;
  nemesis: string;
  shipName: string;
  shipType: string;
  shipClass: string;
  shipProblem: string;
  shipDebt: number;
  shipUpgrades: string;
  currentGoal: string;
  nextLead: string;
  reward: string;
  deadline: string;
  unresolvedMystery: string;
  crewPositions: TeamCrewPositionRecord[];
  storyBeats: TeamStoryBeatRecord[];
  notes: TeamNoteRecord[];
  knownFaces: TeamKnownFaceRecord[];
  factionTies: TeamFactionTieRecord[];
};

export type TeamScalarField =
  | "name"
  | "manifesto"
  | "story"
  | "groupConcept"
  | "groupTalent"
  | "patron"
  | "nemesis"
  | "shipName"
  | "shipType"
  | "shipClass"
  | "shipProblem"
  | "shipDebt"
  | "shipUpgrades"
  | "currentGoal"
  | "nextLead"
  | "reward"
  | "deadline"
  | "unresolvedMystery";

export type TeamRepeaterKind =
  | "crewPosition"
  | "storyBeat"
  | "note"
  | "knownFace"
  | "factionTie";

export const teamNoteTagLabels: Record<TeamNoteTag, string> = {
  mission: "Mission",
  npc: "NPC",
  faction: "Faction",
  ship: "Ship",
  mystery: "Mystery",
  debt: "Debt",
  session: "Session",
};

export const teamFactionStanceLabels: Record<TeamFactionStance, string> = {
  ally: "Ally",
  neutral: "Neutral",
  enemy: "Enemy",
};

export const teamCrewRoleLabels: Record<TeamCrewRole, string> = {
  captain: "Captain",
  engineer: "Engineer",
  pilot: "Pilot",
  sensorOperator: "Sensor Operator",
  gunner: "Gunner",
};

export const teamCrewRoleDescriptions: Record<TeamCrewRole, string> = {
  captain: "Command voice, tactical anchor, and the crew's public face.",
  engineer: "Keeps the ship alive when the hull, reactor, or systems complain.",
  pilot: "Handles jumps, evasive maneuvers, and every landing worth surviving.",
  sensorOperator: "Reads the void, tracks threats, and spots what others miss.",
  gunner: "Brings disciplined violence when diplomacy runs out of oxygen.",
};

export const groupTalentOptionsByConcept: Record<GroupConcept, string[]> = {
  Agents: [
    "A Friend in Every Port",
    "Assassin's Guild",
    "Dancers of Ahlam",
  ],
  Mercenaries: ["Assault", "Charge", "Situational Awareness"],
  "Free Traders": [
    "A Nose for Birr",
    "Everything is for Sale",
    "Quickest Route",
  ],
  Pilgrims: ["Last Laugh", "Mercy of the Icons", "One Last Birr"],
  Explorers: ["Seasoned Travelers", "Survivors", "Truth Seekers"],
};

export const patronSuggestionsByConcept: Record<GroupConcept, string[]> = {
  Agents: [
    "Captain Girrah (Judicator)",
    "Jihvane Kourides (Special Branch of the Consortium)",
    "Hiram \"the Black Widow\" Momasdi (Ahlam's Black Lotuses)",
    "Nefrite Garroud (the Free League's news division)",
  ],
  Mercenaries: [
    "Hatma \"The Skull\" Kerash (the Legion)",
    "Captain Arina Chike (the Chike Company)",
    "High General Abassar Douk (the Free Uharan Army)",
    "Farhad Krisma (Strike Team Krisma)",
  ],
  "Free Traders": [
    "Aldair Jubal (Jubal Imports & Exports)",
    "Abdul Nasr (the Free League)",
    "Lea Marhoun (Zenithian Trade Alliance)",
    "Mukhtar Sawalla (Hyperion Logistics)",
  ],
  Pilgrims: [
    "High Priestess Taminasah-Buri (the Church of the Icons)",
    "High General Abassar Douk (the Free Uharan Army)",
    "Captain Mero (Mero's Promise)",
    "Io \"the Smile\" Xoma (circus director)",
    "Shuja Mulk-Chitral (leader of the Mehtar nomads)",
  ],
  Explorers: [
    "Doctor Wana (the Foundation's Archaeological Institute)",
    "Professor Omalda darBhouno (the Mathematical Institute of Daddah)",
    "Jarros Kumbra (the Colonial Agency)",
    "Drefusol Amadi (Free News)",
  ],
};

export const trustLevelLabels = [
  "Burn notice",
  "Hostile",
  "Wary",
  "Working contact",
  "Trusted",
  "Inner circle",
] as const;
