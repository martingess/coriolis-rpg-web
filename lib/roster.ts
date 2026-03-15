import {
  TalentSource,
  type OriginCulture,
  type OriginSystem,
  type Upbringing,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import {
  applyDerivedStats,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  clampNumber,
  RADIATION_MAX,
  RELOAD_MAX,
  SKILL_MAX,
  SKILL_MIN,
} from "@/lib/coriolis-rules";
import { inventoryCatalog } from "@/lib/coriolis-presets";
import { prisma } from "@/lib/prisma";
import {
  originCultureValues,
  originSystemValues,
  upbringingValues,
} from "@/lib/roster-types";
import type {
  CharacterRecord,
  CharacterScalarField,
  InventoryKind,
  RepeaterKind,
  TalentSource as TalentSourceValue,
} from "@/lib/roster-types";
import { seededCharacters } from "@/lib/seed-data";

export const characterInclude = {
  relationships: {
    orderBy: {
      order: "asc" as const,
    },
  },
  talents: {
    orderBy: {
      order: "asc" as const,
    },
  },
  weapons: {
    orderBy: {
      order: "asc" as const,
    },
  },
  gearItems: {
    orderBy: {
      order: "asc" as const,
    },
  },
  contacts: {
    orderBy: {
      order: "asc" as const,
    },
  },
};

type CharacterWithRelations = Prisma.CharacterGetPayload<{
  include: typeof characterInclude;
}>;

const stringFields = new Set<CharacterScalarField>([
  "name",
  "description",
  "background",
  "concept",
  "groupConcept",
  "icon",
  "personalProblem",
  "face",
  "clothing",
  "criticalInjuries",
  "notes",
  "myCabinDescription",
  "myCabinGear",
  "myCabinOther",
  "armorName",
  "armorComment",
]);

const skillFields = new Set<CharacterScalarField>([
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
]);

const attributeFields = new Set<CharacterScalarField>([
  "strength",
  "agility",
  "wits",
  "empathy",
]);

const originCultureFieldValues = new Set<string>(originCultureValues);
const originSystemFieldValues = new Set<string>(originSystemValues);
const upbringingFieldValues = new Set<string>(upbringingValues);

export function serializeCharacter(character: CharacterWithRelations): CharacterRecord {
  return {
    id: character.id,
    name: character.name,
    description: character.description,
    background: character.background,
    originCulture: character.originCulture,
    originSystem: character.originSystem,
    upbringing: character.upbringing,
    concept: character.concept,
    groupConcept: character.groupConcept,
    icon: character.icon,
    reputation: character.reputation,
    personalProblem: character.personalProblem,
    face: character.face,
    clothing: character.clothing,
    portraitPath: character.portraitPath,
    strength: character.strength,
    agility: character.agility,
    wits: character.wits,
    empathy: character.empathy,
    maxHitPoints: character.maxHitPoints,
    currentHitPoints: character.currentHitPoints,
    maxMindPoints: character.maxMindPoints,
    currentMindPoints: character.currentMindPoints,
    radiation: character.radiation,
    experience: character.experience,
    criticalInjuries: character.criticalInjuries,
    notes: character.notes,
    myCabinDescription: character.myCabinDescription,
    myCabinGear: character.myCabinGear,
    myCabinOther: character.myCabinOther,
    birr: character.birr,
    armorName: character.armorName,
    armorRating: character.armorRating,
    armorComment: character.armorComment,
    dexterity: character.dexterity,
    force: character.force,
    infiltration: character.infiltration,
    manipulation: character.manipulation,
    meleeCombat: character.meleeCombat,
    observation: character.observation,
    rangedCombat: character.rangedCombat,
    survival: character.survival,
    command: character.command,
    culture: character.culture,
    dataDjinn: character.dataDjinn,
    medicurgy: character.medicurgy,
    mysticPowers: character.mysticPowers,
    pilot: character.pilot,
    science: character.science,
    technology: character.technology,
    relationships: character.relationships.map((relationship) => ({
      id: relationship.id,
      order: relationship.order,
      targetName: relationship.targetName,
      description: relationship.description,
      isBuddy: relationship.isBuddy,
    })),
    talents: character.talents.map((talent) => ({
      id: talent.id,
      order: talent.order,
      name: talent.name,
      source: talent.source,
      notes: talent.notes,
    })),
    weapons: character.weapons.map((weapon) => ({
      id: weapon.id,
      order: weapon.order,
      presetId: weapon.presetId,
      name: weapon.name,
      bonus: weapon.bonus,
      initiative: weapon.initiative,
      damage: weapon.damage,
      crit: weapon.crit,
      range: weapon.range,
      comments: weapon.comments,
      reloads: weapon.reloads,
    })),
    gearItems: character.gearItems.map((item) => ({
      id: item.id,
      order: item.order,
      presetId: item.presetId,
      name: item.name,
      bonus: item.bonus,
      comment: item.comment,
      encumbranceUnits: item.encumbranceUnits,
      isTiny: item.isTiny,
    })),
    contacts: character.contacts.map((contact) => ({
      id: contact.id,
      order: contact.order,
      name: contact.name,
      concept: contact.concept,
      notes: contact.notes,
    })),
  };
}

async function getCharacterOrThrow(characterId: string, client: PrismaClient = prisma) {
  const character = await client.character.findUnique({
    where: {
      id: characterId,
    },
    include: characterInclude,
  });

  if (!character) {
    throw new Error(`Character ${characterId} not found.`);
  }

  return character;
}

async function getOtherCharacterNames(
  characterId: string,
  client: PrismaClient = prisma,
) {
  const otherCharacters = await client.character.findMany({
    where: {
      id: {
        not: characterId,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      name: true,
    },
  });

  return otherCharacters.map((character) => character.name);
}

async function normalizeRelationshipTargetName(
  characterId: string,
  targetName: string,
  client: PrismaClient = prisma,
  relationshipIdToIgnore?: string,
) {
  const trimmed = targetName.trim();

  if (!trimmed) {
    return "";
  }

  const otherCharacterNames = await getOtherCharacterNames(characterId, client);

  if (!otherCharacterNames.includes(trimmed)) {
    throw new Error("Relationships can only point to other current sheets.");
  }

  const duplicateRelationship = await client.characterRelationship.findFirst({
    where: {
      characterId,
      targetName: trimmed,
      ...(relationshipIdToIgnore
        ? {
            id: {
              not: relationshipIdToIgnore,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (duplicateRelationship) {
    throw new Error(`${trimmed} already has a relationship row.`);
  }

  return trimmed;
}

async function clearInvalidBuddySelections(client: PrismaClient = prisma) {
  const characters = await client.character.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (characters.length === 0) {
    return;
  }

  const validNamesByCharacterId = new Map(
    characters.map((character) => [
      character.id,
      new Set(
        characters
          .filter((candidate) => candidate.id !== character.id)
          .map((candidate) => candidate.name),
      ),
    ]),
  );

  const buddyRelationships = await client.characterRelationship.findMany({
    where: {
      isBuddy: true,
    },
    select: {
      id: true,
      characterId: true,
      targetName: true,
    },
  });

  const invalidBuddyIds = buddyRelationships
    .filter((relationship) => {
      const validTargetNames = validNamesByCharacterId.get(relationship.characterId);
      return !validTargetNames?.has(relationship.targetName);
    })
    .map((relationship) => relationship.id);

  if (invalidBuddyIds.length > 0) {
    await client.characterRelationship.updateMany({
      where: {
        id: {
          in: invalidBuddyIds,
        },
      },
      data: {
        isBuddy: false,
      },
    });
  }
}

async function createSeedCharacter(
  sample: (typeof seededCharacters)[number],
  client: PrismaClient,
) {
  const derived = applyDerivedStats({
    strength: sample.strength,
    agility: sample.agility,
    wits: sample.wits,
    empathy: sample.empathy,
    currentHitPoints: sample.currentHitPoints,
    currentMindPoints: sample.currentMindPoints,
  });

  return client.character.create({
    data: {
      name: sample.name,
      description: sample.description,
      background: sample.background,
      originCulture: sample.originCulture,
      originSystem: sample.originSystem,
      upbringing: sample.upbringing,
      concept: sample.concept,
      groupConcept: sample.groupConcept,
      icon: sample.icon,
      reputation: sample.reputation,
      personalProblem: sample.personalProblem,
      face: sample.face,
      clothing: sample.clothing,
      strength: sample.strength,
      agility: sample.agility,
      wits: sample.wits,
      empathy: sample.empathy,
      maxHitPoints: derived.maxHitPoints,
      currentHitPoints: derived.currentHitPoints,
      maxMindPoints: derived.maxMindPoints,
      currentMindPoints: derived.currentMindPoints,
      radiation: sample.radiation,
      experience: sample.experience,
      criticalInjuries: sample.criticalInjuries,
      notes: sample.notes,
      myCabinDescription: sample.myCabinDescription,
      myCabinGear: sample.myCabinGear,
      myCabinOther: sample.myCabinOther,
      birr: sample.birr,
      armorName: sample.armorName,
      armorRating: sample.armorRating,
      armorComment: sample.armorComment,
      dexterity: sample.dexterity,
      force: sample.force,
      infiltration: sample.infiltration,
      manipulation: sample.manipulation,
      meleeCombat: sample.meleeCombat,
      observation: sample.observation,
      rangedCombat: sample.rangedCombat,
      survival: sample.survival,
      command: sample.command,
      culture: sample.culture,
      dataDjinn: sample.dataDjinn,
      medicurgy: sample.medicurgy,
      mysticPowers: sample.mysticPowers,
      pilot: sample.pilot,
      science: sample.science,
      technology: sample.technology,
      relationships: {
        create: sample.relationships,
      },
      talents: {
        create: sample.talents.map((talent) => ({
          ...talent,
          source: talent.source,
        })),
      },
      weapons: {
        create: sample.weapons,
      },
      gearItems: {
        create: sample.gearItems,
      },
      contacts: {
        create: sample.contacts,
      },
    },
    include: characterInclude,
  });
}

export async function seedRosterIfEmpty(client: PrismaClient = prisma) {
  const count = await client.character.count();

  if (count > 0) {
    return;
  }

  for (const sample of seededCharacters) {
    await createSeedCharacter(sample, client);
  }
}

export async function getRoster(client: PrismaClient = prisma) {
  await seedRosterIfEmpty(client);
  await clearInvalidBuddySelections(client);

  const characters = await client.character.findMany({
    include: characterInclude,
    orderBy: {
      createdAt: "asc",
    },
  });

  return characters.map(serializeCharacter);
}

function getDefaultCharacterName(sequence: number) {
  return `New Explorer ${sequence}`;
}

function getBlankCharacterData(sequence: number): Prisma.CharacterCreateInput {
  const base = {
    strength: 2,
    agility: 2,
    wits: 2,
    empathy: 2,
    currentHitPoints: 4,
    currentMindPoints: 4,
  };
  const derived = applyDerivedStats(base);

  return {
    name: getDefaultCharacterName(sequence),
    description: "A fresh dossier awaiting the Icons' favor.",
    ...base,
    maxHitPoints: derived.maxHitPoints,
    currentHitPoints: derived.currentHitPoints,
    maxMindPoints: derived.maxMindPoints,
    currentMindPoints: derived.currentMindPoints,
  };
}

export async function createCharacter(client: PrismaClient = prisma) {
  const count = await client.character.count();
  const character = await client.character.create({
    data: getBlankCharacterData(count + 1),
    include: characterInclude,
  });

  return serializeCharacter(character);
}

export async function renameCharacter(characterId: string, name: string, client: PrismaClient = prisma) {
  const trimmed = name.trim();
  const existingCharacter = await client.character.findUnique({
    where: {
      id: characterId,
    },
    select: {
      name: true,
    },
  });

  if (!existingCharacter) {
    throw new Error(`Character ${characterId} not found.`);
  }

  const nextName = trimmed.length > 0 ? trimmed : "Unnamed Horizoner";

  const [, character] = await client.$transaction([
    client.characterRelationship.updateMany({
      where: {
        targetName: existingCharacter.name,
      },
      data: {
        targetName: nextName,
      },
    }),
    client.character.update({
      where: {
        id: characterId,
      },
      data: {
        name: nextName,
      },
      include: characterInclude,
    }),
  ]);

  return serializeCharacter(character);
}

export async function deleteCharacter(characterId: string, client: PrismaClient = prisma) {
  const existingCharacter = await client.character.findUnique({
    where: {
      id: characterId,
    },
    select: {
      name: true,
    },
  });

  if (!existingCharacter) {
    throw new Error(`Character ${characterId} not found.`);
  }

  await client.$transaction([
    client.characterRelationship.deleteMany({
      where: {
        targetName: existingCharacter.name,
      },
    }),
    client.character.delete({
      where: {
        id: characterId,
      },
    }),
  ]);

  const remaining = await client.character.findMany({
    include: characterInclude,
    orderBy: {
      createdAt: "asc",
    },
  });

  return remaining.map(serializeCharacter);
}

function parseIntegerValue(rawValue: string | number) {
  const parsed = typeof rawValue === "number" ? rawValue : Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalEnumValue<T extends string>(
  rawValue: string | number,
  allowedValues: Set<string>,
  fieldName: string,
) {
  const parsedValue = String(rawValue).trim();

  if (parsedValue.length === 0) {
    return null;
  }

  if (!allowedValues.has(parsedValue)) {
    throw new Error(`Unsupported ${fieldName}: ${parsedValue}`);
  }

  return parsedValue as T;
}

export async function updateCharacterField(
  characterId: string,
  field: CharacterScalarField,
  rawValue: string | number,
  client: PrismaClient = prisma,
) {
  const existing = await client.character.findUnique({
    where: {
      id: characterId,
    },
  });

  if (!existing) {
    throw new Error(`Character ${characterId} not found.`);
  }

  const data: Prisma.CharacterUpdateInput = {};

  if (stringFields.has(field)) {
    data[field] = typeof rawValue === "string" ? rawValue : String(rawValue);
  } else if (field === "originCulture") {
    data.originCulture = parseOptionalEnumValue<OriginCulture>(
      rawValue,
      originCultureFieldValues,
      "origin culture",
    );
  } else if (field === "originSystem") {
    data.originSystem = parseOptionalEnumValue<OriginSystem>(
      rawValue,
      originSystemFieldValues,
      "home system",
    );
  } else if (field === "upbringing") {
    data.upbringing = parseOptionalEnumValue<Upbringing>(
      rawValue,
      upbringingFieldValues,
      "upbringing",
    );
  } else if (attributeFields.has(field)) {
    const nextAttributes = {
      strength: existing.strength,
      agility: existing.agility,
      wits: existing.wits,
      empathy: existing.empathy,
      [field]: clampNumber(parseIntegerValue(rawValue), ATTRIBUTE_MIN, ATTRIBUTE_MAX),
    };

    const derived = applyDerivedStats({
      ...nextAttributes,
      currentHitPoints: existing.currentHitPoints,
      currentMindPoints: existing.currentMindPoints,
    });

    data[field] = nextAttributes[field];
    data.maxHitPoints = derived.maxHitPoints;
    data.currentHitPoints = derived.currentHitPoints;
    data.maxMindPoints = derived.maxMindPoints;
    data.currentMindPoints = derived.currentMindPoints;
  } else if (skillFields.has(field)) {
    data[field] = clampNumber(parseIntegerValue(rawValue), SKILL_MIN, SKILL_MAX);
  } else {
    const value = parseIntegerValue(rawValue);

    switch (field) {
      case "reputation":
        data.reputation = clampNumber(value, 0, 12);
        break;
      case "currentHitPoints":
        data.currentHitPoints = clampNumber(value, 0, existing.maxHitPoints);
        break;
      case "currentMindPoints":
        data.currentMindPoints = clampNumber(value, 0, existing.maxMindPoints);
        break;
      case "radiation":
        data.radiation = clampNumber(value, 0, RADIATION_MAX);
        break;
      case "experience":
        data.experience = Math.max(0, value);
        break;
      case "birr":
        data.birr = clampNumber(value, 0, 999999);
        break;
      case "armorRating":
        data.armorRating = clampNumber(value, 0, 12);
        break;
      default:
        throw new Error(`Unsupported character field update: ${field}`);
    }
  }

  const updated = await client.character.update({
    where: {
      id: characterId,
    },
    data,
    include: characterInclude,
  });

  return serializeCharacter(updated);
}

async function getNextOrder(
  characterId: string,
  kind: RepeaterKind,
  client: PrismaClient,
) {
  switch (kind) {
    case "relationship":
      return client.characterRelationship.count({ where: { characterId } });
    case "talent":
      return client.characterTalent.count({ where: { characterId } });
    case "weapon":
      return client.characterWeapon.count({ where: { characterId } });
    case "gear":
      return client.characterGearItem.count({ where: { characterId } });
    case "contact":
      return client.characterContact.count({ where: { characterId } });
    default:
      return 0;
  }
}

export async function createRepeaterItem(
  characterId: string,
  kind: Extract<RepeaterKind, "relationship" | "talent" | "contact">,
  options?: {
    relationshipTargetName?: string;
  },
  client: PrismaClient = prisma,
) {
  const order = (await getNextOrder(characterId, kind, client)) + 1;

  switch (kind) {
    case "relationship": {
      const targetName = await normalizeRelationshipTargetName(
        characterId,
        options?.relationshipTargetName ?? "",
        client,
      );

      await client.characterRelationship.create({
        data: {
          characterId,
          order,
          targetName,
        },
      });
    }
      break;
    case "talent":
      await client.characterTalent.create({
        data: {
          characterId,
          order,
          source: TalentSource.other,
        },
      });
      break;
    case "contact":
      await client.characterContact.create({
        data: {
          characterId,
          order,
        },
      });
      break;
  }

  return serializeCharacter(await getCharacterOrThrow(characterId, client));
}

export async function addInventoryPreset(
  characterId: string,
  kind: InventoryKind,
  presetId: string,
  client: PrismaClient = prisma,
) {
  const preset = inventoryCatalog.find(
    (entry) => entry.id === presetId && entry.kind === kind,
  );

  if (!preset) {
    throw new Error(`Preset ${presetId} is not available for ${kind}.`);
  }

  const order = (await getNextOrder(characterId, kind === "weapon" ? "weapon" : "gear", client)) + 1;

  if (kind === "weapon" && preset.kind === "weapon") {
    await client.characterWeapon.create({
      data: {
        characterId,
        order,
        presetId: preset.id,
        name: preset.label,
        bonus: preset.bonus,
        initiative: preset.initiative,
        damage: preset.damage,
        crit: preset.crit,
        range: preset.range,
        comments: preset.comments,
        reloads: preset.reloads,
      },
    });
  } else if (preset.kind !== "weapon") {
    await client.characterGearItem.create({
      data: {
        characterId,
        order,
        presetId: preset.id,
        name: preset.label,
        bonus: preset.bonus,
        comment: preset.comment,
        encumbranceUnits: preset.encumbranceUnits,
        isTiny: kind === "tiny",
      },
    });
  }

  return serializeCharacter(await getCharacterOrThrow(characterId, client));
}

export async function updateRepeaterField(
  kind: RepeaterKind,
  id: string,
  field: string,
  value: string | number,
  client: PrismaClient = prisma,
) {
  let characterId = "";

  switch (kind) {
    case "relationship": {
      const relationship = await client.characterRelationship.findUniqueOrThrow({
        where: { id },
      });
      characterId = relationship.characterId;
      const nextTargetName =
        field === "targetName"
          ? await normalizeRelationshipTargetName(
              relationship.characterId,
              String(value),
              client,
              relationship.id,
            )
          : relationship.targetName;
      await client.characterRelationship.update({
        where: { id },
        data: {
          ...(field === "targetName" ? { targetName: nextTargetName } : {}),
          ...(field === "description" ? { description: String(value) } : {}),
          ...(field === "targetName" && nextTargetName.length === 0
            ? { isBuddy: false }
            : {}),
        },
      });
      break;
    }
    case "talent": {
      const talent = await client.characterTalent.findUniqueOrThrow({
        where: { id },
      });
      characterId = talent.characterId;
      const nextSource =
        field === "source" ? (String(value) as TalentSourceValue) : talent.source;
      await client.characterTalent.update({
        where: { id },
        data: {
          ...(field === "name" ? { name: String(value) } : {}),
          ...(field === "notes" ? { notes: String(value) } : {}),
          ...(field === "source"
            ? {
                source: nextSource,
              }
            : {}),
        },
      });
      break;
    }
    case "weapon": {
      const weapon = await client.characterWeapon.findUniqueOrThrow({
        where: { id },
      });
      characterId = weapon.characterId;
      await client.characterWeapon.update({
        where: { id },
        data: {
          ...(field === "name" ? { name: String(value) } : {}),
          ...(field === "bonus"
            ? { bonus: clampNumber(parseIntegerValue(value), -2, 8) }
            : {}),
          ...(field === "initiative"
            ? { initiative: clampNumber(parseIntegerValue(value), -2, 8) }
            : {}),
          ...(field === "damage"
            ? { damage: clampNumber(parseIntegerValue(value), 0, 12) }
            : {}),
          ...(field === "crit" ? { crit: String(value) } : {}),
          ...(field === "range" ? { range: String(value) } : {}),
          ...(field === "comments" ? { comments: String(value) } : {}),
          ...(field === "reloads"
            ? { reloads: clampNumber(parseIntegerValue(value), 0, RELOAD_MAX) }
            : {}),
        },
      });
      break;
    }
    case "gear": {
      const item = await client.characterGearItem.findUniqueOrThrow({
        where: { id },
      });
      characterId = item.characterId;
      await client.characterGearItem.update({
        where: { id },
        data: {
          ...(field === "name" ? { name: String(value) } : {}),
          ...(field === "bonus" ? { bonus: String(value) } : {}),
          ...(field === "comment" ? { comment: String(value) } : {}),
          ...(field === "encumbranceUnits"
            ? { encumbranceUnits: clampNumber(parseIntegerValue(value), 0, 20) }
            : {}),
        },
      });
      break;
    }
    case "contact": {
      const contact = await client.characterContact.findUniqueOrThrow({
        where: { id },
      });
      characterId = contact.characterId;
      await client.characterContact.update({
        where: { id },
        data: {
          ...(field === "name" ? { name: String(value) } : {}),
          ...(field === "concept" ? { concept: String(value) } : {}),
          ...(field === "notes" ? { notes: String(value) } : {}),
        },
      });
      break;
    }
  }

  return serializeCharacter(await getCharacterOrThrow(characterId, client));
}

export async function deleteRepeaterItem(
  kind: RepeaterKind,
  id: string,
  client: PrismaClient = prisma,
) {
  let characterId = "";

  switch (kind) {
    case "relationship": {
      const relationship = await client.characterRelationship.findUniqueOrThrow({
        where: { id },
      });
      characterId = relationship.characterId;
      await client.characterRelationship.delete({
        where: { id },
      });
      break;
    }
    case "talent": {
      const talent = await client.characterTalent.findUniqueOrThrow({
        where: { id },
      });
      characterId = talent.characterId;
      await client.characterTalent.delete({
        where: { id },
      });
      break;
    }
    case "weapon": {
      const weapon = await client.characterWeapon.findUniqueOrThrow({
        where: { id },
      });
      characterId = weapon.characterId;
      await client.characterWeapon.delete({
        where: { id },
      });
      break;
    }
    case "gear": {
      const item = await client.characterGearItem.findUniqueOrThrow({
        where: { id },
      });
      characterId = item.characterId;
      await client.characterGearItem.delete({
        where: { id },
      });
      break;
    }
    case "contact": {
      const contact = await client.characterContact.findUniqueOrThrow({
        where: { id },
      });
      characterId = contact.characterId;
      await client.characterContact.delete({
        where: { id },
      });
      break;
    }
  }

  return serializeCharacter(await getCharacterOrThrow(characterId, client));
}

export async function setBuddy(
  characterId: string,
  relationshipId: string,
  client: PrismaClient = prisma,
) {
  const relationship = await client.characterRelationship.findUniqueOrThrow({
    where: {
      id: relationshipId,
    },
  });

  if (relationship.characterId !== characterId) {
    throw new Error("Buddy selection must stay on the active sheet.");
  }

  if (!relationship.targetName) {
    throw new Error("Pick another current sheet before marking a buddy.");
  }

  await normalizeRelationshipTargetName(
    relationship.characterId,
    relationship.targetName,
    client,
    relationship.id,
  );

  await client.$transaction([
    client.characterRelationship.updateMany({
      where: {
        characterId,
      },
      data: {
        isBuddy: false,
      },
    }),
    client.characterRelationship.update({
      where: {
        id: relationshipId,
      },
      data: {
        isBuddy: true,
      },
    }),
  ]);

  return serializeCharacter(await getCharacterOrThrow(characterId, client));
}

export async function updatePortraitPath(
  characterId: string,
  portraitPath: string | null,
  client: PrismaClient = prisma,
) {
  const updated = await client.character.update({
    where: {
      id: characterId,
    },
    data: {
      portraitPath,
    },
    include: characterInclude,
  });

  return serializeCharacter(updated);
}
