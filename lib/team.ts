import {
  TeamCrewRole as PrismaTeamCrewRole,
  TeamFactionStance as PrismaTeamFactionStance,
  TeamNoteTag as PrismaTeamNoteTag,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { characterInclude, createCharacter, serializeCharacter } from "@/lib/roster";
import { prisma } from "@/lib/prisma";
import {
  teamCrewRoleValues,
  teamFactionStanceValues,
  teamNoteTagValues,
} from "@/lib/team-types";
import type {
  TeamRecord,
  TeamRepeaterKind,
  TeamScalarField,
} from "@/lib/team-types";

const teamInclude = {
  crewPositions: {
    orderBy: {
      order: "asc" as const,
    },
  },
  storyBeats: {
    orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }],
  },
  notes: {
    orderBy: {
      order: "asc" as const,
    },
  },
  knownFaces: {
    orderBy: {
      order: "asc" as const,
    },
  },
  factionTies: {
    orderBy: {
      order: "asc" as const,
    },
  },
};

type TeamWithRelations = Prisma.TeamGetPayload<{
  include: typeof teamInclude;
}>;

const stringFields = new Set<TeamScalarField>([
  "name",
  "manifesto",
  "story",
  "groupConcept",
  "groupTalent",
  "patron",
  "nemesis",
  "shipName",
  "shipType",
  "shipClass",
  "shipProblem",
  "shipUpgrades",
  "currentGoal",
  "nextLead",
  "reward",
  "deadline",
  "unresolvedMystery",
]);

const noteTagSet = new Set<string>(teamNoteTagValues);
const factionStanceSet = new Set<string>(teamFactionStanceValues);
const crewRoleSet = new Set<string>(teamCrewRoleValues);

function parseIntegerValue(rawValue: string | number) {
  const parsed = typeof rawValue === "number" ? rawValue : Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function serializeTeam(team: TeamWithRelations): TeamRecord {
  return {
    id: team.id,
    name: team.name,
    manifesto: team.manifesto,
    story: team.story,
    groupConcept: team.groupConcept,
    groupTalent: team.groupTalent,
    patron: team.patron,
    nemesis: team.nemesis,
    shipName: team.shipName,
    shipType: team.shipType,
    shipClass: team.shipClass,
    shipProblem: team.shipProblem,
    shipDebt: team.shipDebt,
    shipUpgrades: team.shipUpgrades,
    currentGoal: team.currentGoal,
    nextLead: team.nextLead,
    reward: team.reward,
    deadline: team.deadline,
    unresolvedMystery: team.unresolvedMystery,
    crewPositions: team.crewPositions.map((position) => ({
      id: position.id,
      order: position.order,
      role: position.role,
      primaryCharacterId: position.primaryCharacterId,
      backupCharacterId: position.backupCharacterId,
      notes: position.notes,
    })),
    storyBeats: team.storyBeats.map((beat) => ({
      id: beat.id,
      order: beat.order,
      parentBeatId: beat.parentBeatId,
      title: beat.title,
      description: beat.description,
      createdAt: beat.createdAt.toISOString(),
    })),
    notes: team.notes.map((note) => ({
      id: note.id,
      order: note.order,
      tag: note.tag,
      title: note.title,
      body: note.body,
    })),
    knownFaces: team.knownFaces.map((face) => ({
      id: face.id,
      order: face.order,
      name: face.name,
      concept: face.concept,
      faction: face.faction,
      lastSeen: face.lastSeen,
      trustLevel: face.trustLevel,
      notes: face.notes,
      portraitPath: face.portraitPath,
      promotedCharacterId: face.promotedCharacterId,
    })),
    factionTies: team.factionTies.map((tie) => ({
      id: tie.id,
      order: tie.order,
      faction: tie.faction,
      stance: tie.stance,
      heat: tie.heat,
      leverageHolder: tie.leverageHolder,
      notes: tie.notes,
    })),
  };
}

function getDefaultCrewPositions(): Array<{
  order: number;
  role: PrismaTeamCrewRole;
}> {
  return [
    { order: 1, role: PrismaTeamCrewRole.captain },
    { order: 2, role: PrismaTeamCrewRole.engineer },
    { order: 3, role: PrismaTeamCrewRole.pilot },
    { order: 4, role: PrismaTeamCrewRole.sensorOperator },
    { order: 5, role: PrismaTeamCrewRole.gunner },
  ];
}

async function getTeamOrThrow(teamId: string, client: PrismaClient = prisma) {
  const team = await client.team.findUnique({
    where: {
      id: teamId,
    },
    include: teamInclude,
  });

  if (!team) {
    throw new Error(`Team ${teamId} not found.`);
  }

  return team;
}

async function ensureTeam(client: PrismaClient = prisma) {
  let team = await client.team.findFirst({
    include: teamInclude,
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!team) {
    team = await client.team.create({
      data: {
        crewPositions: {
          create: getDefaultCrewPositions(),
        },
      },
      include: teamInclude,
    });
  }

  if (!team) {
    throw new Error("Unable to initialize team dossier.");
  }

  const currentTeam = team;

  const missingRoles = teamCrewRoleValues.filter(
    (role) => !currentTeam.crewPositions.some((position) => position.role === role),
  );

  if (missingRoles.length > 0) {
    await Promise.all(
      missingRoles.map((role, index) =>
        client.teamCrewPosition.create({
          data: {
            teamId: currentTeam.id,
            order: currentTeam.crewPositions.length + index + 1,
            role: role as PrismaTeamCrewRole,
          },
        }),
      ),
    );

    team = await getTeamOrThrow(currentTeam.id, client);
  }

  return team ?? currentTeam;
}

function normalizeOptionalId(rawValue: string | number) {
  const nextId = String(rawValue).trim();
  return nextId || null;
}

async function getHighestOrder(
  teamId: string,
  kind: Exclude<TeamRepeaterKind, "crewPosition">,
  client: PrismaClient,
  input: {
    parentBeatId?: string | null;
  } = {},
) {
  switch (kind) {
    case "storyBeat": {
      const result = await client.teamStoryBeat.aggregate({
        where: {
          teamId,
          parentBeatId: input.parentBeatId ?? null,
        },
        _max: {
          order: true,
        },
      });

      return result._max.order ?? 0;
    }
    case "note": {
      const result = await client.teamNote.aggregate({
        where: { teamId },
        _max: {
          order: true,
        },
      });

      return result._max.order ?? 0;
    }
    case "knownFace": {
      const result = await client.teamKnownFace.aggregate({
        where: { teamId },
        _max: {
          order: true,
        },
      });

      return result._max.order ?? 0;
    }
    case "factionTie": {
      const result = await client.teamFactionTie.aggregate({
        where: { teamId },
        _max: {
          order: true,
        },
      });

      return result._max.order ?? 0;
    }
  }
}

async function parseOptionalCharacterId(
  rawValue: string | number,
  client: PrismaClient,
) {
  const nextId = normalizeOptionalId(rawValue);

  if (!nextId) {
    return null;
  }

  const character = await client.character.findUnique({
    where: {
      id: nextId,
    },
    select: {
      id: true,
    },
  });

  if (!character) {
    throw new Error("Crew assignments can only point at current character sheets.");
  }

  return character.id;
}

async function parseOptionalStoryBeatParentId(
  rawValue: string | number,
  teamId: string,
  client: PrismaClient,
  storyBeatId?: string,
) {
  const nextParentBeatId = normalizeOptionalId(rawValue);

  if (!nextParentBeatId) {
    return null;
  }

  if (storyBeatId && nextParentBeatId === storyBeatId) {
    throw new Error("A story point cannot be its own parent.");
  }

  const parentBeat = await client.teamStoryBeat.findUnique({
    where: {
      id: nextParentBeatId,
    },
    select: {
      id: true,
      teamId: true,
      parentBeatId: true,
    },
  });

  if (!parentBeat || parentBeat.teamId !== teamId) {
    throw new Error("Parent story points must belong to the same team timeline.");
  }

  if (!storyBeatId) {
    return parentBeat.id;
  }

  let currentAncestorId = parentBeat.parentBeatId;

  while (currentAncestorId) {
    if (currentAncestorId === storyBeatId) {
      throw new Error("A story point cannot be nested inside one of its own sub-points.");
    }

    const ancestorBeat = await client.teamStoryBeat.findUnique({
      where: {
        id: currentAncestorId,
      },
      select: {
        parentBeatId: true,
      },
    });

    currentAncestorId = ancestorBeat?.parentBeatId ?? null;
  }

  return parentBeat.id;
}

async function getUniqueCharacterName(baseName: string, client: PrismaClient) {
  const trimmed = baseName.trim();

  if (!trimmed) {
    return null;
  }

  const existing = await client.character.findMany({
    select: {
      name: true,
    },
  });
  const existingNames = new Set(existing.map((character) => character.name));

  if (!existingNames.has(trimmed)) {
    return trimmed;
  }

  let suffix = 2;
  let candidate = `${trimmed} ${suffix}`;

  while (existingNames.has(candidate)) {
    suffix += 1;
    candidate = `${trimmed} ${suffix}`;
  }

  return candidate;
}

export async function getTeam(client: PrismaClient = prisma) {
  const team = await ensureTeam(client);
  return serializeTeam(team);
}

export async function updateTeamField(
  teamId: string,
  field: TeamScalarField,
  rawValue: string | number,
  client: PrismaClient = prisma,
) {
  await ensureTeam(client);

  const data: Prisma.TeamUpdateInput = {};

  if (stringFields.has(field)) {
    data[field] = typeof rawValue === "string" ? rawValue : String(rawValue);
  } else if (field === "shipDebt") {
    data.shipDebt = Math.max(0, parseIntegerValue(rawValue));
  } else {
    throw new Error(`Unsupported team field update: ${field}`);
  }

  const updated = await client.team.update({
    where: {
      id: teamId,
    },
    data,
    include: teamInclude,
  });

  return serializeTeam(updated);
}

export async function createTeamRepeaterItem(
  teamId: string,
  kind: Exclude<TeamRepeaterKind, "crewPosition">,
  input: {
    parentBeatId?: string | null;
  } = {},
  client: PrismaClient = prisma,
) {
  await ensureTeam(client);
  const parentBeatId =
    kind === "storyBeat" && input.parentBeatId
      ? await parseOptionalStoryBeatParentId(input.parentBeatId, teamId, client)
      : null;
  const order =
    (await getHighestOrder(teamId, kind, client, {
      parentBeatId,
    })) + 1;

  switch (kind) {
    case "storyBeat":
      await client.teamStoryBeat.create({
        data: {
          teamId,
          order,
          parentBeatId,
        },
      });
      break;
    case "note":
      await client.teamNote.create({
        data: {
          teamId,
          order,
        },
      });
      break;
    case "knownFace":
      await client.teamKnownFace.create({
        data: {
          teamId,
          order,
        },
      });
      break;
    case "factionTie":
      await client.teamFactionTie.create({
        data: {
          teamId,
          order,
        },
      });
      break;
  }

  return serializeTeam(await getTeamOrThrow(teamId, client));
}

export async function updateTeamRepeaterField(
  kind: TeamRepeaterKind,
  id: string,
  field: string,
  value: string | number,
  client: PrismaClient = prisma,
) {
  let teamId = "";

  switch (kind) {
    case "crewPosition": {
      const crewPosition = await client.teamCrewPosition.findUniqueOrThrow({
        where: { id },
      });
      teamId = crewPosition.teamId;
      const nextPrimaryCharacterId =
        field === "primaryCharacterId"
          ? await parseOptionalCharacterId(value, client)
          : crewPosition.primaryCharacterId;
      const nextBackupCharacterId =
        field === "backupCharacterId"
          ? await parseOptionalCharacterId(value, client)
          : crewPosition.backupCharacterId;

      if (
        nextPrimaryCharacterId &&
        nextBackupCharacterId &&
        nextPrimaryCharacterId === nextBackupCharacterId
      ) {
        throw new Error("Primary and backup crew positions should not point to the same sheet.");
      }

      if (field === "role" && !crewRoleSet.has(String(value))) {
        throw new Error(`Unsupported crew role: ${String(value)}`);
      }

      await client.teamCrewPosition.update({
        where: { id },
        data: {
          ...(field === "role"
            ? {
                role: String(value) as PrismaTeamCrewRole,
              }
            : {}),
          ...(field === "primaryCharacterId"
            ? {
                primaryCharacterId: nextPrimaryCharacterId,
              }
            : {}),
          ...(field === "backupCharacterId"
            ? {
                backupCharacterId: nextBackupCharacterId,
              }
            : {}),
          ...(field === "notes"
            ? {
                notes: String(value),
              }
            : {}),
        },
      });
      break;
    }
    case "storyBeat": {
      const storyBeat = await client.teamStoryBeat.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          order: true,
          parentBeatId: true,
          teamId: true,
        },
      });
      teamId = storyBeat.teamId;
      const nextParentBeatId =
        field === "parentBeatId"
          ? await parseOptionalStoryBeatParentId(value, storyBeat.teamId, client, storyBeat.id)
          : storyBeat.parentBeatId;
      const didParentChange = nextParentBeatId !== storyBeat.parentBeatId;
      await client.teamStoryBeat.update({
        where: { id },
        data: {
          ...(field === "title" ? { title: String(value) } : {}),
          ...(field === "description" ? { description: String(value) } : {}),
          ...(field === "parentBeatId"
            ? {
                parentBeatId: nextParentBeatId,
                ...(didParentChange
                  ? {
                      order:
                        (await getHighestOrder(storyBeat.teamId, "storyBeat", client, {
                          parentBeatId: nextParentBeatId,
                        })) + 1,
                    }
                  : {}),
              }
            : {}),
        },
      });
      break;
    }
    case "note": {
      const note = await client.teamNote.findUniqueOrThrow({
        where: { id },
      });
      teamId = note.teamId;

      if (field === "tag" && !noteTagSet.has(String(value))) {
        throw new Error(`Unsupported note tag: ${String(value)}`);
      }

      await client.teamNote.update({
        where: { id },
        data: {
          ...(field === "tag"
            ? {
                tag: String(value) as PrismaTeamNoteTag,
              }
            : {}),
          ...(field === "title" ? { title: String(value) } : {}),
          ...(field === "body" ? { body: String(value) } : {}),
        },
      });
      break;
    }
    case "knownFace": {
      const knownFace = await client.teamKnownFace.findUniqueOrThrow({
        where: { id },
      });
      teamId = knownFace.teamId;
      await client.teamKnownFace.update({
        where: { id },
        data: {
          ...(field === "name" ? { name: String(value) } : {}),
          ...(field === "concept" ? { concept: String(value) } : {}),
          ...(field === "faction" ? { faction: String(value) } : {}),
          ...(field === "lastSeen" ? { lastSeen: String(value) } : {}),
          ...(field === "trustLevel"
            ? { trustLevel: Math.max(0, Math.min(5, parseIntegerValue(value))) }
            : {}),
          ...(field === "notes" ? { notes: String(value) } : {}),
        },
      });
      break;
    }
    case "factionTie": {
      const factionTie = await client.teamFactionTie.findUniqueOrThrow({
        where: { id },
      });
      teamId = factionTie.teamId;

      if (field === "stance" && !factionStanceSet.has(String(value))) {
        throw new Error(`Unsupported faction stance: ${String(value)}`);
      }

      await client.teamFactionTie.update({
        where: { id },
        data: {
          ...(field === "faction" ? { faction: String(value) } : {}),
          ...(field === "stance"
            ? {
                stance: String(value) as PrismaTeamFactionStance,
              }
            : {}),
          ...(field === "heat"
            ? { heat: Math.max(0, Math.min(5, parseIntegerValue(value))) }
            : {}),
          ...(field === "leverageHolder" ? { leverageHolder: String(value) } : {}),
          ...(field === "notes" ? { notes: String(value) } : {}),
        },
      });
      break;
    }
  }

  return serializeTeam(await getTeamOrThrow(teamId, client));
}

export async function deleteTeamRepeaterItem(
  kind: Exclude<TeamRepeaterKind, "crewPosition">,
  id: string,
  client: PrismaClient = prisma,
) {
  let teamId = "";

  switch (kind) {
    case "storyBeat": {
      const storyBeat = await client.teamStoryBeat.findUniqueOrThrow({
        where: { id },
      });
      teamId = storyBeat.teamId;
      await client.teamStoryBeat.delete({
        where: { id },
      });
      break;
    }
    case "note": {
      const note = await client.teamNote.findUniqueOrThrow({
        where: { id },
      });
      teamId = note.teamId;
      await client.teamNote.delete({
        where: { id },
      });
      break;
    }
    case "knownFace": {
      const knownFace = await client.teamKnownFace.findUniqueOrThrow({
        where: { id },
      });
      teamId = knownFace.teamId;
      await client.teamKnownFace.delete({
        where: { id },
      });
      break;
    }
    case "factionTie": {
      const factionTie = await client.teamFactionTie.findUniqueOrThrow({
        where: { id },
      });
      teamId = factionTie.teamId;
      await client.teamFactionTie.delete({
        where: { id },
      });
      break;
    }
  }

  return serializeTeam(await getTeamOrThrow(teamId, client));
}

export async function promoteKnownFaceToCharacter(
  knownFaceId: string,
  client: PrismaClient = prisma,
) {
  const knownFace = await client.teamKnownFace.findUniqueOrThrow({
    where: {
      id: knownFaceId,
    },
  });

  if (knownFace.promotedCharacterId) {
    const existingCharacter = await client.character.findUnique({
      where: {
        id: knownFace.promotedCharacterId,
      },
      include: characterInclude,
    });

    if (existingCharacter) {
      return {
        team: serializeTeam(await getTeamOrThrow(knownFace.teamId, client)),
        character: serializeCharacter(existingCharacter),
      };
    }
  }

  const blankCharacter = await createCharacter(client);
  const nextName =
    (await getUniqueCharacterName(knownFace.name, client)) ?? blankCharacter.name;
  const updatedCharacter = await client.character.update({
    where: {
      id: blankCharacter.id,
    },
    data: {
      name: nextName,
      concept: knownFace.concept,
      description: knownFace.faction
        ? `${knownFace.concept || "Known face"} with ties to ${knownFace.faction}.`
        : knownFace.concept || "A contact promoted from the crew's shared known-faces ledger.",
      background: knownFace.lastSeen
        ? `Last seen ${knownFace.lastSeen}.`
        : "Promoted from the team's known-faces ledger.",
      notes: knownFace.notes,
      portraitPath: knownFace.portraitPath,
    },
    include: characterInclude,
  });

  await client.teamKnownFace.update({
    where: {
      id: knownFace.id,
    },
    data: {
      promotedCharacterId: updatedCharacter.id,
    },
  });

  return {
    team: serializeTeam(await getTeamOrThrow(knownFace.teamId, client)),
    character: serializeCharacter(updatedCharacter),
  };
}

export async function updateKnownFacePortraitPath(
  knownFaceId: string,
  portraitPath: string | null,
  client: PrismaClient = prisma,
) {
  const knownFace = await client.teamKnownFace.update({
    where: {
      id: knownFaceId,
    },
    data: {
      portraitPath,
    },
  });

  return serializeTeam(await getTeamOrThrow(knownFace.teamId, client));
}
