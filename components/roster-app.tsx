"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
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
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  TeamScreen,
  getTeamQuickNavSections,
  type TeamQuickNavSectionId,
} from "@/components/team-screen";
import {
  calculateStarterGuidance,
  getEncumbranceCapacityUnits,
  getEncumbranceUsedUnits,
} from "@/lib/coriolis-rules";
import {
  describeSkillDicePoolUk,
  describeVarianceUk,
  formatConditionModifierAppliedLabelUk,
  formatEncumbranceUnitsUk,
  getAttributeLabel,
  getConditionModifierTargetLabel,
  getLocalizedInventoryPreset,
  getOriginCultureLabel,
  getOriginSystemLabel,
  getSkillLabel,
  getTalentSourceLabel,
  getUpbringingLabel,
} from "@/lib/localization";
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
import {
  TEAM_HREF,
  TEAM_PANEL_ID,
  getCharacterHref,
  getPanelIdFromPathname,
} from "@/lib/roster-routes";
import { i18n } from "@/lib/i18n";
import { useLocaleText } from "@/lib/use-locale-text";
import type {
  CharacterConditionModifierRecord,
  CharacterRecord,
  CharacterScalarField,
  CharacterWeaponRecord,
  ConditionModifierTarget,
  InventoryKind,
  InventoryPreset,
  RepeaterKind,
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

type AttributeField = Extract<
  CharacterScalarField,
  "strength" | "agility" | "wits" | "empathy"
>;
type SkillKind = "general" | "advanced";

const attributeSkillSections = [
  {
    field: "strength",
    skills: [
      { field: "meleeCombat", kind: "general" },
      { field: "force", kind: "general" },
    ],
  },
  {
    field: "agility",
    skills: [
      { field: "dexterity", kind: "general" },
      { field: "infiltration", kind: "general" },
      { field: "rangedCombat", kind: "general" },
      { field: "pilot", kind: "advanced" },
    ],
  },
  {
    field: "wits",
    skills: [
      { field: "survival", kind: "general" },
      { field: "observation", kind: "general" },
      { field: "dataDjinn", kind: "advanced" },
      { field: "medicurgy", kind: "advanced" },
      { field: "science", kind: "advanced" },
      { field: "technology", kind: "advanced" },
    ],
  },
  {
    field: "empathy",
    skills: [
      { field: "manipulation", kind: "general" },
      { field: "command", kind: "advanced" },
      { field: "culture", kind: "advanced" },
      { field: "mysticPowers", kind: "advanced" },
    ],
  },
] as const satisfies ReadonlyArray<{
  field: AttributeField;
  skills: ReadonlyArray<{
    field: CharacterSkillField;
    kind: SkillKind;
  }>;
}>;

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
  const { t } = useTranslation();
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
                ? `${label}: ${t("controls.decreaseTo", { value: nextValue })}`
                : `${label}: ${t("controls.setTo", { value: pipValue })}`
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

type QuickNavSectionId =
  | "identity"
  | "appearance"
  | "conditions"
  | "stats"
  | "starter-rules"
  | "relationships"
  | "talents"
  | "armor"
  | "weapons"
  | "gear"
  | "tiny-items"
  | "people-ive-met"
  | "my-cabin"
  | "notes";
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

const birrFormatter = new Intl.NumberFormat("uk-UA");
const MIN_BIRR = 0;
const MAX_BIRR = 999999;

type PendingRemoval = {
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
};

function formatBirr(value: number) {
  return `${birrFormatter.format(value)} ${
    (i18n.resolvedLanguage ?? i18n.language) === "uk" ? "бірр" : "birr"
  }`;
}

function clampBirr(value: number) {
  return Math.min(Math.max(value, MIN_BIRR), MAX_BIRR);
}

function getCharacterQuickNavSections(
  lt: (english: string, ukrainian: string) => string,
) {
  return [
    { id: "identity", label: lt("Identity", "Ідентичність"), eyebrow: lt("Front Sheet", "Лицьовий аркуш") },
    { id: "appearance", label: lt("Appearance", "Зовнішність"), eyebrow: lt("Presence", "Присутність") },
    { id: "conditions", label: lt("Conditions", "Стани"), eyebrow: lt("Trauma", "Травми") },
    { id: "stats", label: lt("Stats", "Характеристики"), eyebrow: lt("Rulebook Matrix", "Матриця правил") },
    { id: "starter-rules", label: lt("Starter Rules", "Стартові правила"), eyebrow: lt("Creation Guide", "Гід створення") },
    { id: "relationships", label: lt("Relationships", "Стосунки"), eyebrow: lt("Other PCs", "Інші ПГ") },
    { id: "talents", label: lt("Talents", "Таланти"), eyebrow: lt("Edge", "Перевага") },
    { id: "armor", label: lt("Armor", "Броня"), eyebrow: lt("Protection", "Захист") },
    { id: "weapons", label: lt("Weapons", "Зброя"), eyebrow: lt("Loadout", "Оснащення") },
    { id: "gear", label: lt("Gear", "Спорядження"), eyebrow: lt("Encumbrance", "Навантаження") },
    { id: "tiny-items", label: lt("Tiny Items", "Дрібниці"), eyebrow: lt("Pocket Rituals", "Кишенькові ритуали") },
    { id: "people-ive-met", label: lt("Contacts", "Контакти"), eyebrow: lt("People I've Met", "Ті, кого я зустрів") },
    { id: "my-cabin", label: lt("My Cabin", "Моя каюта"), eyebrow: lt("Private Space", "Особистий простір") },
    { id: "notes", label: lt("Notes", "Нотатки"), eyebrow: lt("Back Sheet", "Зворотний аркуш") },
  ] as const;
}

function HeaderQuickNav<TSectionId extends string>({
  activeLabel,
  activeSectionId,
  ariaLabel,
  description,
  onJumpToSection,
  sections,
}: HeaderQuickNavProps<TSectionId>) {
  const { t } = useTranslation();

  return (
    <div className="coriolis-quick-nav">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.36em] text-[var(--ink-faint)]">
            {t("common.quickNav.label")}
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
  const { t } = useTranslation();
  const { lt } = useLocaleText();
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
            <p className="coriolis-modal__eyebrow">{lt("Removal Confirmation", "Підтвердження видалення")}</p>
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
            {t("common.actions.cancel")}
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
  const { t } = useTranslation();
  const { lt } = useLocaleText();
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
            <p className="coriolis-modal__eyebrow">{lt("Birr Adjustment", "Коригування біррів")}</p>
            <h2 id={titleId} className="coriolis-modal__title">
              {lt("Adjust birr", "Налаштувати бірри")}
            </h2>
            <p id={descriptionId} className="coriolis-modal__description">
              {lt(
                "Enter a positive number to add birr, or a negative one to subtract it.",
                "Введіть додатне число, щоб додати бірри, або від'ємне, щоб їх відняти.",
              )}
            </p>
          </div>
        </div>
        <div className="coriolis-modal__body">
          <label htmlFor={inputId} className="flex flex-col gap-2">
            <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
              {lt("Amount to add or subtract", "Сума для додавання або віднімання")}
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
              <span>{lt("Current amount", "Поточна сума")}</span>
              <strong className="text-[var(--paper)]">{formatBirr(currentValue)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{lt("Final amount", "Підсумкова сума")}</span>
              <strong className="text-[var(--paper)]">{formatBirr(nextValue)}</strong>
            </div>
          </div>
        </div>
        <div className="coriolis-modal__actions">
          <button type="button" className="coriolis-chip" onClick={onCancel}>
            {t("common.actions.cancel")}
          </button>
          <button type="submit" className="coriolis-chip" disabled={isUnchanged}>
            {t("common.actions.apply")}
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
  return formatConditionModifierAppliedLabelUk(count);
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
  const { t } = useTranslation();
  const { lt } = useLocaleText();
  const conditionModifierTargetOptions = conditionModifierTargetValues.map((value) => ({
    value,
    label: getConditionModifierTargetLabel(value),
  }));
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
          {getConditionModifierTargetLabel(modifier.target)}
        </p>
        <button
          type="button"
          className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
          onClick={onDelete}
        >
          {t("common.actions.remove")}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_140px]">
        <label className="flex flex-col gap-2">
          <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
            {lt("Affects", "Впливає на")}
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
            {lt("Name", "Назва")}
          </span>
          <input
            className="coriolis-input"
            value={name}
            placeholder={lt("Exo shell reinforcement", "Підсилення екзокостюма")}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
            {lt("Modifier", "Модифікатор")}
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
          {lt("Description", "Опис")}
        </span>
        <textarea
          className="coriolis-textarea"
          rows={3}
          value={description}
          placeholder={lt(
            "Why does this modifier exist, and when does it matter?",
            "Чому існує цей модифікатор і коли він має значення.",
          )}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="coriolis-chip" disabled={isUnchanged}>
          {t("common.actions.save")}
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
  const { t } = useTranslation();
  const { lt } = useLocaleText();
  const conditionModifierTargetOptions = conditionModifierTargetValues.map((value) => ({
    value,
    label: getConditionModifierTargetLabel(value),
  }));
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
        className="coriolis-modal__dialog coriolis-modal__dialog--condition-modifiers"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="coriolis-modal__header coriolis-modal__header--condition-modifiers">
          <div className="coriolis-modal__copy coriolis-modal__copy--condition-modifiers">
            <p className="coriolis-modal__eyebrow">{lt("Conditions", "Стани")}</p>
            <h2 id={titleId} className="coriolis-modal__title">
              {lt("Condition Modifier Tracking", "Відстеження модифікаторів стану")}
            </h2>
            <p id={descriptionId} className="coriolis-modal__description">
              {lt(
                `Add lasting effects for ${characterName}. Modifiers adjust maximum hit points, mind points, or radiation and are stored in the database.`,
                `Додавайте тривалі ефекти для ${characterName}. Модифікатори змінюють максимальні значення очок здоров'я, очок розуму або радіації та зберігаються в базі даних.`,
              )}
            </p>
          </div>
        </div>

        <div className="coriolis-modal__body coriolis-modal__body--condition-modifiers">
          <div className="grid shrink-0 gap-4 rounded-[1.2rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.05)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-lg uppercase tracking-[0.12em] text-[var(--paper)]">
                {lt("Add Modifier", "Додати модифікатор")}
              </p>
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                {lt("Show", "Показати")}
                <select
                  className="coriolis-select min-w-[170px]"
                  value={filterTarget}
                  onChange={(event) =>
                    setFilterTarget(event.target.value as ConditionModifierTarget | "all")
                  }
                >
                  <option value="all">{lt("All modifiers", "Усі модифікатори")}</option>
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
                    {lt("Affects", "Впливає на")}
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
                    {lt("Name", "Назва")}
                  </span>
                  <input
                    className="coriolis-input"
                    value={createName}
                    placeholder={lt("Blessed talisman", "Благословенний талісман")}
                    onChange={(event) => setCreateName(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                    {lt("Modifier", "Модифікатор")}
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
                  {lt("Description", "Опис")}
                </span>
                <textarea
                  className="coriolis-textarea"
                  rows={3}
                  value={createDescription}
                  placeholder={lt("A short note about why this changed.", "Коротка нотатка про причину змін.")}
                  onChange={(event) => setCreateDescription(event.target.value)}
                />
              </label>

              <div className="flex justify-end">
                <button type="submit" className="coriolis-chip">
                  {lt("Add Modifier", "Додати модифікатор")}
                </button>
              </div>
            </form>
          </div>

          <div className="grid min-h-[12rem] flex-1 content-start gap-4 overflow-y-auto pr-1">
            {visibleModifiers.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                {lt("There are no modifiers in this view yet.", "У цьому поданні ще немає модифікаторів.")}
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

        <div className="coriolis-modal__actions coriolis-modal__actions--condition-modifiers">
          <button type="button" className="coriolis-chip" onClick={onCancel}>
            {t("common.actions.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RosterApp({
  initialCharacters,
  inventoryCatalog,
  initialTeam,
}: RosterAppProps) {
  const { t } = useTranslation();
  const { lt } = useLocaleText();
  const allQuickNavSections = useMemo(() => getCharacterQuickNavSections(lt), [lt]);
  const teamQuickNavSections = useMemo(() => getTeamQuickNavSections(lt), [lt]);
  const router = useRouter();
  const pathname = usePathname();
  const [characters, setCharacters] = useState(initialCharacters);
  const [pendingSkillEdits, setPendingSkillEdits] =
    useState<PendingOptimisticCharacterSkillEdits>({});
  const [team, setTeam] = useState(initialTeam);
  const [drawerKind, setDrawerKind] = useState<InventoryKind | null>(null);
  const [notice, setNotice] = useState<string | null>(
    lt(
      "Autosaves on blur. Shared crew data and character sheets stay in sync.",
      "Автозбереження працює при втраті фокуса. Спільні дані екіпажу й аркуші персонажів залишаються синхронізованими.",
    ),
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

  const selectedPanelId = getPanelIdFromPathname(pathname);
  const isTeamSelected = selectedPanelId === TEAM_PANEL_ID;
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
  const originCultureOptions = [
    { value: "", label: lt("Choose origin culture", "Оберіть культуру походження") },
    ...originCultureValues.map((value) => ({
      value,
      label: getOriginCultureLabel(value),
    })),
  ];
  const originSystemOptions = [
    { value: "", label: lt("Choose home system", "Оберіть домашню систему") },
    ...originSystemValues.map((value) => ({
      value,
      label: getOriginSystemLabel(value),
    })),
  ];
  const upbringingOptions = [
    { value: "", label: lt("Choose upbringing", "Оберіть виховання") },
    ...upbringingValues.map((value) => ({
      value,
      label: getUpbringingLabel(value),
    })),
  ];
  const talentSourceOptions = [
    { value: "group", label: getTalentSourceLabel("group") },
    { value: "concept", label: getTalentSourceLabel("concept") },
    { value: "icon", label: getTalentSourceLabel("icon") },
    { value: "other", label: getTalentSourceLabel("other") },
  ];
  const encumbrancePresets = [
    { value: "0", label: lt("Tiny", "Дрібне") },
    { value: "1", label: lt("Light", "Легке") },
    { value: "2", label: lt("Normal", "Звичайне") },
    { value: "4", label: lt("Heavy", "Важке") },
    { value: "6", label: lt("3 rows", "3 рядки") },
    { value: "8", label: lt("4 rows", "4 рядки") },
    { value: "10", label: lt("5 rows", "5 рядків") },
    { value: "12", label: lt("6 rows", "6 рядків") },
  ];
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
      router.replace(characters[0] ? getCharacterHref(characters[0].id) : TEAM_HREF);
    }
  }, [characters, isTeamSelected, router, selectedCharacter]);

  useEffect(() => {
    setActiveSectionId(allQuickNavSections[0].id);
  }, [allQuickNavSections, selectedCharacterId]);

  useEffect(() => {
    if (!isTeamSelected) {
      return;
    }

    setActiveTeamSectionId(teamQuickNavSections[0].id);
  }, [isTeamSelected, team.id, teamQuickNavSections]);

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
  }, [allQuickNavSections, isStarterRulesHidden, selectedCharacterId]);

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
  }, [isTeamSelected, team.id, teamQuickNavSections]);

  function getSkillRequestKey(characterId: string, field: CharacterSkillField) {
    return `${characterId}:${field}`;
  }

  function navigateToPanel(panelId: string, mode: "push" | "replace" = "push") {
    const href = panelId === TEAM_PANEL_ID ? TEAM_HREF : getCharacterHref(panelId);

    if (mode === "replace") {
      router.replace(href);
      return;
    }

    router.push(href);
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
        setNotice(error instanceof Error ? error.message : lt("Something went wrong.", "Сталася помилка."));
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
      confirmLabel: lt("Remove", "Прибрати"),
      description: lt(
        `This permanently removes the ${getConditionModifierTargetLabel(modifier.target).toLowerCase()} modifier from ${selectedCharacter?.name ?? "the current sheet"}.`,
        `Це назавжди прибере модифікатор «${getConditionModifierTargetLabel(modifier.target).toLowerCase()}» з ${selectedCharacter?.name ?? "поточного аркуша"}.`,
      ),
      onConfirm: () => {
        runTask(async () => {
          const updated = await deleteConditionModifierAction(modifier.id);
          patchCharacter(updated);
        }, lt("Condition modifier removed.", "Модифікатор стану прибрано."));
      },
      title: lt(
        `Remove ${modifier.name.trim() || getConditionModifierTargetLabel(modifier.target)}?`,
        `Прибрати ${modifier.name.trim() || getConditionModifierTargetLabel(modifier.target)}?`,
      ),
    });
  }

  function requestCharacterDeletion(character: CharacterRecord) {
    requestRemoval({
      confirmLabel: lt("Delete Sheet", "Видалити аркуш"),
      description: lt(
        `This permanently removes ${character.name} and all of the sheet's relationships, talents, weapons, gear, contacts, and condition modifiers.`,
        `Це назавжди видалить ${character.name} разом з усіма зв'язками, талантами, зброєю, спорядженням, контактами та модифікаторами стану.`,
      ),
      onConfirm: () => {
        runTask(async () => {
          const remaining = await deleteCharacterAction(character.id);
          setCharacters((currentCharacters) =>
            mergeCharacterListWithPreservedSkills(currentCharacters, remaining),
          );
          navigateToPanel(remaining[0]?.id ?? TEAM_PANEL_ID, "replace");
        }, lt("Sheet removed.", "Аркуш видалено."));
      },
      title: lt(`Delete ${character.name}?`, `Видалити ${character.name}?`),
    });
  }

  function requestCharacterRepeaterRemoval(
    kind: RepeaterKind,
    id: string,
    entryLabel: string,
    successMessage: string,
    ) {
    requestRemoval({
      confirmLabel: lt("Remove", "Прибрати"),
      description: lt(
        `This permanently removes ${entryLabel.toLowerCase()} from ${selectedCharacter?.name ?? "the current sheet"}.`,
        `Це назавжди прибере «${entryLabel.toLowerCase()}» з ${selectedCharacter?.name ?? "поточного аркуша"}.`,
      ),
      onConfirm: () => {
        runTask(async () => {
          const updated = await deleteRepeaterItemAction({ kind, id });
          patchCharacter(updated);
        }, successMessage);
      },
      title: lt(`Remove ${entryLabel}?`, `Прибрати ${entryLabel}?`),
    });
  }

  function requestTeamRepeaterRemoval(
    kind: Exclude<TeamRepeaterKind, "crewPosition">,
    id: string,
    entryLabel: string,
    ) {
    requestRemoval({
      confirmLabel: lt("Remove", "Прибрати"),
      description: lt(
        `This permanently removes ${entryLabel.toLowerCase()} from the shared team ledger.`,
        `Це назавжди прибере «${entryLabel.toLowerCase()}» зі спільного журналу команди.`,
      ),
      onConfirm: () => {
        runTask(async () => {
          const updated = await deleteTeamRepeaterItemAction({ kind, id });
          patchTeam(updated);
        }, lt("Team ledger updated.", "Журнал команди оновлено."));
      },
      title: lt(`Remove ${entryLabel}?`, `Прибрати ${entryLabel}?`),
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
        throw new Error(payload.error ?? lt("Portrait upload failed.", "Не вдалося завантажити портрет."));
      }

      patchCharacter(payload.character);
      setNotice(lt("Portrait updated.", "Портрет оновлено."));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : lt("Portrait upload failed.", "Не вдалося завантажити портрет."),
      );
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
        throw new Error(payload.error ?? lt("Portrait upload failed.", "Не вдалося завантажити портрет."));
      }

      patchTeam(payload.team);
      setNotice(lt("Known-face portrait updated.", "Портрет знайомого обличчя оновлено."));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : lt("Portrait upload failed.", "Не вдалося завантажити портрет."),
      );
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
      ? getUpbringingLabel(starterGuidance.selectedUpbringing)
      : null;
  const starterGuidanceRows =
    starterGuidance?.target
      ? [
          {
            key: "attributePoints",
            label: lt("Attribute Points", "Очки атрибутів"),
            actual: starterGuidance.actual.attributePoints,
            target: starterGuidance.target.attributePoints,
          },
          {
            key: "skillPoints",
            label: lt("Skill Points", "Очки навичок"),
            actual: starterGuidance.actual.skillPoints,
            target: starterGuidance.target.skillPoints,
          },
          {
            key: "groupTalents",
            label: lt("Group Talents", "Групові таланти"),
            actual: starterGuidance.actual.groupTalents,
            target: starterGuidance.target.groupTalents,
          },
          {
            key: "conceptTalents",
            label: lt("Personal Talents", "Особисті таланти"),
            actual: starterGuidance.actual.conceptTalents,
            target: starterGuidance.target.conceptTalents,
          },
          {
            key: "iconTalents",
            label: lt("Icon Talents", "Іконні таланти"),
            actual: starterGuidance.actual.iconTalents,
            target: starterGuidance.target.iconTalents,
          },
          {
            key: "totalTalents",
            label: lt("Total Talents", "Усього талантів"),
            actual: starterGuidance.actual.totalTalents,
            target: starterGuidance.target.totalTalents,
          },
          {
            key: "baseReputation",
            label: lt("Base Upbringing Reputation", "Базова репутація виховання"),
            actual: starterGuidance.actual.reputation,
            target: starterGuidance.target.baseReputation,
            hint:
              lt(
                "Only the base reputation from upbringing is counted here. Concept modifiers and humanite exceptions are not modeled in v1.",
                "Лише базова репутація від виховання. Модифікатори концепту та винятки humanite у v1 не моделюються.",
              ),
          },
          {
            key: "startingCapital",
            label: lt("Starting Capital", "Стартовий капітал"),
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
    setNotice(
      lt(
        "Starter rules hidden. Use Show Starter Rules to bring the guide back.",
        "Стартові правила приховано. Використайте «Показати стартові правила», щоб повернути підказки.",
      ),
    );
  }

  function showStarterRules() {
    setIsStarterRulesHidden(false);
    setNotice(lt("Starter rules guide restored.", "Гід стартових правил відновлено."));
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
                  {lt("Crew & Character Roster", "Реєстр екіпажу й персонажів")}
                </p>
                <h1 className="font-display text-3xl uppercase tracking-[0.16em] text-[var(--paper)] md:text-4xl">
                  {lt("Coriolis Dossier", "Досьє Коріоліса")}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LanguageSwitcher />
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => {
                    runTask(async () => {
                      const created = await createCharacterAction();
                      setCharacters((currentCharacters) => [...currentCharacters, created]);
                      navigateToPanel(created.id);
                    }, lt("New sheet opened.", "Новий аркуш відкрито."));
                  }}
                >
                  {t("common.actions.new")}
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
                      lt("Rename this sheet", "Перейменувати цей аркуш"),
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
                    }, lt("Sheet renamed.", "Аркуш перейменовано."));
                  }}
                >
                  {t("common.actions.rename")}
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
                  {t("common.actions.delete")}
                </button>
                {isStarterRulesHidden ? (
                  <button
                    type="button"
                    className="coriolis-chip"
                    onClick={showStarterRules}
                  >
                    {lt("Show Starter Rules", "Показати стартові правила")}
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
                onClick={() => navigateToPanel(TEAM_PANEL_ID)}
              >
                {lt("Team", "Команда")}
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
                    onClick={() => navigateToPanel(character.id)}
                  >
                    {character.name}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-1 text-sm text-[var(--ink-muted)] md:flex-row md:items-center md:justify-between">
              <p>{notice}</p>
              <p>
                {isPending || isUploading
                  ? lt(
                      "Synchronizing with the ship ledger...",
                      "Синхронізація з корабельним журналом...",
                    )
                  : t("common.states.ready")}
              </p>
            </div>

            {selectedCharacter ? (
              <HeaderQuickNav
                activeLabel={activeNavSection.label}
                activeSectionId={activeSectionId}
                ariaLabel={lt("Quick navigation", "Швидка навігація")}
                description={lt(
                  "Jump straight to the part of the dossier you need.",
                  "Переходьте одразу до потрібної частини досьє.",
                )}
                onJumpToSection={jumpToSection}
                sections={quickNavSections}
              />
            ) : null}

            {isTeamSelected ? (
              <HeaderQuickNav
                activeLabel={activeTeamNavSection.label}
                activeSectionId={activeTeamSectionId}
                ariaLabel={lt("Quick navigation", "Швидка навігація")}
                description={lt(
                  "Jump straight to the part of the crew dossier you need.",
                  "Переходьте одразу до потрібної частини досьє екіпажу.",
                )}
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
              onOpenCharacter={(characterId) => navigateToPanel(characterId)}
              onUpdateField={(field, value) =>
                commitTeamField(field as TeamScalarField, value)
              }
              onCreateRepeater={(kind, options) => {
                runTask(async () => {
                  const updated = await createTeamRepeaterItemAction({
                    teamId: team.id,
                    kind,
                    parentBeatId: options?.parentBeatId,
                  });
                  patchTeam(updated);
                }, lt("Team ledger updated.", "Журнал команди оновлено."));
              }}
              onUpdateRepeater={(kind, id, field, value) =>
                commitTeamRepeater(kind as TeamRepeaterKind, id, field, value)
              }
              onRemoveRepeater={(kind, id) => {
                const entryLabels: Record<Exclude<TeamRepeaterKind, "crewPosition">, string> = {
                  factionTie: lt("faction tie", "зв'язок із фракцією"),
                  knownFace: lt("known face", "знайоме обличчя"),
                  note: lt("note", "нотатка"),
                  storyBeat: lt("story event", "подія історії"),
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
                  navigateToPanel(result.character.id);
                }, lt("Known face promoted to the crew.", "Знайоме обличчя переведено до екіпажу."));
              }}
            />
          </main>
        ) : selectedCharacter ? (
          <main className="grid gap-4 lg:grid-cols-2 xl:gap-5">
            <SectionCard
              id="identity"
              title={lt("Identity", "Ідентичність")}
              eyebrow={lt("Front Sheet", "Лицьовий аркуш")}
              className="lg:col-span-2"
            >
              <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.05)] p-4">
                  <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[1.2rem] border border-[var(--line-soft)] bg-[radial-gradient(circle_at_top,_rgba(201,160,80,0.28),_rgba(19,24,36,0.2)_48%,_rgba(8,10,16,0.88)_100%)]">
                    {selectedCharacter.portraitPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedCharacter.portraitPath}
                        alt={lt(
                          `${selectedCharacter.name} portrait`,
                          `Портрет ${selectedCharacter.name}`,
                        )}
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
                          {lt(
                            "Load a portrait to turn the sheet into a proper station dossier.",
                            "Завантажте портрет, щоб перетворити аркуш на повноцінне станційне досьє.",
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <label className="mt-4 flex cursor-pointer items-center justify-center rounded-full border border-[var(--gold)] bg-[color:rgba(201,160,80,0.12)] px-4 py-3 text-sm uppercase tracking-[0.24em] text-[var(--paper)] transition hover:bg-[color:rgba(201,160,80,0.2)]">
                    {isUploading
                      ? lt("Uploading...", "Завантаження...")
                      : lt("Load Image", "Завантажити зображення")}
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
                        {lt("Encumbrance", "Навантаження")}
                      </p>
                      <p className="mt-2 text-lg text-[var(--paper)]">
                        {encumbranceUsed}/{encumbranceCapacity}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {lt("half-row units", "одиниці півряду")}
                      </p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] px-3 py-3">
                      <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                        {lt("Vitality", "Живучість")}
                      </p>
                      <p className="mt-2 text-lg text-[var(--paper)]">
                        {selectedCharacter.currentHitPoints}/{selectedCharacter.maxHitPoints}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {lt("hit points", "очки здоров&#39;я")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SavableTextField
                    label={lt("Name", "Ім'я")}
                    value={selectedCharacter.name}
                    onCommit={(value) => commitField("name", value)}
                  />
                  <SavableSelectField
                    label={lt("Origin Culture", "Культура походження")}
                    value={selectedCharacter.originCulture ?? ""}
                    options={originCultureOptions}
                    onCommit={(value) => commitField("originCulture", value)}
                  />
                  <SavableSelectField
                    label={lt("Home System", "Домашня система")}
                    value={selectedCharacter.originSystem ?? ""}
                    options={originSystemOptions}
                    onCommit={(value) => commitField("originSystem", value)}
                  />
                  <SavableSelectField
                    label={lt("Upbringing", "Виховання")}
                    value={selectedCharacter.upbringing ?? ""}
                    options={upbringingOptions}
                    onCommit={(value) => commitField("upbringing", value)}
                  />
                  <SavableTextField
                    label={lt("Background", "Походження")}
                    value={selectedCharacter.background}
                    onCommit={(value) => commitField("background", value)}
                  />
                  <SavableTextField
                    label={lt("Concept", "Концепт")}
                    value={selectedCharacter.concept}
                    onCommit={(value) => commitField("concept", value)}
                  />
                  <SavableTextField
                    label={lt("Icon", "Ікона")}
                    value={selectedCharacter.icon}
                    onCommit={(value) => commitField("icon", value)}
                  />
                  <SavableTextField
                    label={lt("Group Concept", "Концепт команди")}
                    value={selectedCharacter.groupConcept}
                    onCommit={(value) => commitField("groupConcept", value)}
                  />
                  <SavableNumberField
                    label={lt("Reputation", "Репутація")}
                    min={0}
                    max={12}
                    value={selectedCharacter.reputation}
                    onCommit={(value) => commitField("reputation", value)}
                  />
                  <SavableTextField
                    className="md:col-span-2"
                    label={lt("Description", "Опис")}
                    multiline
                    rows={3}
                    value={selectedCharacter.description}
                    onCommit={(value) => commitField("description", value)}
                  />
                  <SavableTextField
                    className="md:col-span-2"
                    label={lt("Personal Problem", "Особиста проблема")}
                    multiline
                    rows={3}
                    value={selectedCharacter.personalProblem}
                    onCommit={(value) => commitField("personalProblem", value)}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="appearance"
              title={lt("Appearance", "Зовнішність")}
              eyebrow={lt("Presence", "Присутність")}
            >
              <div className="grid gap-4">
                <SavableTextField
                  label={lt("Face", "Обличчя")}
                  multiline
                  rows={3}
                  value={selectedCharacter.face}
                  onCommit={(value) => commitField("face", value)}
                />
                <SavableTextField
                  label={lt("Clothing", "Одяг")}
                  multiline
                  rows={3}
                  value={selectedCharacter.clothing}
                  onCommit={(value) => commitField("clothing", value)}
                />
              </div>
            </SectionCard>

            <SectionCard
              id="conditions"
              title={lt("Conditions", "Стани")}
              eyebrow={lt("Trauma", "Травми")}
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => openConditionModifierModal("all", "hitPoints")}
                >
                  {lt("Add Modifier", "Додати модифікатор")}
                </button>
              }
            >
              <div className="grid gap-4">
                <CounterTrack
                  label={lt(
                    `Hit Points (max ${selectedCharacter.maxHitPoints})`,
                    `Очки здоров'я (макс. ${selectedCharacter.maxHitPoints})`,
                  )}
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
                  label={lt(
                    `Mind Points (max ${selectedCharacter.maxMindPoints})`,
                    `Очки розуму (макс. ${selectedCharacter.maxMindPoints})`,
                  )}
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
                  label={lt(
                    `Radiation (max ${selectedCharacter.maxRadiation})`,
                    `Радіація (макс. ${selectedCharacter.maxRadiation})`,
                  )}
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
                  label={lt("Experience", "Досвід")}
                  min={0}
                  hint={lt(
                    "Bank XP freely. Every 5 XP can become a new talent or skill advance.",
                    "Вільно накопичуйте XP. Кожні 5 XP можна перетворити на новий талант або розвиток навички.",
                  )}
                  value={selectedCharacter.experience}
                  onCommit={(value) => commitField("experience", value)}
                />
                <SavableTextField
                  label={lt("Critical Injuries", "Критичні травми")}
                  multiline
                  rows={4}
                  value={selectedCharacter.criticalInjuries}
                  onCommit={(value) => commitField("criticalInjuries", value)}
                />
              </div>
            </SectionCard>

            <SectionCard
              id="stats"
              title={lt("Attributes + Skills", "Атрибути й навички")}
              eyebrow={lt("Rulebook Matrix", "Матриця правил")}
              className="lg:col-span-2"
            >
              <div className="grid gap-5">
                <div className="grid items-start gap-4 xl:grid-cols-2">
                  {attributeSkillSections.map((section) => {
                    const attributeValue = selectedCharacter[section.field] as number;

                    return (
                      <article key={section.field} className="coriolis-stat-cluster">
                        <div className="coriolis-stat-cluster__header">
                          <div className="space-y-2">
                            <div>
                              <p className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--ink-faint)]">
                                {lt("Attribute", "Атрибут")}
                              </p>
                              <h3 className="font-display text-2xl uppercase tracking-[0.12em] text-[var(--paper)]">
                                {getAttributeLabel(section.field)}
                              </h3>
                            </div>
                            <p className="max-w-[32rem] text-sm text-[var(--ink-muted)]">
                              {section.field === "strength" &&
                                lt("Raw power and physique", "Груба сила й фізична витривалість")}
                              {section.field === "agility" &&
                                lt("Control, reflexes, motion", "Контроль, рефлекси й рух")}
                              {section.field === "wits" &&
                                lt("Instinct, analysis, awareness", "Інстинкт, аналіз і уважність")}
                              {section.field === "empathy" &&
                                lt(
                                  "Presence, empathy, persuasion",
                                  "Присутність, співпереживання й переконання",
                                )}
                            </p>
                          </div>
                          <div className="coriolis-stat-cluster__value">
                            <span className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                              {lt("Base", "База")}
                            </span>
                            <strong className="font-display text-3xl uppercase tracking-[0.08em] text-[var(--paper)]">
                              {attributeValue}
                            </strong>
                          </div>
                        </div>

                        <div className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.04)] px-4 py-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                              {lt("Attribute value", "Значення атрибута")}
                            </p>
                            <p className="text-sm text-[var(--ink-muted)]">{attributeValue}/5</p>
                          </div>
                          <ValuePips
                            label={lt(
                              `${getAttributeLabel(section.field)} attribute`,
                              `${getAttributeLabel(section.field)} атрибут`,
                            )}
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
                                        {getSkillLabel(skill.field)}
                                      </p>
                                      <span
                                        className={`coriolis-skill-chip ${
                                          skill.kind === "advanced"
                                            ? "coriolis-skill-chip--advanced"
                                            : ""
                                        }`}
                                      >
                                        {skill.kind === "advanced"
                                          ? lt("advanced", "просунута")
                                          : lt("general", "загальна")}
                                      </span>
                                      {canRoll ? null : (
                                        <span className="coriolis-skill-chip coriolis-skill-chip--locked">
                                          {lt("Locked", "Заблоковано")}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-[var(--ink-muted)]">
                                      {describeSkillDicePoolUk(
                                        attributeValue,
                                        skillValue,
                                        skill.kind,
                                      )}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                                      {lt("Skill", "Навичка")}
                                    </p>
                                    <p className="font-display text-2xl uppercase tracking-[0.08em] text-[var(--paper)]">
                                      {skillValue}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <ValuePips
                                    label={getSkillLabel(skill.field)}
                                    max={5}
                                    value={skillValue}
                                    onCommit={(value) => commitField(skill.field, value)}
                                  />
                                  <div className="rounded-full border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.06)] px-3 py-1 text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ink)]">
                                    {dicePool === null
                                      ? lt("Needs training", "Потрібне навчання")
                                      : lt(`${dicePool} dice`, `${dicePool} кубів`)}
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
                title={lt("Starter Rules", "Стартові правила")}
                eyebrow={lt("Creation Guide", "Гід створення")}
                actions={
                  <button
                    type="button"
                    className="coriolis-chip"
                    onClick={hideStarterRules}
                  >
                    {t("common.actions.hide")}
                  </button>
                }
              >
                {!starterGuidance?.target ? (
                  <div className="rounded-[1.35rem] border border-dashed border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.04)] px-4 py-5">
                    <p className="font-display text-lg uppercase tracking-[0.14em] text-[var(--paper)]">
                      {lt("Guidance inactive", "Підказки неактивні")}
                    </p>
                    <p className="mt-2 text-sm text-[var(--ink-muted)]">
                      {lt(
                        "Choose an upbringing to activate starter guidance.",
                        "Оберіть виховання, щоб активувати стартові підказки.",
                      )}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                      {lt(
                        "Origin fields stay descriptive in v1. Upbringing alone sets the starter bundle.",
                        "Поля походження у v1 залишаються описовими. Лише виховання визначає стартовий набір.",
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="rounded-[1.35rem] border border-[var(--line-soft)] bg-[color:rgba(248,238,216,0.05)] px-4 py-4">
                      <p className="font-display text-lg uppercase tracking-[0.14em] text-[var(--paper)]">
                        {lt(
                          `${selectedUpbringingLabel} starter bundle`,
                          `${selectedUpbringingLabel} стартовий набір`,
                        )}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-muted)]">
                        {lt(
                          "This guide compares the current sheet against the rulebook starting values. It never blocks manual edits.",
                          "Цей блок порівнює поточний аркуш зі стартовими значеннями з книги правил. Він ніколи не блокує ручні зміни.",
                        )}
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
                                  {describeVarianceUk(row.actual, row.target)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-display text-xl uppercase tracking-[0.12em] text-[var(--paper)]">
                                  {formatValue(row.actual)}
                                </p>
                                <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                                  {lt(`target ${formatValue(row.target)}`, `ціль ${formatValue(row.target)}`)}
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
                        {lt(
                          'Other-tagged talents count toward the total row, but they do not have a dedicated rulebook starter target.',
                          "Таланти з позначкою «Інше» враховуються в загальному підсумку, але не мають окремої стартової цілі з книги правил.",
                        )}
                      </p>
                    ) : null}
                  </div>
                )}
              </SectionCard>
            ) : null}

            <SectionCard
              id="relationships"
              title={lt("Relationships", "Стосунки")}
              eyebrow={lt("Other PCs", "Інші ПГ")}
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
                    }, lt("Relationship row added.", "Рядок стосунків додано."));
                  }}
                >
                  {lt("Add Row", "Додати рядок")}
                </button>
              }
            >
              <div className="grid gap-4">
                {selectedCharacter.relationships.length === 0 ? (
                  <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                    {otherCharacterNames.length === 0
                      ? lt(
                          "Add one more sheet to the roster before defining crew relationships.",
                          "Додайте до реєстру ще один аркуш, перш ніж визначати стосунки в екіпажі.",
                        )
                      : lt(
                          "Add one row for every other active sheet in your crew.",
                          "Додайте по одному рядку для кожного іншого активного аркуша у вашому екіпажі.",
                        )}
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
                              ? lt("There are no other sheets in the roster", "У реєстрі немає інших аркушів")
                              : lt("Choose another sheet", "Оберіть інший аркуш"),
                        },
                        ...(!isCurrentTargetValid && relationship.targetName
                          ? [
                              {
                                value: relationship.targetName,
                                label: lt(
                                  `Missing sheet: ${relationship.targetName}`,
                                  `Відсутній аркуш: ${relationship.targetName}`,
                                ),
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
                          }, lt("Buddy updated.", "Напарника оновлено."));
                        }}
                      >
                        {relationship.isBuddy
                          ? lt("Buddy", "Напарник")
                          : lt("Mark as Buddy", "Позначити напарником")}
                      </button>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          requestCharacterRepeaterRemoval(
                            "relationship",
                            relationship.id,
                            lt("relationship", "стосунок"),
                            lt("Relationship removed.", "Стосунок видалено."),
                          );
                        }}
                      >
                        {t("common.actions.remove")}
                      </button>
                    </div>
                    <div className="grid gap-4">
                      <SavableSelectField
                        label={lt("Other PC", "Інший ПГ")}
                        hint={
                          isCurrentTargetValid
                            ? lt(
                                "Relationships and buddies always point to other active sheets.",
                                "Стосунки й напарники завжди прив'язані до інших активних аркушів.",
                              )
                            : lt(
                                "This row points to a sheet that no longer exists. Assign another one.",
                                "Цей рядок вказує на аркуш, якого більше не існує. Призначте інший.",
                              )
                        }
                        value={relationship.targetName}
                        options={relationshipTargetOptions}
                        onCommit={(value) =>
                          commitRepeater("relationship", relationship.id, "targetName", value)
                        }
                      />
                      <SavableTextField
                        label={lt("Relationship", "Стосунок")}
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
              title={lt("Talents", "Таланти")}
              eyebrow={lt("Edge", "Перевага")}
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
                    }, lt("Talent row added.", "Рядок таланту додано."));
                  }}
                >
                  {lt("Add Talent", "Додати талант")}
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
                            lt("talent", "талант"),
                            lt("Talent removed.", "Талант видалено."),
                          );
                        }}
                      >
                        {t("common.actions.remove")}
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                      <SavableTextField
                        label={lt("Talent", "Талант")}
                        value={talent.name}
                        onCommit={(value) =>
                          commitRepeater("talent", talent.id, "name", value)
                        }
                      />
                      <SavableSelectField
                        label={lt("Source", "Джерело")}
                        value={talent.source}
                        options={talentSourceOptions}
                        onCommit={(value) =>
                          commitRepeater("talent", talent.id, "source", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label={lt("Notes", "Нотатки")}
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

            <SectionCard id="armor" title={lt("Armor", "Броня")} eyebrow={lt("Protection", "Захист")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SavableTextField
                  label={lt("Armor", "Броня")}
                  value={selectedCharacter.armorName}
                  onCommit={(value) => commitField("armorName", value)}
                />
                <SavableNumberField
                  label={lt("Rating", "Рейтинг")}
                  min={0}
                  max={12}
                  value={selectedCharacter.armorRating}
                  onCommit={(value) => commitField("armorRating", value)}
                />
                <SavableTextField
                  className="sm:col-span-2"
                  label={lt("Comment", "Коментар")}
                  multiline
                  rows={3}
                  value={selectedCharacter.armorComment}
                  onCommit={(value) => commitField("armorComment", value)}
                />
              </div>
            </SectionCard>

            <SectionCard
              id="weapons"
              title={lt("Weapons", "Зброя")}
              eyebrow={lt("Loadout", "Оснащення")}
              className="lg:col-span-2"
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => setDrawerKind("weapon")}
                >
                  {lt("Add from Catalog", "Додати з каталогу")}
                </button>
              }
            >
              <div className="grid gap-4">
                {selectedCharacter.weapons.length === 0 ? (
                  <p className="rounded-[1.2rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                    {lt(
                      "No weapons added yet. Pull one from the catalog or create a custom profile.",
                      "Зброю ще не додано. Візьміть позицію з каталогу або створіть власний профіль.",
                    )}
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
                        lt("weapon", "зброю"),
                        lt("Weapon removed.", "Зброю видалено."),
                      );
                    }}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              id="gear"
              title={lt("Gear", "Спорядження")}
              eyebrow={lt("Encumbrance", "Навантаження")}
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => setDrawerKind("gear")}
                >
                  {lt("Add from Catalog", "Додати з каталогу")}
                </button>
              }
            >
              <div className="mb-4 rounded-[1.25rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] px-4 py-3">
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                  {lt("Carry Limit", "Межа перенесення")}
                </p>
                <p className="mt-2 text-lg text-[var(--paper)]">
                  {encumbranceUsed}/{encumbranceCapacity} {lt("half-row units", "одиниць півряду")}
                </p>
                <p className="text-sm text-[var(--ink-muted)]">
                  {encumbranceUsed > encumbranceCapacity
                    ? lt(
                        "Limit exceeded. Expect strength checks while moving.",
                        "Перевищено ліміт. Під час руху очікуйте перевірок сили.",
                      )
                    : lt("Within the safe carrying limit.", "У межах безпечного ліміту перенесення.")}
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
                          ? lt(
                              `${formatEncumbranceUnitsUk(item.encumbranceUnits * item.quantity)} total (${item.quantity} x ${formatEncumbranceUnitsUk(item.encumbranceUnits)})`,
                              `${formatEncumbranceUnitsUk(item.encumbranceUnits * item.quantity)} разом (${item.quantity} x ${formatEncumbranceUnitsUk(item.encumbranceUnits)})`,
                            )
                          : formatEncumbranceUnitsUk(item.encumbranceUnits)}
                      </span>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
                        onClick={() => {
                          requestCharacterRepeaterRemoval(
                            "gear",
                            item.id,
                            lt("gear item", "предмет спорядження"),
                            lt("Gear removed.", "Спорядження видалено."),
                          );
                        }}
                      >
                        {t("common.actions.remove")}
                      </button>
                    </div>
                    <SavableTextField
                      label={lt("Item", "Предмет")}
                      value={item.name}
                      onCommit={(value) =>
                        commitRepeater("gear", item.id, "name", value)
                      }
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-[140px_160px_180px]">
                      <SavableNumberField
                        label={lt("Quantity", "Кількість")}
                        min={1}
                        max={99}
                        value={item.quantity}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "quantity", value)
                        }
                      />
                      <SavableTextField
                        label={lt("Bonus", "Бонус")}
                        value={item.bonus}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "bonus", value)
                        }
                      />
                      <SavableSelectField
                        label={lt("Encumbrance per Unit", "Навантаження за одиницю")}
                        value={String(item.encumbranceUnits)}
                        options={encumbrancePresets}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "encumbranceUnits", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label={lt("Comment", "Коментар")}
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
              title={lt("Tiny Items", "Дрібниці")}
              eyebrow={lt("Pocket Rituals", "Кишенькові ритуали")}
              actions={
                <button
                  type="button"
                  className="coriolis-chip"
                  onClick={() => setDrawerKind("tiny")}
                >
                  {lt("Add from Catalog", "Додати з каталогу")}
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
                            lt("tiny item", "дрібницю"),
                            lt("Tiny item removed.", "Дрібницю видалено."),
                          );
                        }}
                      >
                        {t("common.actions.remove")}
                      </button>
                    </div>
                    <SavableTextField
                      label={lt("Item", "Предмет")}
                      value={item.name}
                      onCommit={(value) =>
                        commitRepeater("gear", item.id, "name", value)
                      }
                    />
                    <div className="mt-4 grid gap-4 md:grid-cols-[140px_220px]">
                      <SavableNumberField
                        label={lt("Quantity", "Кількість")}
                        min={1}
                        max={99}
                        value={item.quantity}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "quantity", value)
                        }
                      />
                      <SavableTextField
                        label={lt("Bonus", "Бонус")}
                        value={item.bonus}
                        onCommit={(value) =>
                          commitRepeater("gear", item.id, "bonus", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label={lt("Comment", "Коментар")}
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
              title={lt("People I've Met", "Ті, кого я зустрів")}
              eyebrow={lt("Contacts", "Контакти")}
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
                    }, lt("Contact row added.", "Рядок контакту додано."));
                  }}
                >
                  {lt("Add Contact", "Додати контакт")}
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
                            lt("contact", "контакт"),
                            lt("Contact removed.", "Контакт видалено."),
                          );
                        }}
                      >
                        {t("common.actions.remove")}
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                      <SavableTextField
                        label={lt("Name", "Ім'я")}
                        value={contact.name}
                        onCommit={(value) =>
                          commitRepeater("contact", contact.id, "name", value)
                        }
                      />
                      <SavableTextField
                        label={lt("Concept", "Концепт")}
                        value={contact.concept}
                        onCommit={(value) =>
                          commitRepeater("contact", contact.id, "concept", value)
                        }
                      />
                    </div>
                    <SavableTextField
                      className="mt-4"
                      label={lt("Notes", "Нотатки")}
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

            <SectionCard id="my-cabin" title={lt("My Cabin", "Моя каюта")} eyebrow={lt("Private Space", "Особистий простір")}>
              <div className="grid gap-4">
                <SavableTextField
                  label={lt("Description", "Опис")}
                  multiline
                  rows={4}
                  value={selectedCharacter.myCabinDescription}
                  onCommit={(value) => commitField("myCabinDescription", value)}
                />
                <SavableTextField
                  label={lt("Gear", "Спорядження")}
                  multiline
                  rows={4}
                  value={selectedCharacter.myCabinGear}
                  onCommit={(value) => commitField("myCabinGear", value)}
                />
                <SavableTextField
                  label={lt("Other", "Інше")}
                  multiline
                  rows={4}
                  value={selectedCharacter.myCabinOther}
                  onCommit={(value) => commitField("myCabinOther", value)}
                />
              </div>
            </SectionCard>

            <SectionCard id="notes" title={lt("Notes", "Нотатки")} eyebrow={lt("Back Sheet", "Зворотний аркуш")}>
              <div className="grid gap-4">
                <SavableNumberField
                  label={lt("Birr", "Бірри")}
                  hint={lt(
                    'Edit the value directly or use "Add" to apply a positive or negative adjustment.',
                    "Редагуйте значення напряму або використайте «Додати», щоб внести додатну чи від'ємну зміну.",
                  )}
                  min={MIN_BIRR}
                  value={selectedCharacter.birr}
                  onCommit={(value) => commitField("birr", value)}
                  action={
                    <button
                      type="button"
                      className="coriolis-chip"
                      onClick={openBirrAdjustmentModal}
                    >
                      {t("common.actions.add")}
                    </button>
                  }
                />
                <SavableTextField
                  label={lt("Notes", "Нотатки")}
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
              {lt("Empty Hangar", "Порожній ангар")}
            </p>
            <h2 className="mt-4 font-display text-3xl uppercase tracking-[0.14em] text-[var(--paper)]">
              {lt("There are no character sheets in the ledger", "У журналі немає аркушів персонажів")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[var(--ink-muted)]">
              {lt(
                "Create a new dossier and start keeping gear, injuries, alliances, and station rumors in one place.",
                "Створіть нове досьє й почніть зберігати спорядження, поранення, союзи та станційні чутки в одному місці.",
              )}
            </p>
            <button
              type="button"
              className="coriolis-chip mt-8"
              onClick={() => {
                runTask(async () => {
                  const created = await createCharacterAction();
                  setCharacters([created]);
                  navigateToPanel(created.id);
                }, lt("New sheet opened.", "Новий аркуш відкрито."));
              }}
            >
              {lt("Create the First Sheet", "Створити перший аркуш")}
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
          }, lt("Inventory updated.", "Інвентар оновлено."));
        }}
      />
      <ConfirmRemovalModal
        pendingRemoval={pendingRemoval}
        onCancel={closeRemovalDialog}
        onConfirm={confirmRemoval}
      />
      <ConditionModifierModal
        key={`${selectedCharacter?.id ?? "none"}-${conditionModifierModalState?.filterTarget ?? "all"}-${conditionModifierModalState?.initialTarget ?? "hitPoints"}`}
        characterName={selectedCharacter?.name ?? lt("the current explorer", "поточного дослідника")}
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
          }, lt("Condition modifier added.", "Модифікатор стану додано."));
        }}
        onDelete={(modifier) => requestConditionModifierRemoval(modifier)}
        onUpdate={(modifier, input) => {
          runTask(async () => {
            const updated = await updateConditionModifierAction({
              id: modifier.id,
              ...input,
            });
            patchCharacter(updated);
          }, lt("Condition modifier updated.", "Модифікатор стану оновлено."));
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
  const { t } = useTranslation();
  const { lt } = useLocaleText();
  return (
    <div className="rounded-[1.45rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] p-4">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="text-xs uppercase tracking-[0.24em] text-[var(--ink-faint)]"
          onClick={onDelete}
        >
          {t("common.actions.remove")}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_110px_110px_110px] xl:grid-cols-[minmax(0,1fr)_110px_110px_110px_110px_140px]">
        <SavableTextField
          label={lt("Weapon", "Зброя")}
          value={weapon.name}
          onCommit={(value) => onCommit("name", value)}
        />
        <SavableNumberField
          label={lt("Bonus", "Бонус")}
          min={-2}
          max={8}
          value={weapon.bonus}
          onCommit={(value) => onCommit("bonus", value)}
        />
        <SavableNumberField
          label={lt("Initiative", "Ініціатива")}
          min={-2}
          max={8}
          value={weapon.initiative}
          onCommit={(value) => onCommit("initiative", value)}
        />
        <SavableNumberField
          label={lt("Damage", "Шкода")}
          min={0}
          max={12}
          value={weapon.damage}
          onCommit={(value) => onCommit("damage", value)}
        />
        <SavableTextField
          label={lt("Crit", "Крит")}
          value={weapon.crit}
          onCommit={(value) => onCommit("crit", value)}
        />
        <SavableTextField
          label={lt("Range", "Дальність")}
          value={weapon.range}
          onCommit={(value) => onCommit("range", value)}
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
        <SavableNumberField
          label={lt("Reloads", "Перезаряджання")}
          min={0}
          max={6}
          value={weapon.reloads}
          onCommit={(value) => onCommit("reloads", value)}
        />
        <SavableTextField
          label={lt("Comments", "Коментарі")}
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
  const { t } = useTranslation();
  const { lt } = useLocaleText();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  if (!kind) {
    return null;
  }

  const query = deferredSearch.trim().toLowerCase();
  const localizedCatalog = catalog.map(getLocalizedInventoryPreset);
  const filteredCatalog = localizedCatalog.filter((preset) => {
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
              {lt("Preset Catalog", "Каталог шаблонів")}
            </p>
            <h2 className="font-display text-2xl uppercase tracking-[0.14em] text-[var(--paper)]">
              {kind === "weapon"
                ? lt("Add weapon", "Додати зброю")
                : kind === "gear"
                  ? lt("Add gear", "Додати спорядження")
                  : lt("Add tiny item", "Додати дрібницю")}
            </h2>
          </div>
          <button type="button" className="coriolis-chip" onClick={onClose}>
            {t("common.actions.close")}
          </button>
        </div>

        <input
          className="coriolis-input mb-4"
          value={search}
          placeholder={lt("Search the catalog", "Пошук у каталозі")}
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
                {t("common.actions.add")}
              </span>
            </button>
          ))}

          {filteredCatalog.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-[var(--line-soft)] px-4 py-6 text-sm text-[var(--ink-muted)]">
              {lt(
                "No presets match this query. Try a broader term or one of your custom variants.",
                "Немає шаблонів, що відповідають цьому запиту. Спробуйте ширший термін або один із власних варіантів.",
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
