import type {
  CharacterContactRecord,
  CharacterGearItemRecord,
  OriginCulture,
  OriginSystem,
  CharacterRelationshipRecord,
  CharacterTalentRecord,
  CharacterWeaponRecord,
  TalentSource,
  Upbringing,
} from "@/lib/roster-types";

type SeedCharacter = {
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
  strength: number;
  agility: number;
  wits: number;
  empathy: number;
  currentHitPoints: number;
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
  relationships: Omit<CharacterRelationshipRecord, "id">[];
  talents: Omit<CharacterTalentRecord, "id">[];
  weapons: Omit<CharacterWeaponRecord, "id">[];
  gearItems: Omit<CharacterGearItemRecord, "id">[];
  contacts: Omit<CharacterContactRecord, "id">[];
};

function talent(name: string, source: TalentSource, notes = "", order = 1) {
  return { order, name, source, notes };
}

export const seededCharacters: SeedCharacter[] = [
  {
    name: "Sabah al-Malik",
    description:
      "A sharp-eyed prospector who treats the void like a map of unfinished promises.",
    background: "Firstcome Stationary from Kua",
    originCulture: "firstcome",
    originSystem: "kua",
    upbringing: "stationary",
    concept: "Trailblazer / Prospector",
    groupConcept: "Explorers",
    icon: "The Traveler",
    reputation: 4,
    personalProblem:
      "Something from the Dark between the Stars still whispers during hypersleep.",
    face: "Sun-browned skin, copper freckles, one cybernetic iris",
    clothing: "Weathered dust wraps, pilot harness, prayer-thread bracelets",
    strength: 3,
    agility: 4,
    wits: 4,
    empathy: 3,
    currentHitPoints: 6,
    currentMindPoints: 5,
    radiation: 1,
    experience: 4,
    criticalInjuries: "Hairline fracture in left wrist from a mining collapse.",
    notes:
      "Keeps a private atlas of rumor routes, collapsed dig sites, and half-remembered portal myths.",
    myCabinDescription:
      "A narrow berth layered with sand-proof fabrics, map pins, and a star chart painted directly onto the ceiling.",
    myCabinGear: "Prospecting case, sample tubes, lucky compass, sealed ore canister.",
    myCabinOther: "A tiny prayer alcove facing the ship's bow.",
    birr: 1260,
    armorName: "Explorer's exo shell",
    armorRating: 2,
    armorComment: "Scratched plating, patched seals, still dependable.",
    dexterity: 1,
    force: 0,
    infiltration: 0,
    manipulation: 0,
    meleeCombat: 0,
    observation: 1,
    rangedCombat: 1,
    survival: 2,
    command: 0,
    culture: 0,
    dataDjinn: 0,
    medicurgy: 0,
    mysticPowers: 0,
    pilot: 2,
    science: 1,
    technology: 3,
    relationships: [
      {
        order: 1,
        targetName: "Nassim Vale",
        description: "You translate their ambition into practical routes.",
        isBuddy: true,
      },
      {
        order: 2,
        targetName: "Ship captain",
        description: "You trust them in a storm, not in a negotiation.",
        isBuddy: false,
      },
    ],
    talents: [
      talent("Pathfinder", "concept", "Knows how to read terrain and opportunity.", 1),
      talent("Nine Lives", "concept", "Escapes danger by instinct and luck.", 2),
      talent("Wayfinder's Grace", "icon", "The Traveler steadies risky journeys.", 3),
    ],
    weapons: [
      {
        order: 1,
        presetId: "vulcan-carbine",
        name: "Vulcan carbine",
        bonus: 1,
        initiative: 0,
        damage: 3,
        crit: "2",
        range: "Short",
        comments: "Automatic fire",
        reloads: 2,
      },
      {
        order: 2,
        presetId: "dura-axe",
        name: "Dura axe",
        bonus: 0,
        initiative: 0,
        damage: 3,
        crit: "1",
        range: "Close",
        comments: "Heavy, cell-powered",
        reloads: 0,
      },
    ],
    gearItems: [
      {
        order: 1,
        presetId: "recon-drone",
        name: "Recon drone",
        bonus: "",
        comment: "Repaired twice, still loyal.",
        quantity: 1,
        encumbranceUnits: 2,
        isTiny: false,
      },
      {
        order: 2,
        presetId: "exo-shell",
        name: "Exo shell",
        bonus: "",
        comment: "Vacuum-rated, patched at the hips.",
        quantity: 1,
        encumbranceUnits: 4,
        isTiny: false,
      },
      {
        order: 3,
        presetId: "compass",
        name: "Compass",
        bonus: "",
        comment: "Inherited from a station nomad grandmother.",
        quantity: 1,
        encumbranceUnits: 0,
        isTiny: true,
      },
      {
        order: 4,
        presetId: "m-doses",
        name: "5 m-doses",
        bonus: "",
        comment: "Emergency kit",
        quantity: 1,
        encumbranceUnits: 0,
        isTiny: true,
      },
    ],
    contacts: [
      {
        order: 1,
        name: "Dara Vey",
        concept: "Survey broker",
        notes: "Will trade obsolete maps for mineral gossip.",
      },
      {
        order: 2,
        name: "Imad Qori",
        concept: "Dock mechanic",
        notes: "Can source illegal sealant if the price feels respectful.",
      },
    ],
  },
  {
    name: "Nassim Vale",
    description:
      "A velvet-voiced correspondent who can turn a station rumor into leverage before the tea cools.",
    background: "Zenithian Privileged from Coriolis",
    originCulture: "zenithian",
    originSystem: "kua",
    upbringing: "privileged",
    concept: "Data Spider / Correspondent",
    groupConcept: "Agents",
    icon: "The Messenger",
    reputation: 7,
    personalProblem:
      "A sealed archive on Coriolis contains an interview that could ruin three powerful families, including their own.",
    face: "Elegant jawline, silver-rim spectacles, impeccably calm stare",
    clothing: "Layered charcoal robes with copper threading and soft court shoes",
    strength: 2,
    agility: 3,
    wits: 4,
    empathy: 4,
    currentHitPoints: 4,
    currentMindPoints: 6,
    radiation: 0,
    experience: 6,
    criticalInjuries: "Sleeplessness and recurring stress tremor in the right hand.",
    notes:
      "Maintains a parallel network of favors, transcripts, and encrypted confessionals across the Horizon.",
    myCabinDescription:
      "More salon than bunk: lacquered tea set, low amber lights, and curtains that hide too many recording devices.",
    myCabinGear: "Portable archive, signal masks, spare transactors, five notebooks.",
    myCabinOther: "A small shrine to the Messenger hidden behind a data spine.",
    birr: 4320,
    armorName: "Silk-lined protective coat",
    armorRating: 1,
    armorComment: "Looks ceremonial, wears like caution.",
    dexterity: 1,
    force: 0,
    infiltration: 1,
    manipulation: 3,
    meleeCombat: 0,
    observation: 2,
    rangedCombat: 0,
    survival: 0,
    command: 1,
    culture: 2,
    dataDjinn: 3,
    medicurgy: 0,
    mysticPowers: 0,
    pilot: 0,
    science: 1,
    technology: 0,
    relationships: [
      {
        order: 1,
        targetName: "Sabah al-Malik",
        description: "Their instincts keep your plans alive in the field.",
        isBuddy: true,
      },
      {
        order: 2,
        targetName: "Station patron",
        description: "Useful, dangerous, and never truly on your side.",
        isBuddy: false,
      },
    ],
    talents: [
      talent("Networker", "concept", "Always knows who owes whom.", 1),
      talent("Data Whisperer", "concept", "Can tease secrets out of closed systems.", 2),
      talent("Courier's Blessing", "icon", "The Messenger sharpens timing and delivery.", 3),
    ],
    weapons: [
      {
        order: 1,
        presetId: "vulcan-cricket",
        name: "Vulcan cricket",
        bonus: 1,
        initiative: 2,
        damage: 2,
        crit: "2",
        range: "Short",
        comments: "Light",
        reloads: 1,
      },
      {
        order: 2,
        presetId: "stun-gun",
        name: "Stun gun",
        bonus: 1,
        initiative: 1,
        damage: 2,
        crit: "Stun",
        range: "Short",
        comments: "Quiet insurance",
        reloads: 1,
      },
    ],
    gearItems: [
      {
        order: 1,
        presetId: "personal-holograph",
        name: "Personal holograph",
        bonus: "",
        comment: "For immersive interviews and dramatic reveals.",
        quantity: 1,
        encumbranceUnits: 1,
        isTiny: false,
      },
      {
        order: 2,
        presetId: "computer",
        name: "Computer",
        bonus: "",
        comment: "Encrypted and annoyingly elegant.",
        quantity: 1,
        encumbranceUnits: 2,
        isTiny: false,
      },
      {
        order: 3,
        presetId: "transactor-1000",
        name: "Transactor with 1,000 birr",
        bonus: "",
        comment: "Emergency hush money.",
        quantity: 1,
        encumbranceUnits: 0,
        isTiny: true,
      },
      {
        order: 4,
        presetId: "tabula",
        name: "Tabula",
        bonus: "",
        comment: "Covered in draft headlines.",
        quantity: 1,
        encumbranceUnits: 1,
        isTiny: false,
      },
    ],
    contacts: [
      {
        order: 1,
        name: "Leila Om-Rah",
        concept: "Bulletin fixer",
        notes: "Can bury a story or sell it twice.",
      },
      {
        order: 2,
        name: "Brother Sahl",
        concept: "Temple archivist",
        notes: "Hates Nassim's methods, loves their donations.",
      },
    ],
  },
];
