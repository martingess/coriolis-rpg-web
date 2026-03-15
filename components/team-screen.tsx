"use client";

import { useEffect, useState } from "react";

import {
  SavableNumberField,
  SavableSelectField,
  SavableTextField,
  SectionCard,
} from "@/components/field-controls";
import type { CharacterRecord } from "@/lib/roster-types";
import {
  groupConceptValues,
  groupTalentOptionsByConcept,
  patronSuggestionsByConcept,
  teamCrewRoleDescriptions,
  teamCrewRoleLabels,
  teamCrewRoleValues,
  teamFactionStanceLabels,
  teamFactionStanceValues,
  teamNoteTagLabels,
  teamNoteTagValues,
  trustLevelLabels,
} from "@/lib/team-types";
import type {
  GroupConcept,
  TeamCrewRole,
  TeamRecord,
} from "@/lib/team-types";

const teamQuickNavSections = [
  { id: "team-identity", label: "Team Story", eyebrow: "Bridge Dossier" },
  { id: "team-members", label: "Members", eyebrow: "Crew Grid" },
  { id: "team-roles", label: "Crew Roles", eyebrow: "Bridge Stations" },
  { id: "team-ship", label: "Ship", eyebrow: "Heart of the Crew" },
  { id: "team-mission", label: "Mission Board", eyebrow: "Current Arc" },
  { id: "team-factions", label: "Faction Ties", eyebrow: "Heat & Leverage" },
  { id: "team-timeline", label: "Timeline", eyebrow: "Major Events" },
  { id: "team-faces", label: "Known Faces", eyebrow: "Shared NPC Ledger" },
  { id: "team-notes", label: "Typed Notes", eyebrow: "Operational Memory" },
] as const;

type TeamQuickNavSectionId = (typeof teamQuickNavSections)[number]["id"];

const roleWeights: Record<
  TeamCrewRole,
  Array<{ field: keyof CharacterRecord; weight: number }>
> = {
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

const attributeSpotlightFields: Array<{
  field: keyof CharacterRecord;
  label: string;
}> = [
  { field: "strength", label: "Strength" },
  { field: "agility", label: "Agility" },
  { field: "wits", label: "Wits" },
  { field: "empathy", label: "Empathy" },
];

const skillSpotlightFields: Array<{
  field: keyof CharacterRecord;
  label: string;
}> = [
  { field: "observation", label: "Observation" },
  { field: "pilot", label: "Pilot" },
  { field: "manipulation", label: "Manipulation" },
  { field: "command", label: "Command" },
  { field: "technology", label: "Technology" },
  { field: "rangedCombat", label: "Ranged Combat" },
];

type TeamScreenProps = {
  characters: CharacterRecord[];
  onCreateRepeater: (
    kind: "storyBeat" | "note" | "knownFace" | "factionTie",
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

function findBestCharacter(
  characters: CharacterRecord[],
  field: keyof CharacterRecord,
) {
  return characters.reduce<CharacterRecord | null>((best, character) => {
    if (!best) {
      return character;
    }

    const bestValue = Number(best[field] ?? 0);
    const currentValue = Number(character[field] ?? 0);

    if (currentValue > bestValue) {
      return character;
    }

    return best;
  }, null);
}

function scoreCharacterForRole(character: CharacterRecord, role: TeamCrewRole) {
  return roleWeights[role].reduce((total, weight) => {
    const value = Number(character[weight.field] ?? 0);
    return total + value * weight.weight;
  }, 0);
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
  const [activeSectionId, setActiveSectionId] = useState<TeamQuickNavSectionId>(
    teamQuickNavSections[0].id,
  );

  const charactersById = new Map(characters.map((character) => [character.id, character]));
  const rolesByCharacterId = new Map<string, string[]>();

  for (const crewPosition of team.crewPositions) {
    if (crewPosition.primaryCharacterId) {
      const roles = rolesByCharacterId.get(crewPosition.primaryCharacterId) ?? [];
      roles.push(teamCrewRoleLabels[crewPosition.role]);
      rolesByCharacterId.set(crewPosition.primaryCharacterId, roles);
    }
  }

  const groupConceptOptions = [
    { value: "", label: "Choose group concept" },
    ...groupConceptValues.map((value) => ({ value, label: value })),
  ];
  const availableGroupTalents =
    groupConceptValues.includes(team.groupConcept as GroupConcept)
      ? groupTalentOptionsByConcept[team.groupConcept as GroupConcept]
      : [];
  const groupTalentOptions = [
    {
      value: "",
      label: availableGroupTalents.length > 0 ? "Choose group talent" : "Pick a group concept first",
    },
    ...(!availableGroupTalents.includes(team.groupTalent) && team.groupTalent
      ? [{ value: team.groupTalent, label: `${team.groupTalent} (Custom)` }]
      : []),
    ...availableGroupTalents.map((value) => ({
      value,
      label: value,
    })),
  ];
  const stanceOptions = teamFactionStanceValues.map((value) => ({
    value,
    label: teamFactionStanceLabels[value],
  }));
  const noteTagOptions = teamNoteTagValues.map((value) => ({
    value,
    label: teamNoteTagLabels[value],
  }));
  const trustOptions = trustLevelLabels.map((label, index) => ({
    value: String(index),
    label: `${index} · ${label}`,
  }));
  const maxHeat = team.factionTies.reduce((highest, tie) => Math.max(highest, tie.heat), 0);
  const suggestionsCopy = joinSuggestions(team.groupConcept);
  const characterSelectOptions = [
    { value: "", label: "Unassigned" },
    ...characters.map((character) => ({
      value: character.id,
      label: character.name,
    })),
  ];

  useEffect(() => {
    const sectionNodes = teamQuickNavSections
      .map((section) => document.getElementById(section.id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    if (sectionNodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((entryA, entryB) => {
            const guideLine = window.innerHeight * 0.34;
            const distanceA = Math.abs(entryA.boundingClientRect.top - guideLine);
            const distanceB = Math.abs(entryB.boundingClientRect.top - guideLine);

            if (distanceA !== distanceB) {
              return distanceA - distanceB;
            }

            return entryA.boundingClientRect.top - entryB.boundingClientRect.top;
          });

        const nextSection = visibleEntries[0]?.target.id as TeamQuickNavSectionId | undefined;

        if (nextSection) {
          setActiveSectionId(nextSection);
        }
      },
      {
        rootMargin: "-24% 0px -58% 0px",
        threshold: [0.18, 0.3, 0.45, 0.62],
      },
    );

    sectionNodes.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [team.id]);

  function jumpToSection(sectionId: TeamQuickNavSectionId) {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    setActiveSectionId(sectionId);
    section.scrollIntoView({ behavior: "auto", block: "start" });
  }

  return (
    <div className="grid gap-4 xl:gap-5">
      <div className="coriolis-quick-nav">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <p className="text-[0.68rem] uppercase tracking-[0.36em] text-[var(--ink-faint)]">
              Team Nav
            </p>
            <div className="hidden h-px w-20 bg-[linear-gradient(90deg,rgba(201,160,80,0.3),transparent)] md:block" />
            <p className="hidden text-sm text-[var(--ink-muted)] md:block">
              Shared crew state, ship pressure, and the people orbiting your story.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.04)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
            <span className="h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_14px_rgba(201,160,80,0.5)]" />
            {teamQuickNavSections.find((section) => section.id === activeSectionId)?.label}
          </div>
        </div>

        <div className="coriolis-quick-nav__rail" aria-label="Team navigation">
          {teamQuickNavSections.map((section, index) => {
            const isActive = section.id === activeSectionId;

            return (
              <button
                key={section.id}
                type="button"
                className={`coriolis-quick-nav__button ${
                  isActive ? "coriolis-quick-nav__button--active" : ""
                }`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => jumpToSection(section.id)}
              >
                <span className="text-[0.62rem] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm uppercase tracking-[0.18em] text-[var(--paper)]">
                  {section.label}
                </span>
                <span className="text-[0.62rem] uppercase tracking-[0.24em] text-[var(--ink-muted)]">
                  {section.eyebrow}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SectionCard
        id="team-identity"
        title="Team Story"
        eyebrow="Bridge Dossier"
        className="xl:col-span-2"
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label="Crew Name"
                value={team.name}
                onCommit={(value) => onUpdateField("name", value)}
              />
              <SavableSelectField
                label="Group Concept"
                hint="A crew-level choice from Chapter 2."
                value={team.groupConcept}
                options={groupConceptOptions}
                onCommit={(value) => onUpdateField("groupConcept", value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SavableSelectField
                label="Group Talent"
                hint="Filtered to the active group concept when possible."
                value={team.groupTalent}
                options={groupTalentOptions}
                onCommit={(value) => onUpdateField("groupTalent", value)}
              />
              <SavableTextField
                label="Crew Manifesto"
                hint="One sharp line about what binds this crew together."
                value={team.manifesto}
                onCommit={(value) => onUpdateField("manifesto", value)}
              />
            </div>

            <SavableTextField
              label="Team Story"
              multiline
              rows={5}
              hint="Short collective story, origin, and current emotional temperature."
              value={team.story}
              onCommit={(value) => onUpdateField("story", value)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label="Patron"
                hint={
                  suggestionsCopy
                    ? `Rulebook ideas: ${suggestionsCopy}`
                    : "Pick a group concept first to surface rulebook patron ideas."
                }
                value={team.patron}
                onCommit={(value) => onUpdateField("patron", value)}
              />
              <SavableTextField
                label="Nemesis"
                hint={
                  suggestionsCopy
                    ? `Use the same list as a launchpad for crew enemies or rivals.`
                    : "Pick a group concept first to surface rulebook nemesis ideas."
                }
                value={team.nemesis}
                onCommit={(value) => onUpdateField("nemesis", value)}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="team-bridge-card">
              <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                Bridge Readout
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="team-metric">
                  <span className="team-metric__label">Crew</span>
                  <span className="team-metric__value">{characters.length}</span>
                </div>
                <div className="team-metric">
                  <span className="team-metric__label">Known Faces</span>
                  <span className="team-metric__value">{team.knownFaces.length}</span>
                </div>
                <div className="team-metric">
                  <span className="team-metric__label">Open Notes</span>
                  <span className="team-metric__value">{team.notes.length}</span>
                </div>
                <div className="team-metric">
                  <span className="team-metric__label">Max Heat</span>
                  <span className="team-metric__value">{maxHeat}</span>
                </div>
              </div>
              <div className="mt-5 rounded-[1.2rem] border border-[var(--line-soft)] bg-[color:rgba(8,12,19,0.55)] p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
                  Current Pressure
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {team.currentGoal || "No mission pinned yet. The bridge is quiet, which means trouble is probably only late."}
                </p>
              </div>
            </div>

            <div className="team-bridge-card">
              <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                Rulebook Anchor
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                Coriolis treats the crew as a group first: concept, ship, patron, nemesis, and jobs are all shared story pressure.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="team-members"
        title="Team Members"
        eyebrow="Crew Grid"
        className="xl:col-span-2"
      >
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                Best by Attributes
              </p>
              <div className="mt-4 grid gap-3">
                {attributeSpotlightFields.map((entry) => {
                  const character = findBestCharacter(characters, entry.field);

                  return (
                    <div key={entry.field} className="team-readout-row">
                      <span>{entry.label}</span>
                      <span>
                        {character ? `${character.name} · ${String(character[entry.field])}` : "No crew"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                Best by Skills
              </p>
              <div className="mt-4 grid gap-3">
                {skillSpotlightFields.map((entry) => {
                  const character = findBestCharacter(characters, entry.field);

                  return (
                    <div key={entry.field} className="team-readout-row">
                      <span>{entry.label}</span>
                      <span>
                        {character ? `${character.name} · ${String(character[entry.field])}` : "No crew"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                Best by Role
              </p>
              <div className="mt-4 grid gap-3">
                {teamCrewRoleValues.map((role) => {
                  const bestCandidate = characters.reduce<CharacterRecord | null>((best, character) => {
                    if (!best) {
                      return character;
                    }

                    return scoreCharacterForRole(character, role) >
                      scoreCharacterForRole(best, role)
                      ? character
                      : best;
                  }, null);

                  return (
                    <div key={role} className="team-readout-row">
                      <span>{teamCrewRoleLabels[role]}</span>
                      <span>{bestCandidate ? bestCandidate.name : "No crew"}</span>
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
                            {character.concept || "Concept pending"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="coriolis-chip px-3 py-2 text-[0.66rem]"
                          onClick={() => onOpenCharacter(character.id)}
                        >
                          Open Sheet
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-[var(--ink-muted)]">
                        <div className="team-readout-row">
                          <span>Icon</span>
                          <span>{character.icon || "Unknown"}</span>
                        </div>
                        <div className="team-readout-row">
                          <span>Reputation</span>
                          <span>{character.reputation}</span>
                        </div>
                        <div className="team-readout-row">
                          <span>Buddy</span>
                          <span>{buddy?.targetName ?? "Unmarked"}</span>
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
                      <span className="team-pill team-pill--muted">No primary crew role</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="team-roles"
        title="Crew Positions"
        eyebrow="Bridge Stations"
        className="xl:col-span-2"
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {team.crewPositions.map((crewPosition) => {
            const bestCandidate = characters.reduce<CharacterRecord | null>((best, character) => {
              if (!best) {
                return character;
              }

              return scoreCharacterForRole(character, crewPosition.role) >
                scoreCharacterForRole(best, crewPosition.role)
                ? character
                : best;
            }, null);

            return (
              <div key={crewPosition.id} className="team-role-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                      {teamCrewRoleLabels[crewPosition.role]}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                      {teamCrewRoleDescriptions[crewPosition.role]}
                    </p>
                  </div>
                  <div className="rounded-full border border-[var(--line-soft)] px-3 py-1 text-[0.64rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                    Best Fit: {bestCandidate?.name ?? "None"}
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  <SavableSelectField
                    label="Primary"
                    value={crewPosition.primaryCharacterId ?? ""}
                    options={characterSelectOptions}
                    onCommit={(value) =>
                      onUpdateRepeater("crewPosition", crewPosition.id, "primaryCharacterId", value)
                    }
                  />
                  <SavableSelectField
                    label="Backup"
                    value={crewPosition.backupCharacterId ?? ""}
                    options={characterSelectOptions}
                    onCommit={(value) =>
                      onUpdateRepeater("crewPosition", crewPosition.id, "backupCharacterId", value)
                    }
                  />
                  <SavableTextField
                    label="Station Notes"
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

      <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
        <SectionCard id="team-ship" title="Ship" eyebrow="Heart of the Crew">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label="Ship Name"
                value={team.shipName}
                onCommit={(value) => onUpdateField("shipName", value)}
              />
              <SavableTextField
                label="Ship Type"
                hint="Courier, light freighter, gunship, salvage ship..."
                value={team.shipType}
                onCommit={(value) => onUpdateField("shipType", value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label="Ship Class"
                hint="Rulebook classes usually run from II to V for group ships."
                value={team.shipClass}
                onCommit={(value) => onUpdateField("shipClass", value)}
              />
              <SavableNumberField
                label="Debt"
                hint="Track the remaining debt in birr."
                min={0}
                value={team.shipDebt}
                onCommit={(value) => onUpdateField("shipDebt", value)}
              />
            </div>
            <SavableTextField
              label="Ship Problem"
              value={team.shipProblem}
              onCommit={(value) => onUpdateField("shipProblem", value)}
            />
            <SavableTextField
              label="Upgrades"
              multiline
              rows={4}
              value={team.shipUpgrades}
              onCommit={(value) => onUpdateField("shipUpgrades", value)}
            />
          </div>
        </SectionCard>

        <SectionCard id="team-mission" title="Mission Board" eyebrow="Current Arc">
          <div className="grid gap-4">
            <SavableTextField
              label="Current Goal"
              value={team.currentGoal}
              onCommit={(value) => onUpdateField("currentGoal", value)}
            />
            <SavableTextField
              label="Next Lead"
              value={team.nextLead}
              onCommit={(value) => onUpdateField("nextLead", value)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <SavableTextField
                label="Reward"
                value={team.reward}
                onCommit={(value) => onUpdateField("reward", value)}
              />
              <SavableTextField
                label="Deadline"
                value={team.deadline}
                onCommit={(value) => onUpdateField("deadline", value)}
              />
            </div>
            <SavableTextField
              label="Unresolved Mystery"
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
        title="Faction Ties"
        eyebrow="Heat & Leverage"
        className="xl:col-span-2"
        actions={
          <button
            type="button"
            className="coriolis-chip"
            onClick={() => onCreateRepeater("factionTie")}
          >
            Add Tie
          </button>
        }
      >
        <div className="grid gap-4">
          {team.factionTies.length === 0 ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
              Track allies, enemies, faction heat, and who currently has leverage over the crew.
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
                  Remove
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_140px]">
                <SavableTextField
                  label="Faction"
                  value={tie.faction}
                  onCommit={(value) => onUpdateRepeater("factionTie", tie.id, "faction", value)}
                />
                <SavableSelectField
                  label="Stance"
                  value={tie.stance}
                  options={stanceOptions}
                  onCommit={(value) => onUpdateRepeater("factionTie", tie.id, "stance", value)}
                />
                <SavableNumberField
                  label="Heat"
                  min={0}
                  max={5}
                  value={tie.heat}
                  onCommit={(value) => onUpdateRepeater("factionTie", tie.id, "heat", value)}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <SavableTextField
                  label="Leverage Holder"
                  value={tie.leverageHolder}
                  onCommit={(value) =>
                    onUpdateRepeater("factionTie", tie.id, "leverageHolder", value)
                  }
                />
                <SavableTextField
                  label="Notes"
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

      <SectionCard
        id="team-timeline"
        title="Timeline"
        eyebrow="Major Events"
        className="xl:col-span-2"
        actions={
          <button
            type="button"
            className="coriolis-chip"
            onClick={() => onCreateRepeater("storyBeat")}
          >
            Add Beat
          </button>
        }
      >
        <div className="grid gap-4">
          {team.storyBeats.length === 0 ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
              Pin major jumps, betrayals, discoveries, and debts paid in blood or birr.
            </p>
          ) : null}
          {team.storyBeats.map((beat) => (
            <div key={beat.id} className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                  onClick={() => onRemoveRepeater("storyBeat", beat.id)}
                >
                  Remove
                </button>
              </div>
              <SavableTextField
                label="Event"
                value={beat.title}
                onCommit={(value) => onUpdateRepeater("storyBeat", beat.id, "title", value)}
              />
              <SavableTextField
                className="mt-4"
                label="What Changed"
                multiline
                rows={4}
                value={beat.description}
                onCommit={(value) =>
                  onUpdateRepeater("storyBeat", beat.id, "description", value)
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="team-faces"
        title="Known Faces"
        eyebrow="Shared NPC Ledger"
        className="xl:col-span-2"
        actions={
          <button
            type="button"
            className="coriolis-chip"
            onClick={() => onCreateRepeater("knownFace")}
          >
            Add Face
          </button>
        }
      >
        <div className="grid gap-4">
          {team.knownFaces.length === 0 ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
              Shared contacts live here. Add an avatar, track trust, then promote someone into the crew when the story turns.
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
                          alt={`${knownFace.name || "Known face"} portrait`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(knownFace.name || "Unknown Face")}</span>
                      )}
                    </div>

                    <label className="flex cursor-pointer items-center justify-center rounded-full border border-[var(--gold)] bg-[color:rgba(201,160,80,0.12)] px-4 py-3 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--paper)] transition hover:bg-[color:rgba(201,160,80,0.2)]">
                      Load Avatar
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
                        Open Crew Sheet
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="coriolis-chip"
                        onClick={() => onPromoteKnownFace(knownFace.id)}
                      >
                        Promote to Crew
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                      onClick={() => onRemoveRepeater("knownFace", knownFace.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="grid gap-4 md:grid-cols-2">
                      <SavableTextField
                        label="Name"
                        value={knownFace.name}
                        onCommit={(value) => onUpdateRepeater("knownFace", knownFace.id, "name", value)}
                      />
                      <SavableTextField
                        label="Concept"
                        value={knownFace.concept}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "concept", value)
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
                      <SavableTextField
                        label="Faction"
                        value={knownFace.faction}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "faction", value)
                        }
                      />
                      <SavableTextField
                        label="Last Seen"
                        value={knownFace.lastSeen}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "lastSeen", value)
                        }
                      />
                      <SavableSelectField
                        label="Trust"
                        value={String(knownFace.trustLevel)}
                        options={trustOptions}
                        onCommit={(value) =>
                          onUpdateRepeater("knownFace", knownFace.id, "trustLevel", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label="Notes"
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
        title="Typed Notes"
        eyebrow="Operational Memory"
        className="xl:col-span-2"
        actions={
          <button
            type="button"
            className="coriolis-chip"
            onClick={() => onCreateRepeater("note")}
          >
            Add Note
          </button>
        }
      >
        <div className="grid gap-4">
          {team.notes.length === 0 ? (
            <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
              Use typed notes instead of one giant scratchpad so mission clues, debt, ship concerns, and NPC loose ends stay searchable.
            </p>
          ) : null}
          {team.notes.map((note) => (
            <div key={note.id} className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="team-pill">{teamNoteTagLabels[note.tag]}</span>
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                  onClick={() => onRemoveRepeater("note", note.id)}
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <SavableSelectField
                  label="Tag"
                  value={note.tag}
                  options={noteTagOptions}
                  onCommit={(value) => onUpdateRepeater("note", note.id, "tag", value)}
                />
                <SavableTextField
                  label="Title"
                  value={note.title}
                  onCommit={(value) => onUpdateRepeater("note", note.id, "title", value)}
                />
              </div>
              <SavableTextField
                className="mt-4"
                label="Body"
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
