"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";

import {
  addInventoryPresetAction,
  createCharacterAction,
  createRepeaterItemAction,
  deleteCharacterAction,
  deleteRepeaterItemAction,
  renameCharacterAction,
  setBuddyAction,
  updateCharacterFieldAction,
  updateRepeaterFieldAction,
} from "@/app/actions";
import {
  CounterTrack,
  SavableNumberField,
  SavableSelectField,
  SavableTextField,
  SectionCard,
} from "@/components/field-controls";
import {
  formatEncumbranceUnits,
  getEncumbranceCapacityUnits,
  getEncumbranceUsedUnits,
} from "@/lib/coriolis-rules";
import type {
  CharacterRecord,
  CharacterScalarField,
  CharacterWeaponRecord,
  InventoryKind,
  InventoryPreset,
  RepeaterKind,
} from "@/lib/roster-types";

type RosterAppProps = {
  initialCharacters: CharacterRecord[];
  inventoryCatalog: InventoryPreset[];
};

const attributeFields: Array<{
  field: CharacterScalarField;
  hint: string;
  label: string;
}> = [
  { field: "strength", label: "Strength", hint: "Raw power and physique" },
  { field: "agility", label: "Agility", hint: "Control, reflexes, motion" },
  { field: "wits", label: "Wits", hint: "Instinct, analysis, awareness" },
  { field: "empathy", label: "Empathy", hint: "Presence, empathy, persuasion" },
];

const generalSkills: Array<{ field: CharacterScalarField; label: string }> = [
  { field: "dexterity", label: "Dexterity" },
  { field: "force", label: "Force" },
  { field: "infiltration", label: "Infiltration" },
  { field: "manipulation", label: "Manipulation" },
  { field: "meleeCombat", label: "Melee Combat" },
  { field: "observation", label: "Observation" },
  { field: "rangedCombat", label: "Ranged Combat" },
  { field: "survival", label: "Survival" },
];

const advancedSkills: Array<{ field: CharacterScalarField; label: string }> = [
  { field: "command", label: "Command" },
  { field: "culture", label: "Culture" },
  { field: "dataDjinn", label: "Data Djinn" },
  { field: "medicurgy", label: "Medicurgy" },
  { field: "mysticPowers", label: "Mystic Powers" },
  { field: "pilot", label: "Pilot" },
  { field: "science", label: "Science" },
  { field: "technology", label: "Technology" },
];

const talentSourceOptions = [
  { value: "group", label: "Group" },
  { value: "concept", label: "Concept" },
  { value: "icon", label: "Icon" },
  { value: "other", label: "Other" },
];

const encumbrancePresets = [
  { value: "0", label: "Tiny" },
  { value: "1", label: "Light" },
  { value: "2", label: "Normal" },
  { value: "4", label: "Heavy" },
];

export function RosterApp({ initialCharacters, inventoryCatalog }: RosterAppProps) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [selectedId, setSelectedId] = useState(initialCharacters[0]?.id ?? null);
  const [drawerKind, setDrawerKind] = useState<InventoryKind | null>(null);
  const [notice, setNotice] = useState<string | null>(
    "Autosaves on blur. Chapter 2 starter gear is ready in the catalog drawer.",
  );
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const selectedCharacter =
    characters.find((character) => character.id === selectedId) ??
    characters[0] ??
    null;

  useEffect(() => {
    if (!selectedCharacter && characters[0]) {
      setSelectedId(characters[0].id);
    }
  }, [characters, selectedCharacter]);

  function patchCharacter(updatedCharacter: CharacterRecord) {
    setCharacters((currentCharacters) =>
      currentCharacters.map((character) =>
        character.id === updatedCharacter.id ? updatedCharacter : character,
      ),
    );
  }

  function runTask(task: () => Promise<void>, successMessage?: string) {
    startTransition(async () => {
      try {
        await task();
        if (successMessage) {
          setNotice(successMessage);
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  function commitField(field: CharacterScalarField, value: string | number) {
    if (!selectedCharacter) {
      return;
    }

    runTask(async () => {
      const updated = await updateCharacterFieldAction({
        characterId: selectedCharacter.id,
        field,
        value,
      });
      patchCharacter(updated);
    });
  }

  function commitRepeater(
    kind: RepeaterKind,
    id: string,
    field: string,
    value: string | number,
  ) {
    runTask(async () => {
      const updated = await updateRepeaterFieldAction({ kind, id, field, value });
      patchCharacter(updated);
    });
  }

  async function uploadPortrait(file: File) {
    if (!selectedCharacter) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/characters/${selectedCharacter.id}/portrait`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        character?: CharacterRecord;
        error?: string;
      };

      if (!response.ok || !payload.character) {
        throw new Error(payload.error ?? "Portrait upload failed.");
      }

      patchCharacter(payload.character);
      setNotice("Portrait updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Portrait upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  const gearItems = selectedCharacter
    ? selectedCharacter.gearItems.filter((item) => !item.isTiny)
    : [];
  const tinyItems = selectedCharacter
    ? selectedCharacter.gearItems.filter((item) => item.isTiny)
    : [];
  const encumbranceUsed = selectedCharacter
    ? getEncumbranceUsedUnits(gearItems)
    : 0;
  const encumbranceCapacity = selectedCharacter
    ? getEncumbranceCapacityUnits(selectedCharacter.strength)
    : 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--night)] text-[var(--ink)]">
      <div className="coriolis-stars pointer-events-none fixed inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-14 pt-4 md:px-6 lg:px-8">
        <header className="sticky top-4 z-30 mb-5 rounded-[1.7rem] border border-[var(--line-strong)] bg-[color:rgba(14,18,29,0.78)] px-4 py-4 shadow-[0_24px_80px_rgba(4,7,13,0.36)] backdrop-blur-xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <p className="text-[0.72rem] uppercase tracking-[0.34em] text-[var(--ink-faint)]">
                  Character Roster
                </p>
                <h1 className="font-display text-3xl uppercase tracking-[0.16em] text-[var(--paper)] md:text-4xl">
                  Coriolis Dossier
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => {
                    runTask(async () => {
                      const created = await createCharacterAction();
                      setCharacters((currentCharacters) => [...currentCharacters, created]);
                      setSelectedId(created.id);
                    }, "New sheet opened.");
                  }}
                >
                  New
                </button>
                <button
                  type="button"
                  className="coriolis-chip"
                  disabled={!selectedCharacter}
                  onClick={() => {
                    if (!selectedCharacter) {
                      return;
                    }

                    const nextName = window.prompt(
                      "Rename this sheet",
                      selectedCharacter.name,
                    );

                    if (nextName === null) {
                      return;
                    }

                    runTask(async () => {
                      const updated = await renameCharacterAction({
                        characterId: selectedCharacter.id,
                        name: nextName,
                      });
                      patchCharacter(updated);
                    }, "Sheet renamed.");
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="coriolis-chip coriolis-chip--danger"
                  disabled={!selectedCharacter}
                  onClick={() => {
                    if (!selectedCharacter) {
                      return;
                    }

                    const confirmed = window.confirm(
                      `Delete ${selectedCharacter.name}?`,
                    );

                    if (!confirmed) {
                      return;
                    }

                    runTask(async () => {
                      const remaining = await deleteCharacterAction(selectedCharacter.id);
                      setCharacters(remaining);
                      setSelectedId(remaining[0]?.id ?? null);
                    }, "Sheet removed.");
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {characters.map((character) => {
                const isActive = character.id === selectedCharacter?.id;

                return (
                  <button
                    key={character.id}
                    type="button"
                    className={`min-w-fit rounded-full border px-4 py-2 text-sm uppercase tracking-[0.18em] transition ${
                      isActive
                        ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
                        : "border-[var(--line-soft)] bg-[color:rgba(245,231,204,0.06)] text-[var(--ink-muted)] hover:border-[var(--line-strong)] hover:text-[var(--paper)]"
                    }`}
                    onClick={() => setSelectedId(character.id)}
                  >
                    {character.name}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-1 text-sm text-[var(--ink-muted)] md:flex-row md:items-center md:justify-between">
              <p>{notice}</p>
              <p>{isPending || isUploading ? "Synchronizing with the ship ledger..." : "Ready"}</p>
            </div>
          </div>
        </header>

        {selectedCharacter ? (
          <main className="grid gap-4 lg:grid-cols-2 xl:gap-5">
            <SectionCard
              title="Identity"
              eyebrow="Front Sheet"
              className="lg:col-span-2"
              actions={
                <div className="rounded-full border border-[var(--line-soft)] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                  Mobile first
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.05)] p-4">
                  <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[1.2rem] border border-[var(--line-soft)] bg-[radial-gradient(circle_at_top,_rgba(201,160,80,0.28),_rgba(19,24,36,0.2)_48%,_rgba(8,10,16,0.88)_100%)]">
                    {selectedCharacter.portraitPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedCharacter.portraitPath}
                        alt={`${selectedCharacter.name} portrait`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                        <div className="rounded-full border border-[var(--line-strong)] bg-[color:rgba(201,160,80,0.16)] px-5 py-4 font-display text-5xl uppercase tracking-[0.2em] text-[var(--paper)]">
                          {selectedCharacter.name
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0] ?? "")
                            .join("")}
                        </div>
                        <p className="text-sm text-[var(--ink-muted)]">
                          Load a portrait to turn the sheet into a proper station dossier.
                        </p>
                      </div>
                    )}
                  </div>

                  <label className="mt-4 flex cursor-pointer items-center justify-center rounded-full border border-[var(--gold)] bg-[color:rgba(201,160,80,0.12)] px-4 py-3 text-sm uppercase tracking-[0.24em] text-[var(--paper)] transition hover:bg-[color:rgba(201,160,80,0.2)]">
                    {isUploading ? "Uploading..." : "Load Image"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadPortrait(file);
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.1rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] px-3 py-3">
                      <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                        Encumbrance
                      </p>
                      <p className="mt-2 text-lg text-[var(--paper)]">
                        {encumbranceUsed}/{encumbranceCapacity}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">half-row units</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] px-3 py-3">
                      <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                        Vitality
                      </p>
                      <p className="mt-2 text-lg text-[var(--paper)]">
                        {selectedCharacter.currentHitPoints}/{selectedCharacter.maxHitPoints}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">hit points</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SavableTextField
                    label="Name"
                    value={selectedCharacter.name}
                    onCommit={(value) => commitField("name", value)}
                  />
                  <SavableTextField
                    label="Background"
                    value={selectedCharacter.background}
                    onCommit={(value) => commitField("background", value)}
                  />
                  <SavableTextField
                    label="Concept"
                    value={selectedCharacter.concept}
                    onCommit={(value) => commitField("concept", value)}
                  />
                  <SavableTextField
                    label="Icon"
                    value={selectedCharacter.icon}
                    onCommit={(value) => commitField("icon", value)}
                  />
                  <SavableTextField
                    label="Group Concept"
                    value={selectedCharacter.groupConcept}
                    onCommit={(value) => commitField("groupConcept", value)}
                  />
                  <SavableNumberField
                    label="Reputation"
                    min={0}
                    max={12}
                    value={selectedCharacter.reputation}
                    onCommit={(value) => commitField("reputation", value)}
                  />
                  <SavableTextField
                    className="md:col-span-2"
                    label="Description"
                    multiline
                    rows={3}
                    value={selectedCharacter.description}
                    onCommit={(value) => commitField("description", value)}
                  />
                  <SavableTextField
                    className="md:col-span-2"
                    label="Personal Problem"
                    multiline
                    rows={3}
                    value={selectedCharacter.personalProblem}
                    onCommit={(value) => commitField("personalProblem", value)}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Appearance" eyebrow="Presence">
              <div className="grid gap-4">
                <SavableTextField
                  label="Face"
                  multiline
                  rows={3}
                  value={selectedCharacter.face}
                  onCommit={(value) => commitField("face", value)}
                />
                <SavableTextField
                  label="Clothing"
                  multiline
                  rows={3}
                  value={selectedCharacter.clothing}
                  onCommit={(value) => commitField("clothing", value)}
                />
              </div>
            </SectionCard>

            <SectionCard title="Conditions" eyebrow="Trauma">
              <div className="grid gap-4">
                <CounterTrack
                  label={`Hit Points (max ${selectedCharacter.maxHitPoints})`}
                  max={selectedCharacter.maxHitPoints}
                  value={selectedCharacter.currentHitPoints}
                  onCommit={(value) => commitField("currentHitPoints", value)}
                />
                <CounterTrack
                  label={`Mind Points (max ${selectedCharacter.maxMindPoints})`}
                  max={selectedCharacter.maxMindPoints}
                  value={selectedCharacter.currentMindPoints}
                  onCommit={(value) => commitField("currentMindPoints", value)}
                />
                <CounterTrack
                  label="Radiation"
                  max={10}
                  value={selectedCharacter.radiation}
                  onCommit={(value) => commitField("radiation", value)}
                />
                <CounterTrack
                  label="Experience"
                  max={10}
                  value={selectedCharacter.experience}
                  onCommit={(value) => commitField("experience", value)}
                />
                <SavableTextField
                  label="Critical Injuries"
                  multiline
                  rows={4}
                  value={selectedCharacter.criticalInjuries}
                  onCommit={(value) => commitField("criticalInjuries", value)}
                />
              </div>
            </SectionCard>

            <SectionCard title="Attributes" eyebrow="Primary Stats">
              <div className="grid gap-4 sm:grid-cols-2">
                {attributeFields.map((attribute) => (
                  <SavableNumberField
                    key={attribute.field}
                    label={attribute.label}
                    hint={attribute.hint}
                    min={1}
                    max={5}
                    value={selectedCharacter[attribute.field] as number}
                    onCommit={(value) => commitField(attribute.field, value)}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Relationships"
              eyebrow="Buddy System"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => {
                    runTask(async () => {
                      const updated = await createRepeaterItemAction({
                        characterId: selectedCharacter.id,
                        kind: "relationship",
                      });
                      patchCharacter(updated);
                    }, "Relationship row added.");
                  }}
                >
                  Add Row
                </button>
              }
            >
              <div className="grid gap-4">
                {selectedCharacter.relationships.length === 0 ? (
                  <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                    No linked crew yet. Add a row for each ally, rival, or station ghost.
                  </p>
                ) : null}
                {selectedCharacter.relationships.map((relationship) => (
                  <div
                    key={relationship.id}
                    className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${
                          relationship.isBuddy
                            ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
                            : "border-[var(--line-soft)] text-[var(--ink-faint)]"
                        }`}
                        onClick={() => {
                          runTask(async () => {
                            const updated = await setBuddyAction({
                              characterId: selectedCharacter.id,
                              relationshipId: relationship.id,
                            });
                            patchCharacter(updated);
                          }, "Buddy updated.");
                        }}
                      >
                        {relationship.isBuddy ? "Buddy" : "Set Buddy"}
                      </button>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          runTask(async () => {
                            const updated = await deleteRepeaterItemAction({
                              kind: "relationship",
                              id: relationship.id,
                            });
                            patchCharacter(updated);
                          }, "Relationship removed.");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4">
                      <SavableTextField
                        label="PC / Contact"
                        value={relationship.targetName}
                        onCommit={(value) =>
                          commitRepeater("relationship", relationship.id, "targetName", value)
                        }
                      />
                      <SavableTextField
                        label="Relationship"
                        multiline
                        rows={3}
                        value={relationship.description}
                        onCommit={(value) =>
                          commitRepeater("relationship", relationship.id, "description", value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Skills" eyebrow="General & Advanced" className="lg:col-span-2">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  {generalSkills.map((skill) => (
                    <SavableNumberField
                      key={skill.field}
                      label={skill.label}
                      min={0}
                      max={5}
                      value={selectedCharacter[skill.field] as number}
                      onCommit={(value) => commitField(skill.field, value)}
                    />
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {advancedSkills.map((skill) => (
                    <SavableNumberField
                      key={skill.field}
                      label={skill.label}
                      min={0}
                      max={5}
                      value={selectedCharacter[skill.field] as number}
                      onCommit={(value) => commitField(skill.field, value)}
                    />
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Talents"
              eyebrow="Edge"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => {
                    runTask(async () => {
                      const updated = await createRepeaterItemAction({
                        characterId: selectedCharacter.id,
                        kind: "talent",
                      });
                      patchCharacter(updated);
                    }, "Talent row added.");
                  }}
                >
                  Add Talent
                </button>
              }
            >
              <div className="grid gap-4">
                {selectedCharacter.talents.map((talent) => (
                  <div
                    key={talent.id}
                    className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4"
                  >
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          runTask(async () => {
                            const updated = await deleteRepeaterItemAction({
                              kind: "talent",
                              id: talent.id,
                            });
                            patchCharacter(updated);
                          }, "Talent removed.");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                      <SavableTextField
                        label="Talent"
                        value={talent.name}
                        onCommit={(value) =>
                          commitRepeater("talent", talent.id, "name", value)
                        }
                      />
                      <SavableSelectField
                        label="Source"
                        value={talent.source}
                        options={talentSourceOptions}
                        onCommit={(value) =>
                          commitRepeater("talent", talent.id, "source", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label="Notes"
                      multiline
                      rows={3}
                      value={talent.notes}
                      onCommit={(value) =>
                        commitRepeater("talent", talent.id, "notes", value)
                      }
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Armor" eyebrow="Protection">
              <div className="grid gap-4 sm:grid-cols-2">
                <SavableTextField
                  label="Armor"
                  value={selectedCharacter.armorName}
                  onCommit={(value) => commitField("armorName", value)}
                />
                <SavableNumberField
                  label="Rating"
                  min={0}
                  max={12}
                  value={selectedCharacter.armorRating}
                  onCommit={(value) => commitField("armorRating", value)}
                />
                <SavableTextField
                  className="sm:col-span-2"
                  label="Comment"
                  multiline
                  rows={3}
                  value={selectedCharacter.armorComment}
                  onCommit={(value) => commitField("armorComment", value)}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Weapons"
              eyebrow="Loadout"
              className="lg:col-span-2"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => setDrawerKind("weapon")}
                >
                  Add From Catalog
                </button>
              }
            >
              <div className="grid gap-4">
                {selectedCharacter.weapons.length === 0 ? (
                  <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                    No weapons listed. Pull one from the catalog or add a custom profile.
                  </p>
                ) : null}
                {selectedCharacter.weapons.map((weapon) => (
                  <WeaponCard
                    key={weapon.id}
                    weapon={weapon}
                    onCommit={(field, value) => commitRepeater("weapon", weapon.id, field, value)}
                    onDelete={() => {
                      runTask(async () => {
                        const updated = await deleteRepeaterItemAction({
                          kind: "weapon",
                          id: weapon.id,
                        });
                        patchCharacter(updated);
                      }, "Weapon removed.");
                    }}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Gear"
              eyebrow="Encumbrance"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => setDrawerKind("gear")}
                >
                  Add From Catalog
                </button>
              }
            >
              <div className="mb-4 rounded-[1.25rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] px-4 py-3">
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                  Carrying capacity
                </p>
                <p className="mt-2 text-lg text-[var(--paper)]">
                  {encumbranceUsed}/{encumbranceCapacity} half-row units
                </p>
                <p className="text-sm text-[var(--ink-muted)]">
                  {encumbranceUsed > encumbranceCapacity
                    ? "Over capacity. Expect force checks when moving."
                    : "Inside safe carrying limits."}
                </p>
              </div>
              <div className="grid gap-4">
                {gearItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                        {formatEncumbranceUnits(item.encumbranceUnits)}
                      </span>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          runTask(async () => {
                            const updated = await deleteRepeaterItemAction({
                              kind: "gear",
                              id: item.id,
                            });
                            patchCharacter(updated);
                          }, "Gear removed.");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                      <SavableTextField
                        label="Item"
                        value={item.name}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "name", value)
                        }
                      />
                      <SavableTextField
                        label="Bonus"
                        value={item.bonus}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "bonus", value)
                        }
                      />
                      <SavableSelectField
                        label="Load"
                        value={String(item.encumbranceUnits)}
                        options={encumbrancePresets}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "encumbranceUnits", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label="Comment"
                      multiline
                      rows={3}
                      value={item.comment}
                      onCommit={(value) =>
                        commitRepeater("gear", item.id, "comment", value)
                      }
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Tiny Items"
              eyebrow="Pocket Rituals"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => setDrawerKind("tiny")}
                >
                  Add From Catalog
                </button>
              }
            >
              <div className="grid gap-4">
                {tinyItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4"
                  >
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          runTask(async () => {
                            const updated = await deleteRepeaterItemAction({
                              kind: "gear",
                              id: item.id,
                            });
                            patchCharacter(updated);
                          }, "Tiny item removed.");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                      <SavableTextField
                        label="Item"
                        value={item.name}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "name", value)
                        }
                      />
                      <SavableTextField
                        label="Bonus"
                        value={item.bonus}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "bonus", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label="Comment"
                      multiline
                      rows={3}
                      value={item.comment}
                      onCommit={(value) =>
                        commitRepeater("gear", item.id, "comment", value)
                      }
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="People I've Met"
              eyebrow="Contacts"
              className="lg:col-span-2"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => {
                    runTask(async () => {
                      const updated = await createRepeaterItemAction({
                        characterId: selectedCharacter.id,
                        kind: "contact",
                      });
                      patchCharacter(updated);
                    }, "Contact row added.");
                  }}
                >
                  Add Contact
                </button>
              }
            >
              <div className="grid gap-4">
                {selectedCharacter.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4"
                  >
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          runTask(async () => {
                            const updated = await deleteRepeaterItemAction({
                              kind: "contact",
                              id: contact.id,
                            });
                            patchCharacter(updated);
                          }, "Contact removed.");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                      <SavableTextField
                        label="Name"
                        value={contact.name}
                        onCommit={(value) =>
                          commitRepeater("contact", contact.id, "name", value)
                        }
                      />
                      <SavableTextField
                        label="Concept"
                        value={contact.concept}
                        onCommit={(value) =>
                          commitRepeater("contact", contact.id, "concept", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label="Notes"
                      multiline
                      rows={3}
                      value={contact.notes}
                      onCommit={(value) =>
                        commitRepeater("contact", contact.id, "notes", value)
                      }
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="My Cabin" eyebrow="Private Space">
              <div className="grid gap-4">
                <SavableTextField
                  label="Description"
                  multiline
                  rows={4}
                  value={selectedCharacter.myCabinDescription}
                  onCommit={(value) => commitField("myCabinDescription", value)}
                />
                <SavableTextField
                  label="Gear"
                  multiline
                  rows={4}
                  value={selectedCharacter.myCabinGear}
                  onCommit={(value) => commitField("myCabinGear", value)}
                />
                <SavableTextField
                  label="Other"
                  multiline
                  rows={4}
                  value={selectedCharacter.myCabinOther}
                  onCommit={(value) => commitField("myCabinOther", value)}
                />
              </div>
            </SectionCard>

            <SectionCard title="Notes" eyebrow="Back Sheet">
              <div className="grid gap-4">
                <SavableNumberField
                  label="Birr"
                  min={0}
                  value={selectedCharacter.birr}
                  onCommit={(value) => commitField("birr", value)}
                />
                <SavableTextField
                  label="Notes"
                  multiline
                  rows={12}
                  value={selectedCharacter.notes}
                  onCommit={(value) => commitField("notes", value)}
                />
              </div>
            </SectionCard>
          </main>
        ) : (
          <div className="mx-auto mt-16 max-w-2xl rounded-[1.9rem] border border-[var(--line-strong)] bg-[var(--panel)] px-6 py-12 text-center shadow-[0_30px_120px_rgba(3,6,10,0.36)]">
            <p className="text-[0.78rem] uppercase tracking-[0.34em] text-[var(--ink-faint)]">
              Empty Hangar
            </p>
            <h2 className="mt-4 font-display text-3xl uppercase tracking-[0.14em] text-[var(--paper)]">
              No character sheets in the ledger
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[var(--ink-muted)]">
              Create a new dossier and start capturing inventory, wounds, alliances,
              and station rumors in one place.
            </p>
            <button
              type="button"
              className="coriolis-chip mt-8"
              onClick={() => {
                runTask(async () => {
                  const created = await createCharacterAction();
                  setCharacters([created]);
                  setSelectedId(created.id);
                }, "New sheet opened.");
              }}
            >
              Create First Sheet
            </button>
          </div>
        )}
      </div>

      <PresetDrawer
        key={drawerKind ?? "closed"}
        catalog={inventoryCatalog}
        kind={drawerKind}
        onClose={() => setDrawerKind(null)}
        onPick={(kind, presetId) => {
          if (!selectedCharacter) {
            return;
          }

          runTask(async () => {
            const updated = await addInventoryPresetAction({
              characterId: selectedCharacter.id,
              kind,
              presetId,
            });
            patchCharacter(updated);
            setDrawerKind(null);
          }, "Inventory updated.");
        }}
      />
    </div>
  );
}

function WeaponCard({
  weapon,
  onCommit,
  onDelete,
}: {
  onCommit: (field: keyof CharacterWeaponRecord | "comments", value: number | string) => void;
  onDelete: () => void;
  weapon: CharacterWeaponRecord;
}) {
  return (
    <div className="rounded-[1.45rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
          onClick={onDelete}
        >
          Remove
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_110px_110px_110px] xl:grid-cols-[minmax(0,1fr)_110px_110px_110px_110px_140px]">
        <SavableTextField
          label="Weapon"
          value={weapon.name}
          onCommit={(value) => onCommit("name", value)}
        />
        <SavableNumberField
          label="Bonus"
          min={-2}
          max={8}
          value={weapon.bonus}
          onCommit={(value) => onCommit("bonus", value)}
        />
        <SavableNumberField
          label="Init"
          min={-2}
          max={8}
          value={weapon.initiative}
          onCommit={(value) => onCommit("initiative", value)}
        />
        <SavableNumberField
          label="Damage"
          min={0}
          max={12}
          value={weapon.damage}
          onCommit={(value) => onCommit("damage", value)}
        />
        <SavableTextField
          label="Crit"
          value={weapon.crit}
          onCommit={(value) => onCommit("crit", value)}
        />
        <SavableTextField
          label="Range"
          value={weapon.range}
          onCommit={(value) => onCommit("range", value)}
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
        <SavableNumberField
          label="Reloads"
          min={0}
          max={6}
          value={weapon.reloads}
          onCommit={(value) => onCommit("reloads", value)}
        />
        <SavableTextField
          label="Comments"
          multiline
          rows={3}
          value={weapon.comments}
          onCommit={(value) => onCommit("comments", value)}
        />
      </div>
    </div>
  );
}

function PresetDrawer({
  catalog,
  kind,
  onClose,
  onPick,
}: {
  catalog: InventoryPreset[];
  kind: InventoryKind | null;
  onClose: () => void;
  onPick: (kind: InventoryKind, presetId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  if (!kind) {
    return null;
  }

  const query = deferredSearch.trim().toLowerCase();
  const filteredCatalog = catalog.filter((preset) => {
    if (preset.kind !== kind) {
      return false;
    }

    if (!query) {
      return true;
    }

    return `${preset.label} ${preset.category}`.toLowerCase().includes(query);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:rgba(4,6,10,0.72)] p-3 backdrop-blur-sm md:items-center md:p-8">
      <div className="w-full max-w-3xl rounded-[1.9rem] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[0_36px_120px_rgba(2,5,9,0.5)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
              Preset Catalog
            </p>
            <h2 className="font-display text-2xl uppercase tracking-[0.14em] text-[var(--paper)]">
              Add {kind === "weapon" ? "Weapon" : kind === "gear" ? "Gear" : "Tiny Item"}
            </h2>
          </div>
          <button type="button" className="coriolis-chip" onClick={onClose}>
            Close
          </button>
        </div>

        <input
          className="coriolis-input mb-4"
          value={search}
          placeholder="Search the catalog"
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
          {filteredCatalog.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="flex w-full items-start justify-between gap-4 rounded-[1.3rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] px-4 py-4 text-left transition hover:border-[var(--gold)] hover:bg-[color:rgba(201,160,80,0.08)]"
              onClick={() => onPick(kind, preset.id)}
            >
              <div>
                <p className="font-medium uppercase tracking-[0.16em] text-[var(--paper)]">
                  {preset.label}
                </p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{preset.category}</p>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">
                  {"comments" in preset ? preset.comments : preset.comment}
                </p>
              </div>
              <span className="rounded-full border border-[var(--line-soft)] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                Add
              </span>
            </button>
          ))}

          {filteredCatalog.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-[var(--line-soft)] px-4 py-6 text-sm text-[var(--ink-muted)]">
              No presets matched that search. Try a broader term or use one of the
              custom entries.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
