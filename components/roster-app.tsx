"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  addInventoryPresetAction,
  createConditionModifierAction,
  createCharacterAction,
  createRepeaterItemAction,
  createTeamRepeaterItemAction,
  deleteConditionModifierAction,
  deleteCharacterAction,
  deleteRepeaterItemAction,
  deleteTeamRepeaterItemAction,
  promoteKnownFaceToCharacterAction,
  renameCharacterAction,
  setBuddyAction,
  updateConditionModifierAction,
  updateCharacterFieldAction,
  updateRepeaterFieldAction,
  updateTeamFieldAction,
  updateTeamRepeaterFieldAction,
} from "@/app/actions";
import {
  CounterTrack,
  SavableNumberField,
  SavableSelectField,
  SavableTextField,
  SectionCard,
} from "@/components/field-controls";
import {
  TeamScreen,
  teamQuickNavSections,
  type TeamQuickNavSectionId,
} from "@/components/team-screen";
import {
  calculateStarterGuidance,
  formatEncumbranceUnits,
  getEncumbranceCapacityUnits,
  getEncumbranceUsedUnits,
  starterGuidanceHints,
  starterGuidanceLabels,
} from "@/lib/coriolis-rules";
import {
  applyOptimisticSkillEdits,
  clearOptimisticSkillEdit,
  isCharacterSkillField,
  mergeCharacterListWithPreservedSkills,
  mergeCharacterWithPreservedSkills,
  pruneOptimisticSkillEdits,
  setOptimisticSkillEdit,
  type CharacterSkillField,
  type PendingOptimisticCharacterSkillEdits,
  updateCharacterSkillValue,
} from "@/lib/optimistic-skills";
import {
  conditionModifierTargetValues,
  originCultureValues,
  originSystemValues,
  upbringingValues,
} from "@/lib/roster-types";
import type {
  CharacterConditionModifierRecord,
  CharacterRecord,
  CharacterScalarField,
  CharacterWeaponRecord,
  ConditionModifierTarget,
  InventoryKind,
  InventoryPreset,
  OriginCulture,
  OriginSystem,
  RepeaterKind,
  Upbringing,
} from "@/lib/roster-types";
import type {
  TeamRecord,
  TeamRepeaterKind,
  TeamScalarField,
} from "@/lib/team-types";

type RosterAppProps = {
  initialCharacters: CharacterRecord[];
  inventoryCatalog: InventoryPreset[];
  initialTeam: TeamRecord;
};

const TEAM_VIEW_ID = "__team__";

type AttributeField = Extract<
  CharacterScalarField,
  "strength" | "agility" | "wits" | "empathy"
>;
type SkillKind = "general" | "advanced";

const attributeSkillSections = [
  {
    field: "strength",
    label: "Strength",
    hint: "Raw power and physique",
    skills: [
      { field: "meleeCombat", label: "Melee Combat", kind: "general" },
      { field: "force", label: "Force", kind: "general" },
    ],
  },
  {
    field: "agility",
    label: "Agility",
    hint: "Control, reflexes, motion",
    skills: [
      { field: "dexterity", label: "Dexterity", kind: "general" },
      { field: "infiltration", label: "Infiltration", kind: "general" },
      { field: "rangedCombat", label: "Ranged Combat", kind: "general" },
      { field: "pilot", label: "Pilot", kind: "advanced" },
    ],
  },
  {
    field: "wits",
    label: "Wits",
    hint: "Instinct, analysis, awareness",
    skills: [
      { field: "survival", label: "Survival", kind: "general" },
      { field: "observation", label: "Observation", kind: "general" },
      { field: "dataDjinn", label: "Data Djinn", kind: "advanced" },
      { field: "medicurgy", label: "Medicurgy", kind: "advanced" },
      { field: "science", label: "Science", kind: "advanced" },
      { field: "technology", label: "Technology", kind: "advanced" },
    ],
  },
  {
    field: "empathy",
    label: "Empathy",
    hint: "Presence, empathy, persuasion",
    skills: [
      { field: "manipulation", label: "Manipulation", kind: "general" },
      { field: "command", label: "Command", kind: "advanced" },
      { field: "culture", label: "Culture", kind: "advanced" },
      { field: "mysticPowers", label: "Mystic Powers", kind: "advanced" },
    ],
  },
] as const satisfies ReadonlyArray<{
  field: AttributeField;
  hint: string;
  label: string;
  skills: ReadonlyArray<{
    field: CharacterSkillField;
    kind: SkillKind;
    label: string;
  }>;
}>;

function describeSkillDicePool(
  attributeValue: number,
  skillValue: number,
  kind: SkillKind,
) {
  if (kind === "advanced" && skillValue === 0) {
    return "Needs 1 rank before it can be rolled.";
  }

  if (skillValue === 0) {
    return `Base chance ${attributeValue} dice from the attribute alone.`;
  }

  return `Pool ${attributeValue + skillValue} dice: ${attributeValue} attribute + ${skillValue} skill.`;
}

type ValuePipsProps = {
  label: string;
  max: number;
  min?: number;
  onCommit: (value: number) => Promise<void> | void;
  size?: "sm" | "md";
  value: number;
};

function ValuePips({
  label,
  max,
  min = 0,
  onCommit,
  size = "sm",
  value,
}: ValuePipsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {Array.from({ length: max }, (_, index) => {
        const pipValue = index + 1;
        const isActive = pipValue <= value;
        const nextValue =
          value === pipValue ? Math.max(min, pipValue - 1) : pipValue;

        return (
          <button
            key={`${label}-${pipValue}`}
            type="button"
            className={`coriolis-counter ${size === "md" ? "coriolis-counter--md" : ""} ${
              isActive ? "coriolis-counter--active" : ""
            }`}
            aria-label={
              value === pipValue
                ? `${label}: decrease to ${nextValue}`
                : `${label}: set to ${pipValue}`
            }
            aria-pressed={isActive}
            onClick={() => {
              void onCommit(nextValue);
            }}
          />
        );
      })}
    </div>
  );
}

const talentSourceOptions = [
  { value: "group", label: "Group" },
  { value: "concept", label: "Personal" },
  { value: "icon", label: "Icon" },
  { value: "other", label: "Other" },
];

const originCultureLabels: Record<OriginCulture, string> = {
  firstcome: "Firstcome",
  zenithian: "Zenithian",
};

const originSystemLabels: Record<OriginSystem, string> = {
  algol: "Algol",
  mira: "Mira",
  kua: "Kua",
  dabaran: "Dabaran",
  zalos: "Zalos",
  other: "Other",
};

const upbringingLabels: Record<Upbringing, string> = {
  plebeian: "Plebeian",
  stationary: "Stationary",
  privileged: "Privileged",
};

const originCultureOptions = [
  { value: "", label: "Choose origin culture" },
  ...originCultureValues.map((value) => ({
    value,
    label: originCultureLabels[value],
  })),
];

const originSystemOptions = [
  { value: "", label: "Choose home system" },
  ...originSystemValues.map((value) => ({
    value,
    label: originSystemLabels[value],
  })),
];

const upbringingOptions = [
  { value: "", label: "Choose upbringing" },
  ...upbringingValues.map((value) => ({
    value,
    label: upbringingLabels[value],
  })),
];

const conditionModifierTargetLabels: Record<ConditionModifierTarget, string> = {
  hitPoints: "Hit Points",
  mindPoints: "Mind Points",
  radiation: "Radiation",
};

const conditionModifierTargetOptions = conditionModifierTargetValues.map((value) => ({
  value,
  label: conditionModifierTargetLabels[value],
}));

const encumbrancePresets = [
  { value: "0", label: "Tiny" },
  { value: "1", label: "Light" },
  { value: "2", label: "Normal" },
  { value: "4", label: "Heavy" },
  { value: "6", label: "3 rows" },
  { value: "8", label: "4 rows" },
  { value: "10", label: "5 rows" },
  { value: "12", label: "6 rows" },
];

const allQuickNavSections = [
  { id: "identity", label: "Identity", eyebrow: "Front Sheet" },
  { id: "appearance", label: "Appearance", eyebrow: "Presence" },
  { id: "conditions", label: "Conditions", eyebrow: "Trauma" },
  { id: "stats", label: "Stats", eyebrow: "Rulebook Matrix" },
  { id: "starter-rules", label: "Starter Rules", eyebrow: "Creation Guide" },
  { id: "relationships", label: "Relationships", eyebrow: "Other PCs" },
  { id: "talents", label: "Talents", eyebrow: "Edge" },
  { id: "armor", label: "Armor", eyebrow: "Protection" },
  { id: "weapons", label: "Weapons", eyebrow: "Loadout" },
  { id: "gear", label: "Gear", eyebrow: "Encumbrance" },
  { id: "tiny-items", label: "Tiny Items", eyebrow: "Pocket Rituals" },
  { id: "people-ive-met", label: "Contacts", eyebrow: "People I've Met" },
  { id: "my-cabin", label: "My Cabin", eyebrow: "Private Space" },
  { id: "notes", label: "Notes", eyebrow: "Back Sheet" },
] as const;

type QuickNavSectionId = (typeof allQuickNavSections)[number]["id"];
type HeaderQuickNavSection<TSectionId extends string> = {
  id: TSectionId;
  label: string;
  eyebrow: string;
};

type HeaderQuickNavProps<TSectionId extends string> = {
  activeLabel: string;
  activeSectionId: TSectionId;
  ariaLabel: string;
  description: string;
  onJumpToSection: (sectionId: TSectionId) => void;
  sections: readonly HeaderQuickNavSection<TSectionId>[];
};

const birrFormatter = new Intl.NumberFormat("en-US");
const MIN_BIRR = 0;
const MAX_BIRR = 999999;

type PendingRemoval = {
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
};

function formatBirr(value: number) {
  return `${birrFormatter.format(value)} birr`;
}

function clampBirr(value: number) {
  return Math.min(Math.max(value, MIN_BIRR), MAX_BIRR);
}

function HeaderQuickNav<TSectionId extends string>({
  activeLabel,
  activeSectionId,
  ariaLabel,
  description,
  onJumpToSection,
  sections,
}: HeaderQuickNavProps<TSectionId>) {
  return (
    <div className="coriolis-quick-nav">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.36em] text-[var(--ink-faint)]">
            Quick Nav
          </p>
          <div className="hidden h-px w-20 bg-[linear-gradient(90deg,rgba(201,160,80,0.3),transparent)] md:block" />
          <p className="hidden text-sm text-[var(--ink-muted)] md:block">{description}</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.04)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
          <span className="h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_14px_rgba(201,160,80,0.5)]" />
          {activeLabel}
        </div>
      </div>

      <div className="coriolis-quick-nav__rail" aria-label={ariaLabel}>
        {sections.map((section, index) => {
          const isActive = section.id === activeSectionId;

          return (
            <button
              key={section.id}
              type="button"
              className={`coriolis-quick-nav__button ${
                isActive ? "coriolis-quick-nav__button--active" : ""
              }`}
              aria-current={isActive ? "location" : undefined}
              onClick={() => onJumpToSection(section.id)}
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
  );
}

function ConfirmRemovalModal({
  pendingRemoval,
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  pendingRemoval: PendingRemoval | null;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!pendingRemoval) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, pendingRemoval]);

  if (!pendingRemoval) {
    return null;
  }

  return (
    <div
      className="coriolis-modal coriolis-modal--confirm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="coriolis-modal__dialog coriolis-modal__dialog--confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="coriolis-modal__header">
          <div className="coriolis-modal__copy">
            <p className="coriolis-modal__eyebrow">Confirm Removal</p>
            <h2 id={titleId} className="coriolis-modal__title">
              {pendingRemoval.title}
            </h2>
            <p id={descriptionId} className="coriolis-modal__description">
              {pendingRemoval.description}
            </p>
          </div>
        </div>
        <div className="coriolis-modal__actions">
          <button type="button" className="coriolis-chip" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="coriolis-chip coriolis-chip--danger"
            onClick={onConfirm}
          >
            {pendingRemoval.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BirrAdjustmentModal({
  currentValue,
  isOpen,
  onCancel,
  onConfirm,
}: {
  currentValue: number;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (delta: number) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("0");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const parsedDelta = Number.parseInt(draft, 10);
  const delta = Number.isFinite(parsedDelta) ? parsedDelta : 0;
  const nextValue = clampBirr(currentValue + delta);
  const isUnchanged = nextValue === currentValue;

  return (
    <div className="coriolis-modal coriolis-modal--confirm" onClick={onCancel} role="presentation">
      <form
        className="coriolis-modal__dialog coriolis-modal__dialog--confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();

          if (isUnchanged) {
            return;
          }

          onConfirm(delta);
        }}
      >
        <div className="coriolis-modal__header">
          <div className="coriolis-modal__copy">
            <p className="coriolis-modal__eyebrow">Birr Adjustment</p>
            <h2 id={titleId} className="coriolis-modal__title">
              Adjust Birr
            </h2>
            <p id={descriptionId} className="coriolis-modal__description">
              Enter a positive number to add birr or a negative number to subtract it.
            </p>
          </div>
        </div>
        <div className="coriolis-modal__body">
          <label htmlFor={inputId} className="flex flex-col gap-2">
            <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
              Amount to add or subtract
            </span>
            <input
              id={inputId}
              ref={inputRef}
              className="coriolis-input text-center"
              type="number"
              inputMode="numeric"
              step={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <div className="mt-4 grid gap-3 rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4 text-sm text-[var(--ink-muted)]">
            <div className="flex items-center justify-between gap-3">
              <span>Current total</span>
              <strong className="text-[var(--paper)]">{formatBirr(currentValue)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Resulting total</span>
              <strong className="text-[var(--paper)]">{formatBirr(nextValue)}</strong>
            </div>
          </div>
        </div>
        <div className="coriolis-modal__actions">
          <button type="button" className="coriolis-chip" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="coriolis-chip" disabled={isUnchanged}>
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}

type ConditionModifierModalState = {
  filterTarget: ConditionModifierTarget | "all";
  initialTarget: ConditionModifierTarget;
};

function formatConditionModifierAppliedLabel(count: number) {
  return count === 1 ? "Modifier applied" : "Modifiers applied";
}

function ConditionModifierEditorCard({
  modifier,
  onDelete,
  onSave,
}: {
  modifier: CharacterConditionModifierRecord;
  onDelete: () => void;
  onSave: (input: {
    description: string;
    name: string;
    target: string;
    value: number;
  }) => void;
}) {
  const [target, setTarget] = useState(modifier.target);
  const [name, setName] = useState(modifier.name);
  const [description, setDescription] = useState(modifier.description);
  const [value, setValue] = useState(String(modifier.value));

  useEffect(() => {
    setTarget(modifier.target);
    setName(modifier.name);
    setDescription(modifier.description);
    setValue(String(modifier.value));
  }, [modifier]);

  const parsedValue = Number.parseInt(value, 10);
  const numericValue = Number.isFinite(parsedValue) ? parsedValue : 0;
  const isUnchanged =
    target === modifier.target &&
    name === modifier.name &&
    description === modifier.description &&
    numericValue === modifier.value;

  return (
    <form
      className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (isUnchanged) {
          return;
        }

        onSave({
          target,
          name,
          description,
          value: numericValue,
        });
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
          {conditionModifierTargetLabels[modifier.target]}
        </p>
        <button
          type="button"
          className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
          onClick={onDelete}
        >
          Remove
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_140px]">
        <label className="flex flex-col gap-2">
          <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
            Affects
          </span>
          <select
            className="coriolis-select"
            value={target}
            onChange={(event) => setTarget(event.target.value as ConditionModifierTarget)}
          >
            {conditionModifierTargetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
            Name
          </span>
          <input
            className="coriolis-input"
            value={name}
            placeholder="Exo shell reinforcement"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
            Modifier
          </span>
          <input
            className="coriolis-input text-center"
            type="number"
            inputMode="numeric"
            step={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
      </div>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
          Description
        </span>
        <textarea
          className="coriolis-textarea"
          rows={3}
          value={description}
          placeholder="Why this modifier exists and when it matters."
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="coriolis-chip" disabled={isUnchanged}>
          Save
        </button>
      </div>
    </form>
  );
}

function ConditionModifierModal({
  characterName,
  isOpen,
  modalState,
  modifiers,
  onCancel,
  onCreate,
  onDelete,
  onUpdate,
}: {
  characterName: string;
  isOpen: boolean;
  modalState: ConditionModifierModalState | null;
  modifiers: CharacterConditionModifierRecord[];
  onCancel: () => void;
  onCreate: (input: {
    description: string;
    name: string;
    target: string;
    value: number;
  }) => void;
  onDelete: (modifier: CharacterConditionModifierRecord) => void;
  onUpdate: (
    modifier: CharacterConditionModifierRecord,
    input: {
      description: string;
      name: string;
      target: string;
      value: number;
    },
  ) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [filterTarget, setFilterTarget] = useState<ConditionModifierTarget | "all">(
    modalState?.filterTarget ?? "all",
  );
  const [createTarget, setCreateTarget] = useState<ConditionModifierTarget>(
    modalState?.initialTarget ?? "hitPoints",
  );
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createValue, setCreateValue] = useState("0");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !modalState) {
    return null;
  }

  const visibleModifiers =
    filterTarget === "all"
      ? modifiers
      : modifiers.filter((modifier) => modifier.target === filterTarget);
  const parsedCreateValue = Number.parseInt(createValue, 10);
  const createNumericValue = Number.isFinite(parsedCreateValue) ? parsedCreateValue : 0;

  return (
    <div className="coriolis-modal coriolis-modal--confirm" onClick={onCancel} role="presentation">
      <div
        className="coriolis-modal__dialog max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="coriolis-modal__header">
          <div className="coriolis-modal__copy">
            <p className="coriolis-modal__eyebrow">Conditions</p>
            <h2 id={titleId} className="coriolis-modal__title">
              Track Condition Modifiers
            </h2>
            <p id={descriptionId} className="coriolis-modal__description">
              Add lasting effects for {characterName}. Modifiers change the max size of hit
              points, mind points, or radiation and stay in the database.
            </p>
          </div>
        </div>

        <div className="coriolis-modal__body space-y-5">
          <div className="grid gap-4 rounded-[1.2rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.05)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-lg uppercase tracking-[0.12em] text-[var(--paper)]">
                Add Modifier
              </p>
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                Show
                <select
                  className="coriolis-select min-w-[170px]"
                  value={filterTarget}
                  onChange={(event) =>
                    setFilterTarget(event.target.value as ConditionModifierTarget | "all")
                  }
                >
                  <option value="all">All modifiers</option>
                  {conditionModifierTargetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                onCreate({
                  target: createTarget,
                  name: createName,
                  description: createDescription,
                  value: createNumericValue,
                });
                setCreateName("");
                setCreateDescription("");
                setCreateValue("0");
              }}
            >
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_140px]">
                <label className="flex flex-col gap-2">
                  <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                    Affects
                  </span>
                  <select
                    className="coriolis-select"
                    value={createTarget}
                    onChange={(event) =>
                      setCreateTarget(event.target.value as ConditionModifierTarget)
                    }
                  >
                    {conditionModifierTargetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                    Name
                  </span>
                  <input
                    className="coriolis-input"
                    value={createName}
                    placeholder="Blessed talisman"
                    onChange={(event) => setCreateName(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                    Modifier
                  </span>
                  <input
                    className="coriolis-input text-center"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    value={createValue}
                    onChange={(event) => setCreateValue(event.target.value)}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                  Description
                </span>
                <textarea
                  className="coriolis-textarea"
                  rows={3}
                  value={createDescription}
                  placeholder="Short note for what caused the change."
                  onChange={(event) => setCreateDescription(event.target.value)}
                />
              </label>

              <div className="flex justify-end">
                <button type="submit" className="coriolis-chip">
                  Add Modifier
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-4">
            {visibleModifiers.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                No modifiers in this view yet.
              </div>
            ) : null}
            {visibleModifiers.map((modifier) => (
              <ConditionModifierEditorCard
                key={modifier.id}
                modifier={modifier}
                onDelete={() => onDelete(modifier)}
                onSave={(input) => onUpdate(modifier, input)}
              />
            ))}
          </div>
        </div>

        <div className="coriolis-modal__actions">
          <button type="button" className="coriolis-chip" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function describeVariance(actual: number, target: number) {
  if (actual === target) {
    return "Aligned with the starter target.";
  }

  const delta = Math.abs(actual - target);

  return actual > target ? `${delta} above target.` : `${delta} below target.`;
}

export function RosterApp({
  initialCharacters,
  inventoryCatalog,
  initialTeam,
}: RosterAppProps) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [pendingSkillEdits, setPendingSkillEdits] =
    useState<PendingOptimisticCharacterSkillEdits>({});
  const [team, setTeam] = useState(initialTeam);
  const [selectedPanelId, setSelectedPanelId] = useState<string>(TEAM_VIEW_ID);
  const [drawerKind, setDrawerKind] = useState<InventoryKind | null>(null);
  const [notice, setNotice] = useState<string | null>(
    "Autosaves on blur. Shared crew data and character sheets stay in sync.",
  );
  const [isStarterRulesHidden, setIsStarterRulesHidden] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<QuickNavSectionId>(
    allQuickNavSections[0].id,
  );
  const [activeTeamSectionId, setActiveTeamSectionId] =
    useState<TeamQuickNavSectionId>(teamQuickNavSections[0].id);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [isBirrAdjustmentOpen, setIsBirrAdjustmentOpen] = useState(false);
  const [conditionModifierModalState, setConditionModifierModalState] =
    useState<ConditionModifierModalState | null>(null);
  const latestIssuedSkillRequestIds = useRef<Record<string, number>>({});
  const latestConfirmedSkillRequestIds = useRef<Record<string, number>>({});

  const isTeamSelected = selectedPanelId === TEAM_VIEW_ID;
  const visibleCharacters = characters.map((character) =>
    applyOptimisticSkillEdits(character, pendingSkillEdits[character.id]),
  );
  const selectedCharacter =
    isTeamSelected
      ? null
      : visibleCharacters.find((character) => character.id === selectedPanelId) ??
        visibleCharacters[0] ??
        null;
  const selectedCharacterId = selectedCharacter?.id ?? null;
  const quickNavSections = isStarterRulesHidden
    ? allQuickNavSections.filter((section) => section.id !== "starter-rules")
    : allQuickNavSections;
  const otherCharacters = selectedCharacter
    ? visibleCharacters.filter((character) => character.id !== selectedCharacter.id)
    : [];
  const otherCharacterNames = otherCharacters.map((character) => character.name);
  const unassignedRelationshipNames = selectedCharacter
    ? otherCharacterNames.filter(
        (name) =>
          !selectedCharacter.relationships.some(
            (relationship) => relationship.targetName === name,
          ),
      )
    : [];

  useEffect(() => {
    setPendingSkillEdits((currentPendingEdits) =>
      pruneOptimisticSkillEdits(
        currentPendingEdits,
        characters.map((character) => character.id),
      ),
    );
  }, [characters]);

  useEffect(() => {
    if (isTeamSelected) {
      return;
    }

    if (!selectedCharacter) {
      setSelectedPanelId(characters[0]?.id ?? TEAM_VIEW_ID);
    }
  }, [characters, isTeamSelected, selectedCharacter]);

  useEffect(() => {
    setActiveSectionId(allQuickNavSections[0].id);
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!isTeamSelected) {
      return;
    }

    setActiveTeamSectionId(teamQuickNavSections[0].id);
  }, [isTeamSelected, team.id]);

  useEffect(() => {
    if (!isStarterRulesHidden || activeSectionId !== "starter-rules") {
      return;
    }

    setActiveSectionId("relationships");
  }, [activeSectionId, isStarterRulesHidden]);

  useEffect(() => {
    if (!selectedCharacterId) {
      return;
    }

    const sectionNodes = (
      isStarterRulesHidden
        ? allQuickNavSections.filter((section) => section.id !== "starter-rules")
        : allQuickNavSections
    )
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

        const nextSection = visibleEntries[0]?.target.id as QuickNavSectionId | undefined;

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
  }, [isStarterRulesHidden, selectedCharacterId]);

  useEffect(() => {
    if (selectedCharacter) {
      return;
    }

    setIsBirrAdjustmentOpen(false);
    setConditionModifierModalState(null);
  }, [selectedCharacter]);

  useEffect(() => {
    if (!isTeamSelected) {
      return;
    }

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
          setActiveTeamSectionId(nextSection);
        }
      },
      {
        rootMargin: "-24% 0px -58% 0px",
        threshold: [0.18, 0.3, 0.45, 0.62],
      },
    );

    sectionNodes.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [isTeamSelected, team.id]);

  function getSkillRequestKey(characterId: string, field: CharacterSkillField) {
    return `${characterId}:${field}`;
  }

  function patchCharacter(updatedCharacter: CharacterRecord) {
    setCharacters((currentCharacters) => {
      const existingIndex = currentCharacters.findIndex(
        (character) => character.id === updatedCharacter.id,
      );

      if (existingIndex === -1) {
        return [...currentCharacters, updatedCharacter];
      }

      return currentCharacters.map((character) =>
        character.id === updatedCharacter.id
          ? mergeCharacterWithPreservedSkills(character, updatedCharacter)
          : character,
      );
    });
  }

  function patchTeam(updatedTeam: TeamRecord) {
    setTeam(updatedTeam);
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

  function requestRemoval(removal: PendingRemoval) {
    setPendingRemoval(removal);
  }

  function closeRemovalDialog() {
    setPendingRemoval(null);
  }

  function openBirrAdjustmentModal() {
    if (!selectedCharacter) {
      return;
    }

    setIsBirrAdjustmentOpen(true);
  }

  function closeBirrAdjustmentModal() {
    setIsBirrAdjustmentOpen(false);
  }

  function openConditionModifierModal(
    filterTarget: ConditionModifierTarget | "all",
    initialTarget: ConditionModifierTarget,
  ) {
    if (!selectedCharacter) {
      return;
    }

    setConditionModifierModalState({
      filterTarget,
      initialTarget,
    });
  }

  function closeConditionModifierModal() {
    setConditionModifierModalState(null);
  }

  function applyBirrAdjustment(delta: number) {
    if (!selectedCharacter) {
      return;
    }

    const nextValue = clampBirr(selectedCharacter.birr + delta);
    setIsBirrAdjustmentOpen(false);

    if (nextValue === selectedCharacter.birr) {
      return;
    }

    commitField("birr", nextValue);
  }

  function confirmRemoval() {
    if (!pendingRemoval) {
      return;
    }

    const onConfirm = pendingRemoval.onConfirm;
    setPendingRemoval(null);
    onConfirm();
  }

  function requestConditionModifierRemoval(modifier: CharacterConditionModifierRecord) {
    requestRemoval({
      confirmLabel: "Remove",
      description: `This permanently removes the ${conditionModifierTargetLabels[modifier.target].toLowerCase()} modifier from ${selectedCharacter?.name ?? "the current sheet"}.`,
      onConfirm: () => {
        runTask(async () => {
          const updated = await deleteConditionModifierAction(modifier.id);
          patchCharacter(updated);
        }, "Condition modifier removed.");
      },
      title: `Remove ${modifier.name.trim() || conditionModifierTargetLabels[modifier.target]}?`,
    });
  }

  function requestCharacterDeletion(character: CharacterRecord) {
    requestRemoval({
      confirmLabel: "Delete Sheet",
      description: `This permanently removes ${character.name} and all of the sheet's relationships, talents, weapons, gear, contacts, and condition modifiers.`,
      onConfirm: () => {
        runTask(async () => {
          const remaining = await deleteCharacterAction(character.id);
          setCharacters((currentCharacters) =>
            mergeCharacterListWithPreservedSkills(currentCharacters, remaining),
          );
          setSelectedPanelId(remaining[0]?.id ?? TEAM_VIEW_ID);
        }, "Sheet removed.");
      },
      title: `Delete ${character.name}?`,
    });
  }

  function requestCharacterRepeaterRemoval(
    kind: RepeaterKind,
    id: string,
    entryLabel: string,
    successMessage: string,
  ) {
    requestRemoval({
      confirmLabel: "Remove",
      description: `This permanently removes the ${entryLabel.toLowerCase()} from ${selectedCharacter?.name ?? "the current sheet"}.`,
      onConfirm: () => {
        runTask(async () => {
          const updated = await deleteRepeaterItemAction({ kind, id });
          patchCharacter(updated);
        }, successMessage);
      },
      title: `Remove ${entryLabel}?`,
    });
  }

  function requestTeamRepeaterRemoval(
    kind: Exclude<TeamRepeaterKind, "crewPosition">,
    id: string,
    entryLabel: string,
  ) {
    requestRemoval({
      confirmLabel: "Remove",
      description: `This permanently removes the ${entryLabel.toLowerCase()} from the shared team ledger.`,
      onConfirm: () => {
        runTask(async () => {
          const updated = await deleteTeamRepeaterItemAction({ kind, id });
          patchTeam(updated);
        }, "Team ledger updated.");
      },
      title: `Remove ${entryLabel}?`,
    });
  }

  function commitField(field: CharacterScalarField, value: string | number) {
    if (!selectedCharacter) {
      return;
    }

    if (isCharacterSkillField(field)) {
      commitSkillField(field, Number(value));
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

  function commitSkillField(field: CharacterSkillField, value: number) {
    if (!selectedCharacter) {
      return;
    }

    const characterId = selectedCharacter.id;
    const requestKey = getSkillRequestKey(characterId, field);
    const requestId = (latestIssuedSkillRequestIds.current[requestKey] ?? 0) + 1;

    latestIssuedSkillRequestIds.current[requestKey] = requestId;
    setPendingSkillEdits((currentPendingEdits) =>
      setOptimisticSkillEdit(currentPendingEdits, characterId, field, value),
    );

    runTask(async () => {
      try {
        const updated = await updateCharacterFieldAction({
          characterId,
          field,
          value,
        });
        const latestConfirmedRequestId =
          latestConfirmedSkillRequestIds.current[requestKey] ?? 0;

        if (requestId > latestConfirmedRequestId) {
          setCharacters((currentCharacters) =>
            updateCharacterSkillValue(
              currentCharacters,
              characterId,
              field,
              updated[field],
            ),
          );
          latestConfirmedSkillRequestIds.current[requestKey] = requestId;
        }

        if (latestIssuedSkillRequestIds.current[requestKey] === requestId) {
          setPendingSkillEdits((currentPendingEdits) =>
            clearOptimisticSkillEdit(currentPendingEdits, characterId, field),
          );
        }
      } catch (error) {
        if (latestIssuedSkillRequestIds.current[requestKey] !== requestId) {
          return;
        }

        setPendingSkillEdits((currentPendingEdits) =>
          clearOptimisticSkillEdit(currentPendingEdits, characterId, field),
        );
        throw error;
      }
    });
  }

  function commitTeamField(field: TeamScalarField, value: string | number) {
    runTask(async () => {
      const updated = await updateTeamFieldAction({
        teamId: team.id,
        field,
        value,
      });
      patchTeam(updated);
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

  function commitTeamRepeater(
    kind: TeamRepeaterKind,
    id: string,
    field: string,
    value: string | number,
  ) {
    runTask(async () => {
      const updated = await updateTeamRepeaterFieldAction({ kind, id, field, value });
      patchTeam(updated);
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

  async function uploadKnownFacePortrait(knownFaceId: string, file: File) {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/known-faces/${knownFaceId}/portrait`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        team?: TeamRecord;
        error?: string;
      };

      if (!response.ok || !payload.team) {
        throw new Error(payload.error ?? "Portrait upload failed.");
      }

      patchTeam(payload.team);
      setNotice("Known-face portrait updated.");
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
  const starterGuidance = selectedCharacter
    ? calculateStarterGuidance(selectedCharacter)
    : null;
  const selectedUpbringingLabel =
    starterGuidance?.selectedUpbringing
      ? upbringingLabels[starterGuidance.selectedUpbringing]
      : null;
  const starterGuidanceRows =
    starterGuidance?.target
      ? [
          {
            key: "attributePoints",
            label: starterGuidanceLabels.attributePoints,
            actual: starterGuidance.actual.attributePoints,
            target: starterGuidance.target.attributePoints,
          },
          {
            key: "skillPoints",
            label: starterGuidanceLabels.skillPoints,
            actual: starterGuidance.actual.skillPoints,
            target: starterGuidance.target.skillPoints,
          },
          {
            key: "groupTalents",
            label: starterGuidanceLabels.groupTalents,
            actual: starterGuidance.actual.groupTalents,
            target: starterGuidance.target.groupTalents,
          },
          {
            key: "conceptTalents",
            label: starterGuidanceLabels.conceptTalents,
            actual: starterGuidance.actual.conceptTalents,
            target: starterGuidance.target.conceptTalents,
          },
          {
            key: "iconTalents",
            label: starterGuidanceLabels.iconTalents,
            actual: starterGuidance.actual.iconTalents,
            target: starterGuidance.target.iconTalents,
          },
          {
            key: "totalTalents",
            label: starterGuidanceLabels.totalTalents,
            actual: starterGuidance.actual.totalTalents,
            target: starterGuidance.target.totalTalents,
          },
          {
            key: "baseReputation",
            label: starterGuidanceLabels.baseReputation,
            actual: starterGuidance.actual.reputation,
            target: starterGuidance.target.baseReputation,
            hint: starterGuidanceHints.baseReputation,
          },
          {
            key: "startingCapital",
            label: starterGuidanceLabels.startingCapital,
            actual: starterGuidance.actual.startingCapital,
            target: starterGuidance.target.startingCapital,
            formatValue: formatBirr,
          },
        ]
      : [];
  const conditionModifierCounts = selectedCharacter
    ? selectedCharacter.conditionModifiers.reduce<Record<ConditionModifierTarget, number>>(
        (counts, modifier) => ({
          ...counts,
          [modifier.target]: counts[modifier.target] + 1,
        }),
        {
          hitPoints: 0,
          mindPoints: 0,
          radiation: 0,
        },
      )
    : {
        hitPoints: 0,
        mindPoints: 0,
        radiation: 0,
      };
  const activeNavSection =
    quickNavSections.find((section) => section.id === activeSectionId) ?? quickNavSections[0];
  const activeTeamNavSection =
    teamQuickNavSections.find((section) => section.id === activeTeamSectionId) ??
    teamQuickNavSections[0];

  function jumpToSection(sectionId: QuickNavSectionId) {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    setActiveSectionId(sectionId);
    section.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function jumpToTeamSection(sectionId: TeamQuickNavSectionId) {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    setActiveTeamSectionId(sectionId);
    section.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function hideStarterRules() {
    setIsStarterRulesHidden(true);
    if (activeSectionId === "starter-rules") {
      setActiveSectionId("relationships");
    }
    setNotice("Starter rules hidden. Use Show Starter Rules to bring the guide back.");
  }

  function showStarterRules() {
    setIsStarterRulesHidden(false);
    setNotice("Starter rules guide restored.");
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--night)] text-[var(--ink)]">
      <div className="coriolis-stars pointer-events-none fixed inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-14 pt-4 md:px-6 lg:px-8">
        <header className="sticky top-4 z-30 mb-5 rounded-[1.7rem] border border-[var(--line-strong)] bg-[color:rgba(14,18,29,0.78)] px-4 py-4 shadow-[0_24px_80px_rgba(4,7,13,0.36)] backdrop-blur-xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <p className="text-[0.72rem] uppercase tracking-[0.34em] text-[var(--ink-faint)]">
                  Crew & Character Roster
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
                      setSelectedPanelId(created.id);
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
                      const previousName = selectedCharacter.name;
                      const updated = await renameCharacterAction({
                        characterId: selectedCharacter.id,
                        name: nextName,
                      });
                      setCharacters((currentCharacters) =>
                        currentCharacters.map((character) => {
                          if (character.id === updated.id) {
                            return mergeCharacterWithPreservedSkills(character, updated);
                          }

                          return {
                            ...character,
                            relationships: character.relationships.map((relationship) =>
                              relationship.targetName === previousName
                                ? { ...relationship, targetName: updated.name }
                                : relationship,
                            ),
                          };
                        }),
                      );
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

                    requestCharacterDeletion(selectedCharacter);
                  }}
                >
                  Delete
                </button>
                {isStarterRulesHidden ? (
                  <button
                    type="button"
                    className="coriolis-chip"
                    onClick={showStarterRules}
                  >
                    Show Starter Rules
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                className={`min-w-fit rounded-full border px-4 py-2 text-sm uppercase tracking-[0.18em] transition ${
                  isTeamSelected
                    ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
                    : "border-[var(--line-soft)] bg-[color:rgba(245,231,204,0.06)] text-[var(--ink-muted)] hover:border-[var(--line-strong)] hover:text-[var(--paper)]"
                }`}
                onClick={() => setSelectedPanelId(TEAM_VIEW_ID)}
              >
                Team
              </button>
              {visibleCharacters.map((character) => {
                const isActive = character.id === selectedCharacter?.id && !isTeamSelected;

                return (
                  <button
                    key={character.id}
                    type="button"
                    className={`min-w-fit rounded-full border px-4 py-2 text-sm uppercase tracking-[0.18em] transition ${
                      isActive
                        ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
                        : "border-[var(--line-soft)] bg-[color:rgba(245,231,204,0.06)] text-[var(--ink-muted)] hover:border-[var(--line-strong)] hover:text-[var(--paper)]"
                    }`}
                    onClick={() => setSelectedPanelId(character.id)}
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

            {selectedCharacter ? (
              <HeaderQuickNav
                activeLabel={activeNavSection.label}
                activeSectionId={activeSectionId}
                ariaLabel="Quick navigation"
                description="Jump straight to the part of the dossier you need."
                onJumpToSection={jumpToSection}
                sections={quickNavSections}
              />
            ) : null}

            {isTeamSelected ? (
              <HeaderQuickNav
                activeLabel={activeTeamNavSection.label}
                activeSectionId={activeTeamSectionId}
                ariaLabel="Quick navigation"
                description="Jump straight to the part of the crew dossier you need."
                onJumpToSection={jumpToTeamSection}
                sections={teamQuickNavSections}
              />
            ) : null}
          </div>
        </header>

        {isTeamSelected ? (
          <main className="grid gap-4 xl:gap-5">
            <TeamScreen
              team={team}
              characters={visibleCharacters}
              onOpenCharacter={(characterId) => setSelectedPanelId(characterId)}
              onUpdateField={(field, value) =>
                commitTeamField(field as TeamScalarField, value)
              }
              onCreateRepeater={(kind) => {
                runTask(async () => {
                  const updated = await createTeamRepeaterItemAction({
                    teamId: team.id,
                    kind,
                  });
                  patchTeam(updated);
                }, "Team ledger updated.");
              }}
              onUpdateRepeater={(kind, id, field, value) =>
                commitTeamRepeater(kind as TeamRepeaterKind, id, field, value)
              }
              onRemoveRepeater={(kind, id) => {
                const entryLabels: Record<Exclude<TeamRepeaterKind, "crewPosition">, string> = {
                  factionTie: "Faction Tie",
                  knownFace: "Known Face",
                  note: "Note",
                  storyBeat: "Story Beat",
                };

                requestTeamRepeaterRemoval(kind, id, entryLabels[kind]);
              }}
              onKnownFacePortraitUpload={async (knownFaceId, file) => {
                await uploadKnownFacePortrait(knownFaceId, file);
              }}
              onPromoteKnownFace={(knownFaceId) => {
                runTask(async () => {
                  const result = await promoteKnownFaceToCharacterAction(knownFaceId);
                  patchTeam(result.team);
                  patchCharacter(result.character);
                  setSelectedPanelId(result.character.id);
                }, "Known face promoted to crew.");
              }}
            />
          </main>
        ) : selectedCharacter ? (
          <main className="grid gap-4 lg:grid-cols-2 xl:gap-5">
            <SectionCard
              id="identity"
              title="Identity"
              eyebrow="Front Sheet"
              className="lg:col-span-2"
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
                  <SavableSelectField
                    label="Origin Culture"
                    hint="Descriptive in v1. Use this to mark Firstcome or Zenithian roots."
                    value={selectedCharacter.originCulture ?? ""}
                    options={originCultureOptions}
                    onCommit={(value) => commitField("originCulture", value)}
                  />
                  <SavableSelectField
                    label="Home System"
                    hint="Descriptive in v1. Coriolis-born characters belong to the Kua system."
                    value={selectedCharacter.originSystem ?? ""}
                    options={originSystemOptions}
                    onCommit={(value) => commitField("originSystem", value)}
                  />
                  <SavableSelectField
                    label="Upbringing"
                    hint="This is the only field that drives starter-budget guidance in v1."
                    value={selectedCharacter.upbringing ?? ""}
                    options={upbringingOptions}
                    onCommit={(value) => commitField("upbringing", value)}
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

            <SectionCard id="appearance" title="Appearance" eyebrow="Presence">
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

            <SectionCard
              id="conditions"
              title="Conditions"
              eyebrow="Trauma"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => openConditionModifierModal("all", "hitPoints")}
                >
                  Add Modifier
                </button>
              }
            >
              <div className="grid gap-4">
                <CounterTrack
                  label={`Hit Points (max ${selectedCharacter.maxHitPoints})`}
                  max={selectedCharacter.maxHitPoints}
                  value={selectedCharacter.currentHitPoints}
                  headerAction={
                    conditionModifierCounts.hitPoints > 0 ? (
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)] underline decoration-[rgba(201,160,80,0.45)] underline-offset-4 transition hover:text-[var(--paper)]"
                        onClick={() => openConditionModifierModal("hitPoints", "hitPoints")}
                      >
                        {formatConditionModifierAppliedLabel(
                          conditionModifierCounts.hitPoints,
                        )}
                      </button>
                    ) : null
                  }
                  onCommit={(value) => commitField("currentHitPoints", value)}
                />
                <CounterTrack
                  label={`Mind Points (max ${selectedCharacter.maxMindPoints})`}
                  max={selectedCharacter.maxMindPoints}
                  value={selectedCharacter.currentMindPoints}
                  headerAction={
                    conditionModifierCounts.mindPoints > 0 ? (
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)] underline decoration-[rgba(201,160,80,0.45)] underline-offset-4 transition hover:text-[var(--paper)]"
                        onClick={() => openConditionModifierModal("mindPoints", "mindPoints")}
                      >
                        {formatConditionModifierAppliedLabel(
                          conditionModifierCounts.mindPoints,
                        )}
                      </button>
                    ) : null
                  }
                  onCommit={(value) => commitField("currentMindPoints", value)}
                />
                <CounterTrack
                  label={`Radiation (max ${selectedCharacter.maxRadiation})`}
                  max={selectedCharacter.maxRadiation}
                  value={selectedCharacter.radiation}
                  headerAction={
                    conditionModifierCounts.radiation > 0 ? (
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)] underline decoration-[rgba(201,160,80,0.45)] underline-offset-4 transition hover:text-[var(--paper)]"
                        onClick={() => openConditionModifierModal("radiation", "radiation")}
                      >
                        {formatConditionModifierAppliedLabel(
                          conditionModifierCounts.radiation,
                        )}
                      </button>
                    ) : null
                  }
                  onCommit={(value) => commitField("radiation", value)}
                />
                <SavableNumberField
                  label="Experience"
                  min={0}
                  hint="Bank XP freely. Every 5 XP can become a new talent or skill advance."
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

            <SectionCard
              id="stats"
              title="Attributes + Skills"
              eyebrow="Rulebook Matrix"
              className="lg:col-span-2"
            >
              <div className="grid gap-5">
                <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.05)] px-4 py-4">
                  <p className="font-display text-lg uppercase tracking-[0.14em] text-[var(--paper)]">
                    Roll linked stats together
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">
                    The rulebook ties every skill to one attribute. General skills can roll on
                    base attribute alone, while advanced skills need at least 1 rank before they
                    come online.
                  </p>
                </div>

                <div className="grid items-start gap-4 xl:grid-cols-2">
                  {attributeSkillSections.map((section) => {
                    const attributeValue = selectedCharacter[section.field] as number;

                    return (
                      <article key={section.field} className="coriolis-stat-cluster">
                        <div className="coriolis-stat-cluster__header">
                          <div className="space-y-2">
                            <div>
                              <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                                Attribute
                              </p>
                              <h3 className="font-display text-2xl uppercase tracking-[0.12em] text-[var(--paper)]">
                                {section.label}
                              </h3>
                            </div>
                            <p className="max-w-[32rem] text-sm text-[var(--ink-muted)]">
                              {section.hint}
                            </p>
                          </div>
                          <div className="coriolis-stat-cluster__value">
                            <span className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                              Base
                            </span>
                            <strong className="font-display text-3xl uppercase tracking-[0.08em] text-[var(--paper)]">
                              {attributeValue}
                            </strong>
                          </div>
                        </div>

                        <div className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.04)] px-4 py-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                              Attribute value
                            </p>
                            <p className="text-sm text-[var(--ink-muted)]">{attributeValue}/5</p>
                          </div>
                          <ValuePips
                            label={`${section.label} attribute`}
                            max={5}
                            min={1}
                            size="md"
                            value={attributeValue}
                            onCommit={(value) => commitField(section.field, value)}
                          />
                        </div>

                        <div className="grid gap-3">
                          {section.skills.map((skill) => {
                            const skillValue = selectedCharacter[skill.field] as number;
                            const canRoll = skill.kind === "general" || skillValue > 0;
                            const dicePool = canRoll ? attributeValue + skillValue : null;

                            return (
                              <div key={skill.field} className="coriolis-linked-skill">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-display text-lg uppercase tracking-[0.08em] text-[var(--paper)]">
                                        {skill.label}
                                      </p>
                                      <span
                                        className={`coriolis-skill-chip ${
                                          skill.kind === "advanced"
                                            ? "coriolis-skill-chip--advanced"
                                            : ""
                                        }`}
                                      >
                                        {skill.kind}
                                      </span>
                                      {canRoll ? null : (
                                        <span className="coriolis-skill-chip coriolis-skill-chip--locked">
                                          Locked
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-[var(--ink-muted)]">
                                      {describeSkillDicePool(
                                        attributeValue,
                                        skillValue,
                                        skill.kind,
                                      )}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                                      Skill
                                    </p>
                                    <p className="font-display text-2xl uppercase tracking-[0.08em] text-[var(--paper)]">
                                      {skillValue}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <ValuePips
                                    label={skill.label}
                                    max={5}
                                    value={skillValue}
                                    onCommit={(value) => commitField(skill.field, value)}
                                  />
                                  <div className="rounded-full border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.06)] px-3 py-1 text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ink)]">
                                    {dicePool === null ? "Needs training" : `${dicePool} dice`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </SectionCard>

            {!isStarterRulesHidden ? (
              <SectionCard
                id="starter-rules"
                title="Starter Rules"
                eyebrow="Creation Guide"
                actions={
                  <button
                    type="button"
                    className="coriolis-chip"
                    onClick={hideStarterRules}
                  >
                    Hide
                  </button>
                }
              >
                {!starterGuidance?.target ? (
                  <div className="rounded-[1.35rem] border border-dashed border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.04)] px-4 py-5">
                    <p className="font-display text-lg uppercase tracking-[0.14em] text-[var(--paper)]">
                      Guidance inactive
                    </p>
                    <p className="mt-2 text-sm text-[var(--ink-muted)]">
                      {starterGuidanceHints.emptyState}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                      Origin fields stay descriptive in v1. Upbringing alone sets the starter
                      bundle.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.05)] px-4 py-4">
                      <p className="font-display text-lg uppercase tracking-[0.14em] text-[var(--paper)]">
                        {selectedUpbringingLabel} starter bundle
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-muted)]">
                        This guide compares the current sheet against the rulebook starting values.
                        It never blocks manual edits.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {starterGuidanceRows.map((row) => {
                        const isAligned = row.actual === row.target;
                        const isAboveTarget = row.actual > row.target;
                        const rowClassName = isAligned
                          ? "border-[var(--line-soft)] bg-[var(--panel-soft)]"
                          : isAboveTarget
                            ? "border-[color:rgba(255,118,88,0.3)] bg-[color:rgba(255,118,88,0.08)]"
                            : "border-[color:rgba(201,160,80,0.3)] bg-[color:rgba(201,160,80,0.08)]";
                        const formatValue = row.formatValue ?? ((value: number) => String(value));

                        return (
                          <div
                            key={row.key}
                            className={`rounded-[1.2rem] border px-4 py-4 ${rowClassName}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[0.74rem] uppercase tracking-[0.26em] text-[var(--ink-faint)]">
                                  {row.label}
                                </p>
                                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                                  {describeVariance(row.actual, row.target)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-display text-xl uppercase tracking-[0.12em] text-[var(--paper)]">
                                  {formatValue(row.actual)}
                                </p>
                                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                                  target {formatValue(row.target)}
                                </p>
                              </div>
                            </div>
                            {row.hint ? (
                              <p className="mt-3 text-xs text-[var(--ink-muted)]">{row.hint}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {starterGuidance.actual.otherTalents > 0 ? (
                      <p className="rounded-[1.1rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.04)] px-4 py-3 text-sm text-[var(--ink-muted)]">
                        {starterGuidanceHints.otherTalents}
                      </p>
                    ) : null}
                  </div>
                )}
              </SectionCard>
            ) : null}

            <SectionCard
              id="relationships"
              title="Relationships"
              eyebrow="Other PCs"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  disabled={!selectedCharacter || unassignedRelationshipNames.length === 0}
                  onClick={() => {
                    if (!selectedCharacter || unassignedRelationshipNames.length === 0) {
                      return;
                    }

                    runTask(async () => {
                      const updated = await createRepeaterItemAction({
                        characterId: selectedCharacter.id,
                        kind: "relationship",
                        relationshipTargetName: unassignedRelationshipNames[0],
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
                    {otherCharacterNames.length === 0
                      ? "Add another sheet to the roster before defining crew relationships."
                      : "Add one row for each of the other current sheets in your crew."}
                  </p>
                ) : null}
                {selectedCharacter.relationships.map((relationship) => (
                  <div
                    key={relationship.id}
                    className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4"
                  >
                    {(() => {
                      const isCurrentTargetValid = otherCharacterNames.includes(
                        relationship.targetName,
                      );
                      const relationshipTargetOptions = [
                        {
                          value: "",
                          label:
                            otherCharacterNames.length === 0
                              ? "No other sheets in the roster"
                              : "Choose another sheet",
                        },
                        ...(!isCurrentTargetValid && relationship.targetName
                          ? [
                              {
                                value: relationship.targetName,
                                label: `Missing sheet: ${relationship.targetName}`,
                              },
                            ]
                          : []),
                        ...otherCharacterNames
                          .filter(
                            (name) =>
                              name === relationship.targetName ||
                              !selectedCharacter.relationships.some(
                                (otherRelationship) =>
                                  otherRelationship.id !== relationship.id &&
                                  otherRelationship.targetName === name,
                              ),
                          )
                          .map((name) => ({
                            value: name,
                            label: name,
                          })),
                      ];

                      return (
                        <>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${
                          relationship.isBuddy
                            ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
                            : "border-[var(--line-soft)] text-[var(--ink-faint)]"
                        }`}
                        disabled={!isCurrentTargetValid}
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
                          requestCharacterRepeaterRemoval(
                            "relationship",
                            relationship.id,
                            "Relationship",
                            "Relationship removed.",
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4">
                      <SavableSelectField
                        label="Other PC"
                        hint={
                          isCurrentTargetValid
                            ? "Relationships and buddies are always tied to other active sheets."
                            : "This row points to a sheet that no longer exists. Reassign it."
                        }
                        value={relationship.targetName}
                        options={relationshipTargetOptions}
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
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              id="talents"
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
                          requestCharacterRepeaterRemoval(
                            "talent",
                            talent.id,
                            "Talent",
                            "Talent removed.",
                          );
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

            <SectionCard id="armor" title="Armor" eyebrow="Protection">
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
              id="weapons"
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
                      requestCharacterRepeaterRemoval(
                        "weapon",
                        weapon.id,
                        "Weapon",
                        "Weapon removed.",
                      );
                    }}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              id="gear"
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
                        {item.quantity > 1
                          ? `${formatEncumbranceUnits(item.encumbranceUnits * item.quantity)} total (${item.quantity} x ${formatEncumbranceUnits(item.encumbranceUnits)})`
                          : formatEncumbranceUnits(item.encumbranceUnits)}
                      </span>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          requestCharacterRepeaterRemoval(
                            "gear",
                            item.id,
                            "Gear Item",
                            "Gear removed.",
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <SavableTextField
                      label="Item"
                      value={item.name}
                      onCommit={(value) =>
                        commitRepeater("gear", item.id, "name", value)
                      }
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-[140px_160px_180px]">
                      <SavableNumberField
                        label="Quantity"
                        min={1}
                        max={99}
                        value={item.quantity}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "quantity", value)
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
                        label="Load Each"
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
              id="tiny-items"
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
                          requestCharacterRepeaterRemoval(
                            "gear",
                            item.id,
                            "Tiny Item",
                            "Tiny item removed.",
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <SavableTextField
                      label="Item"
                      value={item.name}
                      onCommit={(value) =>
                        commitRepeater("gear", item.id, "name", value)
                      }
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-[140px_220px]">
                      <SavableNumberField
                        label="Quantity"
                        min={1}
                        max={99}
                        value={item.quantity}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "quantity", value)
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
              id="people-ive-met"
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
                          requestCharacterRepeaterRemoval(
                            "contact",
                            contact.id,
                            "Contact",
                            "Contact removed.",
                          );
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

            <SectionCard id="my-cabin" title="My Cabin" eyebrow="Private Space">
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

            <SectionCard id="notes" title="Notes" eyebrow="Back Sheet">
              <div className="grid gap-4">
                <SavableNumberField
                  label="Birr"
                  hint="Edit directly or use Add to apply a positive or negative change."
                  min={MIN_BIRR}
                  value={selectedCharacter.birr}
                  onCommit={(value) => commitField("birr", value)}
                  action={
                    <button
                      type="button"
                      className="coriolis-chip"
                      onClick={openBirrAdjustmentModal}
                    >
                      Add
                    </button>
                  }
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
                  setSelectedPanelId(created.id);
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
      <ConfirmRemovalModal
        pendingRemoval={pendingRemoval}
        onCancel={closeRemovalDialog}
        onConfirm={confirmRemoval}
      />
      <ConditionModifierModal
        key={`${selectedCharacter?.id ?? "none"}-${conditionModifierModalState?.filterTarget ?? "all"}-${conditionModifierModalState?.initialTarget ?? "hitPoints"}`}
        characterName={selectedCharacter?.name ?? "current explorer"}
        isOpen={Boolean(selectedCharacter && conditionModifierModalState)}
        modalState={conditionModifierModalState}
        modifiers={selectedCharacter?.conditionModifiers ?? []}
        onCancel={closeConditionModifierModal}
        onCreate={(input) => {
          if (!selectedCharacter) {
            return;
          }

          runTask(async () => {
            const updated = await createConditionModifierAction({
              characterId: selectedCharacter.id,
              ...input,
            });
            patchCharacter(updated);
          }, "Condition modifier added.");
        }}
        onDelete={(modifier) => requestConditionModifierRemoval(modifier)}
        onUpdate={(modifier, input) => {
          runTask(async () => {
            const updated = await updateConditionModifierAction({
              id: modifier.id,
              ...input,
            });
            patchCharacter(updated);
          }, "Condition modifier updated.");
        }}
      />
      <BirrAdjustmentModal
        key={`${selectedCharacter?.id ?? "none"}-${isBirrAdjustmentOpen ? "open" : "closed"}`}
        currentValue={selectedCharacter?.birr ?? 0}
        isOpen={isBirrAdjustmentOpen}
        onCancel={closeBirrAdjustmentModal}
        onConfirm={applyBirrAdjustment}
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
