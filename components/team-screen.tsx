"use client";

import { useId, useState } from "react";

import {
  SavableNumberField,
  SavableSelectField,
  SavableTextField,
  SectionCard,
} from "@/components/field-controls";
import { TeamStoryTimeline } from "@/components/team-story-timeline";
import {
  getAttributeLabel,
  getGroupConceptLabel,
  getSkillLabel,
  getTeamCrewRoleDescription,
  getTeamCrewRoleLabel,
  getTeamFactionStanceLabel,
  getTeamNoteTagLabel,
  getTrustLevelLabel,
} from "@/lib/localization";
import type { CharacterRecord } from "@/lib/roster-types";
import {
  groupConceptValues,
  groupTalentOptionsByConcept,
  patronSuggestionsByConcept,
  teamCrewRoleValues,
  teamFactionStanceValues,
  teamNoteTagValues,
} from "@/lib/team-types";
import {
  findBestCharactersByField,
  findBestCharactersBySkill,
  findBestCharactersForRole,
  formatBestMatchNames,
} from "@/lib/team-readouts";
import type {
  GroupConcept,
  TeamRecord,
} from "@/lib/team-types";
import { useLocaleText } from "@/lib/use-locale-text";

export type TeamQuickNavSectionId =
  | "team-identity"
  | "team-members"
  | "team-roles"
  | "team-ship"
  | "team-mission"
  | "team-factions"
  | "team-timeline"
  | "team-faces"
  | "team-notes";

export function getTeamQuickNavSections(
  lt: (english: string, ukrainian: string) => string,
) {
  return [
    { id: "team-identity", label: lt("Crew Story", "Історія команди"), eyebrow: lt("Bridge Dossier", "Місткове досьє") },
    { id: "team-members", label: lt("Crew Members", "Учасники"), eyebrow: lt("Crew Grid", "Сітка екіпажу") },
    { id: "team-roles", label: lt("Crew Roles", "Ролі екіпажу"), eyebrow: lt("Bridge Stations", "Місткові станції") },
    { id: "team-ship", label: lt("Ship", "Корабель"), eyebrow: lt("Heart of the Crew", "Серце екіпажу") },
    { id: "team-mission", label: lt("Mission Board", "Дошка місії"), eyebrow: lt("Current Arc", "Поточна арка") },
    { id: "team-factions", label: lt("Faction Ties", "Зв'язки з фракціями"), eyebrow: lt("Heat & Leverage", "Жар і важелі") },
    { id: "team-timeline", label: lt("Timeline", "Хронологія"), eyebrow: lt("Major Events", "Ключові події") },
    { id: "team-faces", label: lt("Known Faces", "Знайомі обличчя"), eyebrow: lt("Shared NPC Registry", "Спільний реєстр NPC") },
    { id: "team-notes", label: lt("Structured Notes", "Структуровані нотатки"), eyebrow: lt("Operational Memory", "Оперативна пам'ять") },
  ] as const;
}

const attributeSpotlightFields: Array<{
  field: keyof CharacterRecord;
}> = [
  { field: "strength" },
  { field: "agility" },
  { field: "wits" },
  { field: "empathy" },
];

type SkillReadoutField = Extract<
  keyof CharacterRecord,
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
>;

const previewSkillReadoutFields: SkillReadoutField[] = [
  "observation",
  "pilot",
  "manipulation",
  "command",
  "technology",
  "rangedCombat",
];

const allSkillReadoutFields: SkillReadoutField[] = [
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
];

type TeamScreenProps = {
  characters: CharacterRecord[];
  onCreateRepeater: (
    kind: "storyBeat" | "note" | "knownFace" | "factionTie",
    options?: {
      parentBeatId?: string;
    },
  ) => void;
  onKnownFacePortraitUpload: (knownFaceId: string, file: File) => Promise<void> | void;
  onOpenCharacter: (characterId: string) => void;
  onPromoteKnownFace: (knownFaceId: string) => void;
  onRemoveRepeater: (
    kind: "storyBeat" | "note" | "knownFace" | "factionTie",
    id: string,
  ) => void;
  onUpdateField: (field: string, value: number | string) => void;
  onUpdateRepeater: (
    kind: "crewPosition" | "storyBeat" | "note" | "knownFace" | "factionTie",
    id: string,
    field: string,
    value: number | string,
  ) => void;
  team: TeamRecord;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function joinSuggestions(groupConcept: string) {
  if (!groupConceptValues.includes(groupConcept as GroupConcept)) {
    return null;
  }

  return patronSuggestionsByConcept[groupConcept as GroupConcept].join(" • ");
}

export function TeamScreen({
  characters,
  onCreateRepeater,
  onKnownFacePortraitUpload,
  onOpenCharacter,
  onPromoteKnownFace,
  onRemoveRepeater,
  onUpdateField,
  onUpdateRepeater,
  team,
}: TeamScreenProps) {
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const { lt } = useLocaleText();
  const skillsDialogTitleId = useId();
  const charactersById = new Map(characters.map((character) => [character.id, character]));
  const rolesByCharacterId = new Map<string, string[]>();

  for (const crewPosition of team.crewPositions) {
    if (crewPosition.primaryCharacterId) {
      const roles = rolesByCharacterId.get(crewPosition.primaryCharacterId) ?? [];
      roles.push(getTeamCrewRoleLabel(crewPosition.role));
      rolesByCharacterId.set(crewPosition.primaryCharacterId, roles);
    }
  }

  const groupConceptOptions = [
    { value: "", label: lt("Choose crew concept", "Оберіть концепт команди") },
    ...groupConceptValues.map((value) => ({ value, label: getGroupConceptLabel(value) })),
  ];
  const availableGroupTalents =
    groupConceptValues.includes(team.groupConcept as GroupConcept)
      ? groupTalentOptionsByConcept[team.groupConcept as GroupConcept]
      : [];
  const groupTalentOptions = [
    {
      value: "",
      label:
        availableGroupTalents.length > 0
          ? lt("Choose crew talent", "Оберіть талант команди")
          : lt("Choose a crew concept first", "Спочатку оберіть концепт команди"),
    },
    ...(!availableGroupTalents.includes(team.groupTalent) && team.groupTalent
      ? [{ value: team.groupTalent, label: lt(`${team.groupTalent} (custom)`, `${team.groupTalent} (власний)`) }]
      : []),
    ...availableGroupTalents.map((value) => ({
      value,
      label: value,
    })),
  ];
  const stanceOptions = teamFactionStanceValues.map((value) => ({
    value,
    label: getTeamFactionStanceLabel(value),
  }));
  const noteTagOptions = teamNoteTagValues.map((value) => ({
    value,
    label: getTeamNoteTagLabel(value),
  }));
  const trustOptions = Array.from({ length: 6 }, (_, index) => ({
    value: String(index),
    label: `${index} · ${getTrustLevelLabel(index)}`,
  }));
  const maxHeat = team.factionTies.reduce((highest, tie) => Math.max(highest, tie.heat), 0);
  const suggestionsCopy = joinSuggestions(team.groupConcept);
  const characterSelectOptions = [
    { value: "", label: lt("Unassigned", "Не призначено") },
    ...characters.map((character) => ({
      value: character.id,
      label: character.name,
    })),
  ];
  const skillReadoutMatches = new Map(
    allSkillReadoutFields.map((field) => [
      field,
      findBestCharactersBySkill(characters, field),
    ]),
  );
  const hasHiddenSkillReadouts =
    allSkillReadoutFields.length > previewSkillReadoutFields.length;

  function renderSkillReadout(field: SkillReadoutField) {
    const bestMatch = skillReadoutMatches.get(field);

    return (
      <div key={field} className="team-readout-row">
        <span>{getSkillLabel(field)}</span>
        <span>
          {bestMatch
            ? `${formatBestMatchNames(bestMatch.winners)} · ${bestMatch.value}`
            : characters.length > 0
              ? lt("No trained crew", "Немає підготовленого екіпажу")
              : lt("No crew", "Немає екіпажу")}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:gap-5">
      <SectionCard
        id="team-identity"
        title={lt("Crew Story", "Історія команди")}
        eyebrow={lt("Bridge Dossier", "Місткове досьє")}
        className="xl:col-span-2"
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label={lt("Crew Name", "Назва екіпажу")}
                value={team.name}
                onCommit={(value) => onUpdateField("name", value)}
              />
              <SavableSelectField
                label={lt("Crew Concept", "Концепт команди")}
                hint={lt("Shared choice from chapter 2.", "Груповий вибір із розділу 2.")}
                value={team.groupConcept}
                options={groupConceptOptions}
                onCommit={(value) => onUpdateField("groupConcept", value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SavableSelectField
                label={lt("Crew Talent", "Талант команди")}
                hint={lt(
                  "Filtered by the active crew concept when possible.",
                  "За можливості фільтрується за активним концептом команди.",
                )}
                value={team.groupTalent}
                options={groupTalentOptions}
                onCommit={(value) => onUpdateField("groupTalent", value)}
              />
              <SavableTextField
                label={lt("Crew Manifesto", "Маніфест екіпажу")}
                hint={lt(
                  "One sharp line about what holds this crew together.",
                  "Один влучний рядок про те, що тримає цю команду разом.",
                )}
                value={team.manifesto}
                onCommit={(value) => onUpdateField("manifesto", value)}
              />
            </div>

            <SavableTextField
              label={lt("Crew Story", "Історія команди")}
              multiline
              rows={5}
              hint={lt(
                "A short shared history, origin, and the crew's current emotional weather.",
                "Коротка спільна історія, походження й поточний емоційний стан команди.",
              )}
              value={team.story}
              onCommit={(value) => onUpdateField("story", value)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label={lt("Patron", "Патрон")}
                hint={
                  suggestionsCopy
                    ? lt(`Rulebook prompts: ${suggestionsCopy}`, `Ідеї з книги правил: ${suggestionsCopy}`)
                    : lt(
                        "Choose a crew concept first to reveal patron prompts from the rulebook.",
                        "Спочатку оберіть концепт команди, щоб побачити ідеї патрона з книги правил.",
                      )
                }
                value={team.patron}
                onCommit={(value) => onUpdateField("patron", value)}
              />
              <SavableTextField
                label={lt("Nemesis", "Немезида")}
                hint={
                  suggestionsCopy
                    ? lt(
                        "Use the same list as a springboard for enemies or rivals of the crew.",
                        "Використайте той самий список як відправну точку для ворогів або суперників команди.",
                      )
                    : lt(
                        "Choose a crew concept first to reveal nemesis prompts from the rulebook.",
                        "Спочатку оберіть концепт команди, щоб побачити ідеї немезиди з книги правил.",
                      )
                }
                value={team.nemesis}
                onCommit={(value) => onUpdateField("nemesis", value)}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="team-bridge-card">
              <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                {lt("Bridge Readout", "Містковий звіт")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="team-metric">
                  <span className="team-metric__label">{lt("Crew", "Екіпаж")}</span>
                  <span className="team-metric__value">{characters.length}</span>
                </div>
                <div className="team-metric">
                  <span className="team-metric__label">{lt("Known Faces", "Знайомі обличчя")}</span>
                  <span className="team-metric__value">{team.knownFaces.length}</span>
                </div>
                <div className="team-metric">
                  <span className="team-metric__label">{lt("Open Notes", "Відкриті нотатки")}</span>
                  <span className="team-metric__value">{team.notes.length}</span>
                </div>
                <div className="team-metric">
                  <span className="team-metric__label">{lt("Max Heat", "Макс. жар")}</span>
                  <span className="team-metric__value">{maxHeat}</span>
                </div>
              </div>
              <div className="mt-5 rounded-[1.2rem] border border-[var(--line-soft)] bg-[color:rgba(8,12,19,0.55)] p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
                  {lt("Current Pressure", "Поточний тиск")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {team.currentGoal ||
                    lt(
                      "No mission is pinned yet. The bridge is quiet, which usually means trouble is only running late.",
                      "Жодну місію ще не закріплено. На містку тихо, а це зазвичай означає, що проблеми просто запізнюються.",
                    )}
                </p>
              </div>
            </div>

            <div className="team-bridge-card">
              <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                {lt("Rulebook Anchor", "Опора на книгу правил")}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                {lt(
                  "In Coriolis, the crew is treated as a group first: concept, ship, patron, nemesis, and work all create shared story pressure.",
                  "У Coriolis екіпаж насамперед розглядається як група: концепт, корабель, патрон, немезида та робота створюють спільний сюжетний тиск.",
                )}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="team-members"
        title={lt("Crew Members", "Учасники команди")}
        eyebrow={lt("Crew Grid", "Сітка екіпажу")}
        className="xl:col-span-2"
      >
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                {lt("Best by Attributes", "Найкращі за атрибутами")}
              </p>
              <div className="mt-4 grid gap-3">
                {attributeSpotlightFields.map((entry) => {
                  const bestMatch = findBestCharactersByField(characters, entry.field);

                  return (
                    <div key={entry.field} className="team-readout-row">
                      <span>
                        {getAttributeLabel(
                          entry.field as Extract<
                            keyof CharacterRecord,
                            "strength" | "agility" | "wits" | "empathy"
                          >,
                        )}
                      </span>
                      <span>
                        {bestMatch
                          ? `${formatBestMatchNames(bestMatch.winners)} · ${bestMatch.value}`
                          : lt("No crew", "Немає екіпажу")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                {lt("Best by Skills", "Найкращі за навичками")}
              </p>
              <div className="mt-4 grid gap-3">
                {previewSkillReadoutFields.map(renderSkillReadout)}
              </div>
              {hasHiddenSkillReadouts ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="coriolis-chip"
                    onClick={() => setIsSkillsModalOpen(true)}
                  >
                    {lt("Show all", "Показати все")}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                {lt("Best by Role", "Найкращі за роллю")}
              </p>
              <div className="mt-4 grid gap-3">
                {teamCrewRoleValues.map((role) => {
                  const bestMatch = findBestCharactersForRole(characters, role);

                  return (
                    <div key={role} className="team-readout-row">
                      <span>{getTeamCrewRoleLabel(role)}</span>
                      <span>
                        {bestMatch
                          ? formatBestMatchNames(bestMatch.winners)
                          : characters.length > 0
                            ? lt("No trained crew", "Немає підготовленого екіпажу")
                            : lt("No crew", "Немає екіпажу")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => {
              const buddy = character.relationships.find((relationship) => relationship.isBuddy);
              const assignedRoles = rolesByCharacterId.get(character.id) ?? [];

              return (
                <div
                  key={character.id}
                  className="team-member-card"
                >
                  <div className="flex items-start gap-4">
                    <div className="team-avatar">
                      {character.portraitPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={character.portraitPath}
                          alt={`${character.name} portrait`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(character.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg text-[var(--paper)]">{character.name}</h3>
                          <p className="mt-1 text-sm text-[var(--ink-muted)]">
                            {character.concept || lt("Concept pending", "Концепт ще не вказано")}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="coriolis-chip px-3 py-2 text-[0.66rem]"
                          onClick={() => onOpenCharacter(character.id)}
                        >
                          {lt("Open Sheet", "Відкрити аркуш")}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-[var(--ink-muted)]">
                        <div className="team-readout-row">
                          <span>{lt("Icon", "Ікона")}</span>
                          <span>{character.icon || lt("Unknown", "Невідомо")}</span>
                        </div>
                        <div className="team-readout-row">
                          <span>{lt("Reputation", "Репутація")}</span>
                          <span>{character.reputation}</span>
                        </div>
                        <div className="team-readout-row">
                          <span>{lt("Buddy", "Напарник")}</span>
                          <span>{buddy?.targetName ?? lt("Unmarked", "Не позначено")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {assignedRoles.length > 0 ? (
                      assignedRoles.map((role) => (
                      <span key={`${character.id}-${role}`} className="team-pill">
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="team-pill team-pill--muted">{lt("No primary crew role", "Немає основної ролі в екіпажі")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isSkillsModalOpen ? (
          <div
            className="coriolis-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={skillsDialogTitleId}
            onClick={() => setIsSkillsModalOpen(false)}
          >
            <div
              className="coriolis-modal__dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="coriolis-modal__header">
                <div className="coriolis-modal__copy">
                  <p className="coriolis-modal__eyebrow">
                    {lt("Complete Crew Skill Grid", "Повна сітка навичок екіпажу")}
                  </p>
                  <h2 id={skillsDialogTitleId} className="coriolis-modal__title">
                    {lt("All Crew Skills", "Усі навички екіпажу")}
                  </h2>
                  <p className="coriolis-modal__description">
                    {lt(
                      "Review every Coriolis skill, including ties and untrained gaps, in one scrollable roster.",
                      "Переглядайте всі навички Coriolis, включно з нічиїми та прогалинами в підготовці, в одному прокручуваному списку.",
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => setIsSkillsModalOpen(false)}
                >
                  {lt("Close", "Закрити")}
                </button>
              </div>

              <div className="coriolis-modal__body">
                <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
                  <div className="grid gap-3">{allSkillReadoutFields.map(renderSkillReadout)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        id="team-roles"
        title={lt("Crew Positions", "Позиції екіпажу")}
        eyebrow={lt("Bridge Stations", "Місткові станції")}
        className="xl:col-span-2"
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {team.crewPositions.map((crewPosition) => {
            const bestMatch = findBestCharactersForRole(characters, crewPosition.role);

            return (
              <div key={crewPosition.id} className="team-role-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                      {getTeamCrewRoleLabel(crewPosition.role)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      {getTeamCrewRoleDescription(crewPosition.role)}
                    </p>
                  </div>
                  <div className="rounded-full border border-[var(--line-soft)] px-3 py-1 text-[0.64rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                    {lt("Best fit", "Найкраще пасує")}:{" "}
                    {bestMatch
                      ? formatBestMatchNames(bestMatch.winners)
                      : characters.length > 0
                        ? lt("No trained crew", "Немає підготовленого екіпажу")
                        : lt("None", "Немає")}
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  <SavableSelectField
                    label={lt("Primary", "Основний")}
                    value={crewPosition.primaryCharacterId ?? ""}
                    options={characterSelectOptions}
                    onCommit={(value) =>
                      onUpdateRepeater("crewPosition", crewPosition.id, "primaryCharacterId", value)
                    }
                  />
                  <SavableSelectField
                    label={lt("Backup", "Резервний")}
                    value={crewPosition.backupCharacterId ?? ""}
                    options={characterSelectOptions}
                    onCommit={(value) =>
                      onUpdateRepeater("crewPosition", crewPosition.id, "backupCharacterId", value)
                    }
                  />
                  <SavableTextField
                    label={lt("Station Notes", "Нотатки по станції")}
                    value={crewPosition.notes}
                    multiline
                    rows={3}
                    onCommit={(value) =>
                      onUpdateRepeater("crewPosition", crewPosition.id, "notes", value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-5">
        <SectionCard
          id="team-ship"
          title={lt("Ship", "Корабель")}
          eyebrow={lt("Heart of the Crew", "Серце екіпажу")}
        >
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label={lt("Ship Name", "Назва корабля")}
                value={team.shipName}
                onCommit={(value) => onUpdateField("shipName", value)}
              />
              <SavableTextField
                label={lt("Ship Type", "Тип корабля")}
                hint={lt("Courier, light freighter, gunship, rescue vessel...", "Кур'єр, легкий вантажник, канонерка, рятувальне судно...")}
                value={team.shipType}
                onCommit={(value) => onUpdateField("shipType", value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label={lt("Ship Class", "Клас корабля")}
                hint={lt("Rulebook crew ships usually sit between class II and V.", "У книзі правил групові кораблі зазвичай мають клас від II до V.")}
                value={team.shipClass}
                onCommit={(value) => onUpdateField("shipClass", value)}
              />
              <SavableNumberField
                label={lt("Debt", "Борг")}
                hint={lt("Track the remaining debt in birr.", "Відстежуйте залишок боргу в біррах.")}
                min={0}
                value={team.shipDebt}
                onCommit={(value) => onUpdateField("shipDebt", value)}
              />
            </div>
            <SavableTextField
              label={lt("Ship Problem", "Проблема корабля")}
              value={team.shipProblem}
              onCommit={(value) => onUpdateField("shipProblem", value)}
            />
            <SavableTextField
              label={lt("Upgrades", "Покращення")}
              multiline
              rows={4}
              value={team.shipUpgrades}
              onCommit={(value) => onUpdateField("shipUpgrades", value)}
            />
          </div>
        </SectionCard>

        <SectionCard
          id="team-mission"
          title={lt("Mission Board", "Дошка місії")}
          eyebrow={lt("Current Arc", "Поточна арка")}
        >
          <div className="grid gap-4">
            <SavableTextField
              label={lt("Current Goal", "Поточна ціль")}
              value={team.currentGoal}
              onCommit={(value) => onUpdateField("currentGoal", value)}
            />
            <SavableTextField
              label={lt("Next Lead", "Наступна зачіпка")}
              value={team.nextLead}
              onCommit={(value) => onUpdateField("nextLead", value)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label={lt("Reward", "Винагорода")}
                value={team.reward}
                onCommit={(value) => onUpdateField("reward", value)}
              />
              <SavableTextField
                label={lt("Deadline", "Дедлайн")}
                value={team.deadline}
                onCommit={(value) => onUpdateField("deadline", value)}
              />
            </div>
            <SavableTextField
              label={lt("Unresolved Mystery", "Нерозкрита таємниця")}
              multiline
              rows={4}
              value={team.unresolvedMystery}
              onCommit={(value) => onUpdateField("unresolvedMystery", value)}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        id="team-factions"
        title={lt("Faction Ties", "Зв'язки з фракціями")}
        eyebrow={lt("Heat & Leverage", "Жар і важелі")}
        className="xl:col-span-2"
        actions={
          <button
            type="button"
            className="coriolis-chip"
            onClick={() => onCreateRepeater("factionTie")}
          >
            {lt("Add Tie", "Додати зв'язок")}
          </button>
        }
      >
        <div className="grid gap-4">
          {team.factionTies.length === 0 ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
              {lt(
                "Track allies, enemies, faction heat, and who currently holds leverage over the crew.",
                "Фіксуйте союзників, ворогів, рівень жару фракцій і те, хто зараз має важелі впливу на команду.",
              )}
            </p>
          ) : null}
          {team.factionTies.map((tie) => (
            <div key={tie.id} className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                  onClick={() => onRemoveRepeater("factionTie", tie.id)}
                >
                  {lt("Remove", "Прибрати")}
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_140px]">
                <SavableTextField
                  label={lt("Faction", "Фракція")}
                  value={tie.faction}
                  onCommit={(value) => onUpdateRepeater("factionTie", tie.id, "faction", value)}
                />
                <SavableSelectField
                  label={lt("Stance", "Позиція")}
                  value={tie.stance}
                  options={stanceOptions}
                  onCommit={(value) => onUpdateRepeater("factionTie", tie.id, "stance", value)}
                />
                <SavableNumberField
                  label={lt("Heat", "Жар")}
                  min={0}
                  max={5}
                  value={tie.heat}
                  onCommit={(value) => onUpdateRepeater("factionTie", tie.id, "heat", value)}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <SavableTextField
                  label={lt("Leverage Holder", "Хто тримає важіль")}
                  value={tie.leverageHolder}
                  onCommit={(value) =>
                    onUpdateRepeater("factionTie", tie.id, "leverageHolder", value)
                  }
                />
                <SavableTextField
                  label={lt("Notes", "Нотатки")}
                  multiline
                  rows={3}
                  value={tie.notes}
                  onCommit={(value) => onUpdateRepeater("factionTie", tie.id, "notes", value)}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <TeamStoryTimeline
        storyBeats={team.storyBeats}
        onCreateBeat={(parentBeatId) => onCreateRepeater("storyBeat", { parentBeatId })}
        onRemoveBeat={(beatId) => onRemoveRepeater("storyBeat", beatId)}
        onUpdateBeat={(beatId, field, value) =>
          onUpdateRepeater("storyBeat", beatId, field, value)
        }
      />

      <SectionCard
        id="team-faces"
        title={lt("Known Faces", "Знайомі обличчя")}
        eyebrow={lt("Shared NPC Registry", "Спільний реєстр NPC")}
        className="xl:col-span-2"
        actions={
          <button
            type="button"
            className="coriolis-chip"
            onClick={() => onCreateRepeater("knownFace")}
          >
            {lt("Add Face", "Додати обличчя")}
          </button>
        }
      >
        <div className="grid gap-4">
          {team.knownFaces.length === 0 ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
              {lt(
                "This is where shared contacts live. Add an avatar, track trust, and promote them into the crew when the story calls for it.",
                "Тут зберігаються спільні контакти. Додайте аватар, відстежуйте рівень довіри, а коли сюжет поверне, підвищте персонажа до екіпажу.",
              )}
            </p>
          ) : null}
          {team.knownFaces.map((knownFace) => {
            const promotedCharacter = knownFace.promotedCharacterId
              ? charactersById.get(knownFace.promotedCharacterId) ?? null
              : null;

            return (
              <div key={knownFace.id} className="team-known-face-card">
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex w-full max-w-[220px] flex-col gap-3">
                    <div className="team-avatar team-avatar--large">
                      {knownFace.portraitPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={knownFace.portraitPath}
                          alt={`${knownFace.name || lt("Known Face", "Знайоме обличчя")} ${lt("portrait", "портрет")}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(knownFace.name || lt("Unknown Face", "Невідоме обличчя"))}</span>
                      )}
                    </div>

                    <label className="flex cursor-pointer items-center justify-center rounded-full border border-[var(--gold)] bg-[color:rgba(201,160,80,0.12)] px-4 py-3 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--paper)] transition hover:bg-[color:rgba(201,160,80,0.2)]">
                      {lt("Upload Avatar", "Завантажити аватар")}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void onKnownFacePortraitUpload(knownFace.id, file);
                          }
                          event.target.value = "";
                        }}
                      />
                    </label>

                    {promotedCharacter ? (
                      <button
                        type="button"
                        className="coriolis-chip"
                        onClick={() => onOpenCharacter(promotedCharacter.id)}
                      >
                        {lt("Open Crew Sheet", "Відкрити аркуш екіпажу")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="coriolis-chip"
                        onClick={() => onPromoteKnownFace(knownFace.id)}
                      >
                        {lt("Promote to Crew", "Підвищити до екіпажу")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                      onClick={() => onRemoveRepeater("knownFace", knownFace.id)}
                    >
                      {lt("Remove", "Прибрати")}
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="grid gap-4 md:grid-cols-2">
                      <SavableTextField
                        label={lt("Name", "Ім'я")}
                        value={knownFace.name}
                        onCommit={(value) => onUpdateRepeater("knownFace", knownFace.id, "name", value)}
                      />
                      <SavableTextField
                        label={lt("Concept", "Концепт")}
                        value={knownFace.concept}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "concept", value)
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
                      <SavableTextField
                        label={lt("Faction", "Фракція")}
                        value={knownFace.faction}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "faction", value)
                        }
                      />
                      <SavableTextField
                        label={lt("Last Seen", "Де бачили востаннє")}
                        value={knownFace.lastSeen}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "lastSeen", value)
                        }
                      />
                      <SavableSelectField
                        label={lt("Trust", "Довіра")}
                        value={String(knownFace.trustLevel)}
                        options={trustOptions}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "trustLevel", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label={lt("Notes", "Нотатки")}
                      multiline
                      rows={4}
                      value={knownFace.notes}
                      onCommit={(value) => onUpdateRepeater("knownFace", knownFace.id, "notes", value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        id="team-notes"
        title={lt("Structured Notes", "Структуровані нотатки")}
        eyebrow={lt("Operational Memory", "Оперативна пам'ять")}
        className="xl:col-span-2"
        actions={
          <button
            type="button"
            className="coriolis-chip"
            onClick={() => onCreateRepeater("note")}
          >
            {lt("Add Note", "Додати нотатку")}
          </button>
        }
      >
        <div className="grid gap-4">
          {team.notes.length === 0 ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
              {lt(
                "Use structured notes instead of one giant scratchpad so mission prompts, debts, ship problems, and unfinished NPC threads stay searchable.",
                "Користуйтеся структурованими нотатками замість одного великого чернетника, щоб підказки місії, борги, проблеми корабля та незавершені лінії NPC залишалися придатними до пошуку.",
              )}
            </p>
          ) : null}
          {team.notes.map((note) => (
            <div key={note.id} className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="team-pill">{getTeamNoteTagLabel(note.tag)}</span>
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                  onClick={() => onRemoveRepeater("note", note.id)}
                >
                  {lt("Remove", "Прибрати")}
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <SavableSelectField
                  label={lt("Tag", "Тег")}
                  value={note.tag}
                  options={noteTagOptions}
                  onCommit={(value) => onUpdateRepeater("note", note.id, "tag", value)}
                />
                <SavableTextField
                  label={lt("Title", "Заголовок")}
                  value={note.title}
                  onCommit={(value) => onUpdateRepeater("note", note.id, "title", value)}
                />
              </div>
              <SavableTextField
                className="mt-4"
                label={lt("Body", "Текст")}
                multiline
                rows={4}
                value={note.body}
                onCommit={(value) => onUpdateRepeater("note", note.id, "body", value)}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
