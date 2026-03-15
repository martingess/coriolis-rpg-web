import type { CharacterRecord } from "@/lib/roster-types";
import type { TeamCrewRole } from "@/lib/team-types";

type WeightedRoleField = {
  field: keyof CharacterRecord;
  weight: number;
};

type BestCharacterMatch = {
  value: number;
  winners: CharacterRecord[];
};

const roleWeights: Record<TeamCrewRole, WeightedRoleField[]> = {
  captain: [
    { field: "command", weight: 4 },
    { field: "manipulation", weight: 3 },
    { field: "empathy", weight: 2 },
    { field: "observation", weight: 1 },
  ],
  engineer: [
    { field: "technology", weight: 4 },
    { field: "dataDjinn", weight: 2 },
    { field: "science", weight: 2 },
    { field: "wits", weight: 1 },
  ],
  pilot: [
    { field: "pilot", weight: 4 },
    { field: "agility", weight: 2 },
    { field: "observation", weight: 1 },
    { field: "survival", weight: 1 },
  ],
  sensorOperator: [
    { field: "observation", weight: 4 },
    { field: "dataDjinn", weight: 3 },
    { field: "wits", weight: 2 },
    { field: "culture", weight: 1 },
  ],
  gunner: [
    { field: "rangedCombat", weight: 4 },
    { field: "agility", weight: 2 },
    { field: "observation", weight: 2 },
    { field: "command", weight: 1 },
  ],
};

const roleTrainingFields: Record<TeamCrewRole, Array<keyof CharacterRecord>> = {
  captain: ["command", "manipulation", "observation"],
  engineer: ["technology", "dataDjinn", "science"],
  pilot: ["pilot", "observation", "survival"],
  sensorOperator: ["observation", "dataDjinn", "culture"],
  gunner: ["rangedCombat", "observation", "command"],
};

function getNumericFieldValue(character: CharacterRecord, field: keyof CharacterRecord) {
  return Number(character[field] ?? 0);
}

export function findBestCharactersByField(
  characters: CharacterRecord[],
  field: keyof CharacterRecord,
  minimumValue = Number.NEGATIVE_INFINITY,
): BestCharacterMatch | null {
  if (characters.length === 0) {
    return null;
  }

  const bestValue = characters.reduce((highest, character) => {
    return Math.max(highest, getNumericFieldValue(character, field));
  }, Number.NEGATIVE_INFINITY);

  if (bestValue < minimumValue) {
    return null;
  }

  return {
    value: bestValue,
    winners: characters.filter(
      (character) => getNumericFieldValue(character, field) === bestValue,
    ),
  };
}

export function scoreCharacterForRole(character: CharacterRecord, role: TeamCrewRole) {
  return roleWeights[role].reduce((total, { field, weight }) => {
    return total + getNumericFieldValue(character, field) * weight;
  }, 0);
}

export function hasRoleTraining(character: CharacterRecord, role: TeamCrewRole) {
  return roleTrainingFields[role].some(
    (field) => getNumericFieldValue(character, field) > 0,
  );
}

export function findBestCharactersForRole(
  characters: CharacterRecord[],
  role: TeamCrewRole,
): BestCharacterMatch | null {
  const trainedCharacters = characters.filter((character) =>
    hasRoleTraining(character, role),
  );

  if (trainedCharacters.length === 0) {
    return null;
  }

  const bestScore = trainedCharacters.reduce((highest, character) => {
    return Math.max(highest, scoreCharacterForRole(character, role));
  }, Number.NEGATIVE_INFINITY);

  return {
    value: bestScore,
    winners: trainedCharacters.filter(
      (character) => scoreCharacterForRole(character, role) === bestScore,
    ),
  };
}

export function formatBestMatchNames(winners: CharacterRecord[]) {
  return winners.map((character) => character.name).join(", ");
}
