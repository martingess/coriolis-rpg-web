"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, useTransition, type ReactNode } from "react";

import {
  addInventoryPresetAction,
  createConditionModifierAction,
  createRepeaterItemAction,
  deleteConditionModifierAction,
  deleteRepeaterItemAction,
  setBuddyAction,
  updateCharacterFieldAction,
  updateConditionModifierAction,
  updateRepeaterFieldAction,
} from "@/app/actions";
import {
  SavableNumberField,
  SavableSelectField,
  SavableTextField,
} from "@/components/field-controls";
import { LanguageSwitcher } from "@/components/language-switcher";
import { inventoryCatalog } from "@/lib/coriolis-presets";
import {
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
  TEAM_HREF,
  getCompactCharacterHref,
  getFullCharacterHref,
} from "@/lib/roster-routes";
import {
  conditionModifierTargetValues,
  originCultureValues,
  originSystemValues,
  upbringingValues,
  type CharacterConditionModifierRecord,
  type CharacterContactRecord,
  type CharacterGearItemRecord,
  type CharacterRecord,
  type CharacterRelationshipRecord,
  type CharacterScalarField,
  type CharacterTalentRecord,
  type CharacterWeaponRecord,
  type InventoryKind,
  type RepeaterKind,
} from "@/lib/roster-types";
import { useLocaleText } from "@/lib/use-locale-text";

type CompactCharacterSheetProps = {
  character: CharacterRecord;
  characters: Array<Pick<CharacterRecord, "id" | "name">>;
};

type AttributeField = "strength" | "agility" | "wits" | "empathy";
type SkillField =
  | "command"
  | "culture"
  | "dataDjinn"
  | "dexterity"
  | "force"
  | "infiltration"
  | "manipulation"
  | "medicurgy"
  | "meleeCombat"
  | "mysticPowers"
  | "observation"
  | "pilot"
  | "rangedCombat"
  | "science"
  | "survival"
  | "technology";
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
    field: SkillField;
    kind: SkillKind;
  }>;
}>;

type CompactTableRow = {
  cells: ReactNode[];
  key: string;
};

type EditableSectionId =
  | "passport"
  | "conditions"
  | "talents"
  | "skills"
  | "inventory"
  | "contacts"
  | "relationships"
  | "notes";

function CompactPips({
  filled,
  max,
}: {
  filled: number;
  max: number;
}) {
  return (
    <div className="coriolis-compact-pips" aria-hidden="true">
      {Array.from({ length: max }, (_, index) => (
        <span
          key={`${max}-${index}`}
          className={`coriolis-compact-pip ${
            index < filled ? "coriolis-compact-pip--filled" : ""
          }`}
        />
      ))}
    </div>
  );
}

function CompactTable({
  className = "",
  dense = false,
  emptyMessage,
  headers,
  rows,
}: {
  className?: string;
  dense?: boolean;
  emptyMessage: string;
  headers: ReactNode[];
  rows: CompactTableRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`coriolis-compact-table ${
          dense ? "coriolis-compact-table--dense" : ""
        } ${className}`}
      >
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`header-${index}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="coriolis-compact-table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => (
                  <td key={`${row.key}-${index}`}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SheetPanel({
  actions,
  children,
  className = "",
  id,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  title: string;
}) {
  return (
    <section id={id} className={`coriolis-sheet-panel ${className}`}>
      <div className="coriolis-sheet-panel__header gap-3">
        <h2 className="coriolis-sheet-panel__title">{title}</h2>
        {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="coriolis-sheet-panel__body">{children}</div>
    </section>
  );
}

function InventoryBlock({
  children,
  className = "",
  id,
  title,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  title: string;
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden rounded-[0.7rem] border border-[rgba(201,160,80,0.14)] bg-[linear-gradient(180deg,rgba(248,238,216,0.028),rgba(248,238,216,0.014)),rgba(8,11,18,0.62)] ${className}`}
    >
      <div className="flex min-h-[2.15rem] items-center border-b border-[rgba(201,160,80,0.14)] bg-[linear-gradient(90deg,rgba(201,160,80,0.12),rgba(201,160,80,0.03)_28%,transparent_100%),rgba(248,238,216,0.02)] px-[0.78rem] py-2">
        <h3 className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[var(--paper)]">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SheetField({
  className = "",
  label,
  value,
}: {
  className?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={`coriolis-sheet-field ${className}`}>
      <p className="coriolis-sheet-field__label">{label}</p>
      <div className="coriolis-sheet-field__value">{value}</div>
    </div>
  );
}

function EditableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`coriolis-sheet-field ${className}`}>{children}</div>;
}

function SheetTrack({
  label,
  note,
  value,
}: {
  label: string;
  note?: string;
  value: ReactNode;
}) {
  return (
    <div className="coriolis-sheet-field">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="coriolis-sheet-field__label">{label}</p>
          {note ? <p className="mt-1 text-xs text-[var(--ink-muted)]">{note}</p> : null}
        </div>
        <div className="text-right text-sm text-[var(--paper)]">{value}</div>
      </div>
    </div>
  );
}

function SheetPipRow({
  filled,
  max,
}: {
  filled: number;
  max: number;
}) {
  return (
    <div className="coriolis-sheet-pip-row">
      <CompactPips filled={filled} max={max} />
    </div>
  );
}

const encumbranceOptions = [
  { value: "0", label: "Tiny" },
  { value: "1", label: "Light" },
  { value: "2", label: "Normal" },
  { value: "4", label: "Heavy" },
  { value: "6", label: "3 rows" },
  { value: "8", label: "4 rows" },
  { value: "10", label: "5 rows" },
  { value: "12", label: "6 rows" },
];

function PanelActionButton({
  active = false,
  children,
  disabled = false,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.18em] transition ${
        active
          ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
          : "border-[var(--line-soft)] bg-[color:rgba(245,231,204,0.04)] text-[var(--ink-faint)] hover:border-[var(--line-strong)] hover:text-[var(--paper)]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function HeaderSectionButton({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  const { lt } = useLocaleText();

  return (
    <a
      href={href}
      className="group flex w-full items-center justify-between gap-3 rounded-[1.15rem] border border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(245,231,204,0.045),rgba(245,231,204,0.02))] px-4 py-3 text-left transition hover:border-[var(--gold)] hover:bg-[color:rgba(201,160,80,0.1)]"
    >
      <div className="min-w-0">
        <p className="text-[0.84rem] font-medium uppercase tracking-[0.18em] text-[var(--paper)]">
          {label}
        </p>
        <p className="mt-1 text-sm leading-snug text-[var(--ink-muted)]">{description}</p>
      </div>
      <span className="shrink-0 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--ink-faint)] transition group-hover:text-[var(--paper)]">
        {lt("Open", "Відкрити")}
      </span>
    </a>
  );
}

function CrewPickerModal({
  activeCharacterId,
  characters,
  onClose,
}: {
  activeCharacterId: string;
  characters: Array<Pick<CharacterRecord, "id" | "name">>;
  onClose: () => void;
}) {
  const { lt } = useLocaleText();

  return (
    <div className="coriolis-modal" onClick={onClose}>
      <div
        className="coriolis-modal__dialog w-full max-w-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="coriolis-modal__header">
          <div className="coriolis-modal__copy">
            <p className="coriolis-modal__eyebrow">{lt("Crew Navigation", "Навігація екіпажем")}</p>
            <h2 className="coriolis-modal__title">{lt("Choose a dossier", "Оберіть досьє")}</h2>
            <p className="coriolis-modal__description">
              {lt(
                "Jump to the shared crew ledger or open any character dossier from one place.",
                "Перейдіть до спільного досьє екіпажу або відкрийте будь-яке персонажне досьє з одного місця.",
              )}
            </p>
          </div>
          <button type="button" className="coriolis-chip" onClick={onClose}>
            {lt("Close", "Закрити")}
          </button>
        </div>
        <div className="coriolis-modal__body space-y-4">
          <Link
            href={TEAM_HREF}
            className="block rounded-[1.15rem] border border-[var(--line-soft)] bg-[rgba(245,231,204,0.04)] px-4 py-4 transition hover:border-[var(--gold)] hover:bg-[color:rgba(201,160,80,0.08)]"
            onClick={onClose}
          >
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
              {lt("Shared Ledger", "Спільний журнал")}
            </p>
            <p className="mt-2 text-base font-medium uppercase tracking-[0.14em] text-[var(--paper)]">
              {lt("Crew Dossier", "Досьє екіпажу")}
            </p>
          </Link>
          <div className="grid gap-3">
            {characters.map((entry) => {
              const isActive = entry.id === activeCharacterId;

              return (
                <Link
                  key={entry.id}
                  href={getCompactCharacterHref(entry.id)}
                  className={`block rounded-[1.15rem] border px-4 py-4 transition ${
                    isActive
                      ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.14)]"
                      : "border-[var(--line-soft)] bg-[rgba(245,231,204,0.03)] hover:border-[var(--gold)] hover:bg-[color:rgba(201,160,80,0.08)]"
                  }`}
                  onClick={onClose}
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                    {isActive
                      ? lt("Current Character", "Поточний персонаж")
                      : lt("Character Dossier", "Досьє персонажа")}
                  </p>
                  <p className="mt-2 text-base font-medium uppercase tracking-[0.14em] text-[var(--paper)]">
                    {entry.name}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactPresetDrawer({
  kind,
  onClose,
  onPick,
}: {
  kind: InventoryKind | null;
  onClose: () => void;
  onPick: (kind: InventoryKind, presetId: string) => void;
}) {
  const { lt } = useLocaleText();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  if (!kind) {
    return null;
  }

  const query = deferredSearch.trim().toLowerCase();
  const localizedCatalog = inventoryCatalog.map(getLocalizedInventoryPreset);
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
    <div className="coriolis-modal" onClick={onClose}>
      <div
        className="coriolis-modal__dialog w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="coriolis-modal__header">
          <div className="coriolis-modal__copy">
            <p className="coriolis-modal__eyebrow">{lt("Preset Catalog", "Каталог шаблонів")}</p>
            <h2 className="coriolis-modal__title">
              {kind === "weapon"
                ? lt("Add weapon", "Додати зброю")
                : kind === "gear"
                  ? lt("Add gear", "Додати спорядження")
                  : lt("Add tiny item", "Додати дрібницю")}
            </h2>
          </div>
          <button type="button" className="coriolis-chip" onClick={onClose}>
            {lt("Close", "Закрити")}
          </button>
        </div>
        <div className="coriolis-modal__body">
          <input
            className="coriolis-input mb-4"
            value={search}
            placeholder={lt("Search the catalog", "Пошук у каталозі")}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {filteredCatalog.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="flex w-full items-start justify-between gap-4 rounded-[1.2rem] border border-[var(--line-soft)] bg-[var(--panel-soft)] px-4 py-4 text-left transition hover:border-[var(--gold)] hover:bg-[color:rgba(201,160,80,0.08)]"
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
                  {lt("Add", "Додати")}
                </span>
              </button>
            ))}
            {filteredCatalog.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-[var(--line-soft)] px-4 py-6 text-sm text-[var(--ink-muted)]">
                {lt(
                  "No presets match this query. Try a broader term.",
                  "Немає шаблонів, що відповідають цьому запиту. Спробуйте ширший термін.",
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactTalentEditor({
  onCommit,
  onDelete,
  talent,
}: {
  onCommit: (field: "name" | "notes" | "source", value: string) => void;
  onDelete: () => void;
  talent: CharacterTalentRecord;
}) {
  const { lt } = useLocaleText();
  const talentSourceOptions = [
    { value: "group", label: getTalentSourceLabel("group") },
    { value: "concept", label: getTalentSourceLabel("concept") },
    { value: "icon", label: getTalentSourceLabel("icon") },
    { value: "other", label: getTalentSourceLabel("other") },
  ];

  return (
    <div className="rounded-[1rem] border border-[rgba(201,160,80,0.14)] bg-[rgba(248,238,216,0.025)] p-3">
      <div className="mb-3 flex justify-end">
        <PanelActionButton onClick={onDelete}>{lt("Remove", "Прибрати")}</PanelActionButton>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <SavableTextField label={lt("Talent", "Талант")} value={talent.name} onCommit={(value) => onCommit("name", value)} />
        <SavableSelectField
          label={lt("Source", "Джерело")}
          value={talent.source}
          options={talentSourceOptions}
          onCommit={(value) => onCommit("source", value)}
        />
      </div>
      <SavableTextField
        className="mt-3"
        label={lt("Notes", "Нотатки")}
        multiline
        rows={3}
        value={talent.notes}
        onCommit={(value) => onCommit("notes", value)}
      />
    </div>
  );
}

function CompactContactEditor({
  contact,
  onCommit,
  onDelete,
}: {
  contact: CharacterContactRecord;
  onCommit: (field: "name" | "concept" | "notes", value: string) => void;
  onDelete: () => void;
}) {
  const { lt } = useLocaleText();
  return (
    <div className="rounded-[1rem] border border-[rgba(201,160,80,0.14)] bg-[rgba(248,238,216,0.025)] p-3">
      <div className="mb-3 flex justify-end">
        <PanelActionButton onClick={onDelete}>{lt("Remove", "Прибрати")}</PanelActionButton>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <SavableTextField label={lt("Name", "Ім'я")} value={contact.name} onCommit={(value) => onCommit("name", value)} />
        <SavableTextField
          label={lt("Concept", "Концепт")}
          value={contact.concept}
          onCommit={(value) => onCommit("concept", value)}
        />
      </div>
      <SavableTextField
        className="mt-3"
        label={lt("Notes", "Нотатки")}
        multiline
        rows={3}
        value={contact.notes}
        onCommit={(value) => onCommit("notes", value)}
      />
    </div>
  );
}

function CompactConditionModifierEditor({
  modifier,
  onCommit,
  onDelete,
}: {
  modifier: CharacterConditionModifierRecord;
  onCommit: (
    field: "target" | "name" | "description" | "value",
    value: string | number,
  ) => void;
  onDelete: () => void;
}) {
  const { lt } = useLocaleText();
  const targetOptions = conditionModifierTargetValues.map((value) => ({
    value,
    label: getConditionModifierTargetLabel(value),
  }));

  return (
    <div className="rounded-[1rem] border border-[rgba(201,160,80,0.14)] bg-[rgba(248,238,216,0.025)] p-3">
      <div className="mb-3 flex justify-end">
        <PanelActionButton onClick={onDelete}>{lt("Remove", "Прибрати")}</PanelActionButton>
      </div>
      <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_120px]">
        <SavableSelectField
          label={lt("Target", "Ціль")}
          value={modifier.target}
          options={targetOptions}
          onCommit={(value) => onCommit("target", value)}
        />
        <SavableTextField label={lt("Name", "Назва")} value={modifier.name} onCommit={(value) => onCommit("name", value)} />
        <SavableNumberField
          label={lt("Value", "Значення")}
          min={-6}
          max={6}
          value={modifier.value}
          onCommit={(value) => onCommit("value", value)}
        />
      </div>
      <SavableTextField
        className="mt-3"
        label={lt("Description", "Опис")}
        multiline
        rows={3}
        value={modifier.description}
        onCommit={(value) => onCommit("description", value)}
      />
    </div>
  );
}

function CompactRelationshipEditor({
  onCommit,
  onDelete,
  onToggleBuddy,
  options,
  relationship,
}: {
  onCommit: (field: "targetName" | "description", value: string) => void;
  onDelete: () => void;
  onToggleBuddy: () => void;
  options: Array<{ label: string; value: string }>;
  relationship: CharacterRelationshipRecord;
}) {
  const { lt } = useLocaleText();
  const isBuddyReady = relationship.targetName.trim().length > 0;

  return (
    <div className="rounded-[1rem] border border-[rgba(201,160,80,0.14)] bg-[rgba(248,238,216,0.025)] p-3">
      <div className="mb-3 flex flex-wrap justify-between gap-2">
        <PanelActionButton active={relationship.isBuddy} disabled={!isBuddyReady} onClick={onToggleBuddy}>
          {relationship.isBuddy ? lt("Buddy", "Напарник") : lt("Mark Buddy", "Позначити")}
        </PanelActionButton>
        <PanelActionButton onClick={onDelete}>{lt("Remove", "Прибрати")}</PanelActionButton>
      </div>
      <div className="grid gap-3">
        <SavableSelectField
          label={lt("Other PC", "Інший ПГ")}
          value={relationship.targetName}
          options={options}
          onCommit={(value) => onCommit("targetName", value)}
        />
        <SavableTextField
          label={lt("Relationship", "Стосунок")}
          multiline
          rows={3}
          value={relationship.description}
          onCommit={(value) => onCommit("description", value)}
        />
      </div>
    </div>
  );
}

function CompactWeaponEditor({
  onCommit,
  onDelete,
  weapon,
}: {
  onCommit: (
    field: keyof CharacterWeaponRecord | "comments",
    value: number | string,
  ) => void;
  onDelete: () => void;
  weapon: CharacterWeaponRecord;
}) {
  const { lt } = useLocaleText();
  return (
    <div className="rounded-[1rem] border border-[rgba(201,160,80,0.14)] bg-[rgba(248,238,216,0.025)] p-3">
      <div className="mb-3 flex justify-end">
        <PanelActionButton onClick={onDelete}>{lt("Remove", "Прибрати")}</PanelActionButton>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_96px_96px_96px] xl:grid-cols-[minmax(0,1fr)_96px_96px_96px_96px_140px]">
        <SavableTextField label={lt("Weapon", "Зброя")} value={weapon.name} onCommit={(value) => onCommit("name", value)} />
        <SavableNumberField label={lt("Bonus", "Бонус")} min={-2} max={8} value={weapon.bonus} onCommit={(value) => onCommit("bonus", value)} />
        <SavableNumberField label={lt("Initiative", "Ініц.")} min={-2} max={8} value={weapon.initiative} onCommit={(value) => onCommit("initiative", value)} />
        <SavableNumberField label={lt("Damage", "Шкода")} min={0} max={12} value={weapon.damage} onCommit={(value) => onCommit("damage", value)} />
        <SavableTextField label={lt("Crit", "Крит")} value={weapon.crit} onCommit={(value) => onCommit("crit", value)} />
        <SavableTextField label={lt("Range", "Дальність")} value={weapon.range} onCommit={(value) => onCommit("range", value)} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
        <SavableNumberField label={lt("Reloads", "Перезаряджання")} min={0} max={6} value={weapon.reloads} onCommit={(value) => onCommit("reloads", value)} />
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

function CompactGearEditor({
  item,
  onCommit,
  onDelete,
  showEncumbrance = true,
}: {
  item: CharacterGearItemRecord;
  onCommit: (
    field: "name" | "bonus" | "comment" | "quantity" | "encumbranceUnits",
    value: string | number,
  ) => void;
  onDelete: () => void;
  showEncumbrance?: boolean;
}) {
  const { lt } = useLocaleText();
  const localizedEncumbranceOptions = encumbranceOptions.map((option) => ({
    value: option.value,
    label: lt(option.label, option.label),
  }));

  return (
    <div className="rounded-[1rem] border border-[rgba(201,160,80,0.14)] bg-[rgba(248,238,216,0.025)] p-3">
      <div className="mb-3 flex justify-end">
        <PanelActionButton onClick={onDelete}>{lt("Remove", "Прибрати")}</PanelActionButton>
      </div>
      <SavableTextField label={lt("Item", "Предмет")} value={item.name} onCommit={(value) => onCommit("name", value)} />
      <div
        className={`mt-3 grid gap-3 ${
          showEncumbrance ? "md:grid-cols-[120px_180px_180px]" : "md:grid-cols-[120px_1fr]"
        }`}
      >
        <SavableNumberField label={lt("Quantity", "Кількість")} min={1} max={99} value={item.quantity} onCommit={(value) => onCommit("quantity", value)} />
        <SavableTextField label={lt("Bonus", "Бонус")} value={item.bonus} onCommit={(value) => onCommit("bonus", value)} />
        {showEncumbrance ? (
          <SavableSelectField
            label={lt("Encumbrance", "Навантаження")}
            value={String(item.encumbranceUnits)}
            options={localizedEncumbranceOptions}
            onCommit={(value) => onCommit("encumbranceUnits", value)}
          />
        ) : null}
      </div>
      <SavableTextField
        className="mt-3"
        label={lt("Comment", "Коментар")}
        multiline
        rows={3}
        value={item.comment}
        onCommit={(value) => onCommit("comment", value)}
      />
    </div>
  );
}

function displayText(value: string | null | undefined, fallback: string) {
  if (value && value.trim()) {
    return value.trim();
  }

  return <span className="text-[var(--ink-faint)]">{fallback}</span>;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getDicePool(attributeValue: number, skillValue: number, kind: SkillKind) {
  if (kind === "advanced" && skillValue === 0) {
    return null;
  }

  return attributeValue + skillValue;
}

export function CompactCharacterSheet({
  character,
  characters,
}: CompactCharacterSheetProps) {
  const { isUk, lt } = useLocaleText();
  const [currentCharacter, setCurrentCharacter] = useState(character);
  const [characterSummaries, setCharacterSummaries] = useState(characters);
  const [notice, setNotice] = useState<string | null>(null);
  const [drawerKind, setDrawerKind] = useState<InventoryKind | null>(null);
  const [isCrewDialogOpen, setIsCrewDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSections, setEditingSections] = useState<Set<EditableSectionId>>(
    () => new Set(),
  );
  const [pendingTasks, setPendingTasks] = useState(0);
  const [isTransitionPending, startTransition] = useTransition();
  const emptyLabel = lt("Not filled", "Не заповнено");
  const noEntriesLabel = lt("No entries yet", "Записів ще немає");
  const birrFormatter = new Intl.NumberFormat(isUk ? "uk-UA" : "en-US");
  const heroTitleClassName = isUk
    ? "text-[1.9rem] font-semibold uppercase tracking-[0.06em] text-[var(--paper)] sm:text-[2.35rem]"
    : "font-display text-[2.3rem] uppercase tracking-[0.12em] text-[var(--paper)] sm:text-[2.7rem]";
  const heroEyebrowClassName = isUk
    ? "text-[0.72rem] uppercase tracking-[0.14em] text-[var(--ink-faint)]"
    : "text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]";
  const sectionLinks = [
    {
      href: "#passport",
      label: lt("Passport", "Паспорт"),
      description: lt(
        "Identity, backstory, appearance, and explorer profile.",
        "Профіль персонажа, походження, зовнішність і базова інформація.",
      ),
    },
    {
      href: "#combat",
      label: lt("Conditions", "Стани"),
      description: lt(
        "Health, mind, radiation, injuries, and active modifiers.",
        "Здоров'я, розум, радіація, травми та активні модифікатори.",
      ),
    },
    {
      href: "#skills-talents",
      label: lt("Skills + Talents", "Навички й таланти"),
      description: lt(
        "Attributes, skill spread, and signature talents.",
        "Атрибути, розподіл навичок і ключові таланти.",
      ),
    },
    {
      href: "#loadout",
      label: lt("Inventory", "Інвентар"),
      description: lt(
        "Weapons, gear, armor, currency, and field notes.",
        "Зброя, спорядження, броня, бірри та польові нотатки.",
      ),
    },
    {
      href: "#support",
      label: lt("Contacts + Relationships", "Контакти й стосунки"),
      description: lt(
        "Cabin, contacts, and links to the rest of the crew.",
        "Каюта, контакти й зв'язки з рештою екіпажу.",
      ),
    },
  ];
  const sectionIsEditing = (sectionId: EditableSectionId) => editingSections.has(sectionId);
  const isBusy = pendingTasks > 0 || isUploading || isTransitionPending;
  const portraitInputId = `compact-portrait-input-${currentCharacter.id}`;
  const statusMessage = isUploading
    ? lt("Uploading portrait...", "Завантажую портрет...")
    : pendingTasks > 0
      ? lt("Saving changes...", "Зберігаю зміни...")
      : notice;
  const portraitActionLabel = isUploading
    ? lt("Uploading", "Завантаження")
    : lt("Upload", "Завантажити");
  const gearItems = currentCharacter.gearItems.filter((item) => !item.isTiny);
  const tinyItems = currentCharacter.gearItems.filter((item) => item.isTiny);
  const otherCharacterNames = characterSummaries
    .filter((entry) => entry.id !== currentCharacter.id)
    .map((entry) => entry.name.trim())
    .filter(Boolean);
  const unassignedRelationshipNames = otherCharacterNames.filter(
    (name) => !currentCharacter.relationships.some((relationship) => relationship.targetName === name),
  );
  const selectPlaceholder = lt("Not set", "Не вибрано");
  const originSystemOptions = [
    { value: "", label: selectPlaceholder },
    ...originSystemValues.map((value) => ({
      value,
      label: getOriginSystemLabel(value),
    })),
  ];
  const originCultureOptions = [
    { value: "", label: selectPlaceholder },
    ...originCultureValues.map((value) => ({
      value,
      label: getOriginCultureLabel(value),
    })),
  ];
  const upbringingOptions = [
    { value: "", label: selectPlaceholder },
    ...upbringingValues.map((value) => ({
      value,
      label: getUpbringingLabel(value),
    })),
  ];

  useEffect(() => {
    setCurrentCharacter(character);
  }, [character]);

  useEffect(() => {
    setEditingSections(new Set());
    setDrawerKind(null);
    setIsCrewDialogOpen(false);
    setNotice(null);
  }, [character.id]);

  useEffect(() => {
    setCharacterSummaries(characters);
  }, [characters]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  function patchCharacter(updated: CharacterRecord) {
    startTransition(() => {
      setCurrentCharacter(updated);
      setCharacterSummaries((current) => {
        const exists = current.some((entry) => entry.id === updated.id);
        const next = current.map((entry) =>
          entry.id === updated.id ? { ...entry, name: updated.name } : entry,
        );
        return exists ? next : [...next, { id: updated.id, name: updated.name }];
      });
    });
  }

  function runTask(task: () => Promise<void>, successMessage?: string) {
    setPendingTasks((current) => current + 1);

    void task()
      .then(() => {
        if (successMessage) {
          setNotice(successMessage);
        }
      })
      .catch((error) => {
        setNotice(
          error instanceof Error
            ? error.message
            : lt("Something went wrong.", "Щось пішло не так."),
        );
      })
      .finally(() => {
        setPendingTasks((current) => Math.max(0, current - 1));
      });
  }

  function toggleSectionEditor(sectionId: EditableSectionId) {
    if (sectionId === "inventory" && sectionIsEditing(sectionId)) {
      setDrawerKind(null);
    }

    setEditingSections((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  }

  function commitField(field: CharacterScalarField, value: string | number) {
    runTask(async () => {
      const updated = await updateCharacterFieldAction({
        characterId: currentCharacter.id,
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

  function requestRepeaterRemoval(
    kind: RepeaterKind,
    id: string,
    entryLabel: string,
    successMessage: string,
  ) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(lt(`Remove ${entryLabel}?`, `Прибрати ${entryLabel}?`))
    ) {
      return;
    }

    runTask(async () => {
      const updated = await deleteRepeaterItemAction({ kind, id });
      patchCharacter(updated);
    }, successMessage);
  }

  function requestConditionModifierRemoval(modifier: CharacterConditionModifierRecord) {
    const entryLabel = modifier.name.trim() || getConditionModifierTargetLabel(modifier.target);

    if (
      typeof window !== "undefined" &&
      !window.confirm(lt(`Remove ${entryLabel}?`, `Прибрати ${entryLabel}?`))
    ) {
      return;
    }

    runTask(async () => {
      const updated = await deleteConditionModifierAction(modifier.id);
      patchCharacter(updated);
    }, lt("Condition modifier removed.", "Модифікатор стану прибрано."));
  }

  function updateConditionModifier(
    modifier: CharacterConditionModifierRecord,
    field: "target" | "name" | "description" | "value",
    value: string | number,
  ) {
    runTask(async () => {
      const updated = await updateConditionModifierAction({
        id: modifier.id,
        target: field === "target" ? String(value) : modifier.target,
        name: field === "name" ? String(value) : modifier.name,
        description: field === "description" ? String(value) : modifier.description,
        value: field === "value" ? Number(value) : modifier.value,
      });
      patchCharacter(updated);
    });
  }

  function addTalent() {
    runTask(async () => {
      const updated = await createRepeaterItemAction({
        characterId: currentCharacter.id,
        kind: "talent",
      });
      patchCharacter(updated);
    }, lt("Talent added.", "Талант додано."));
  }

  function addContact() {
    runTask(async () => {
      const updated = await createRepeaterItemAction({
        characterId: currentCharacter.id,
        kind: "contact",
      });
      patchCharacter(updated);
    }, lt("Contact added.", "Контакт додано."));
  }

  function addRelationship() {
    const defaultTargetName = unassignedRelationshipNames[0];

    if (!defaultTargetName) {
      return;
    }

    runTask(async () => {
      const updated = await createRepeaterItemAction({
        characterId: currentCharacter.id,
        kind: "relationship",
        relationshipTargetName: defaultTargetName,
      });
      patchCharacter(updated);
    }, lt("Relationship row added.", "Рядок стосунків додано."));
  }

  function addConditionModifier() {
    runTask(async () => {
      const updated = await createConditionModifierAction({
        characterId: currentCharacter.id,
        target: "hitPoints",
        name: "",
        description: "",
        value: -1,
      });
      patchCharacter(updated);
    }, lt("Condition modifier added.", "Модифікатор стану додано."));
  }

  function markRelationshipBuddy(relationshipId: string) {
    runTask(async () => {
      const updated = await setBuddyAction({
        characterId: currentCharacter.id,
        relationshipId,
      });
      patchCharacter(updated);
    }, lt("Buddy updated.", "Напарника оновлено."));
  }

  async function uploadPortrait(file: File) {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/characters/${currentCharacter.id}/portrait`, {
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
        error instanceof Error
          ? error.message
          : lt("Portrait upload failed.", "Не вдалося завантажити портрет."),
      );
    } finally {
      setIsUploading(false);
    }
  }

  const passportMetaFields = [
    { label: lt("Name", "Ім'я"), value: displayText(currentCharacter.name, emptyLabel) },
    {
      className: "coriolis-passport-field--wide",
      label: lt("Concept", "Концепт"),
      value: displayText(currentCharacter.concept, emptyLabel),
    },
    { label: lt("Icon", "Ікона"), value: displayText(currentCharacter.icon, emptyLabel) },
    {
      className: "coriolis-passport-field--wide",
      label: lt("Background", "Походження"),
      value: displayText(currentCharacter.background, emptyLabel),
    },
    {
      label: lt("Home System", "Домашня система"),
      value: currentCharacter.originSystem
        ? getOriginSystemLabel(currentCharacter.originSystem)
        : displayText("", emptyLabel),
    },
    {
      label: lt("Origin Culture", "Культура походження"),
      value: currentCharacter.originCulture
        ? getOriginCultureLabel(currentCharacter.originCulture)
        : displayText("", emptyLabel),
    },
    {
      label: lt("Upbringing", "Виховання"),
      value: currentCharacter.upbringing
        ? getUpbringingLabel(currentCharacter.upbringing)
        : displayText("", emptyLabel),
    },
    {
      label: lt("Group Concept", "Концепт команди"),
      value: displayText(currentCharacter.groupConcept, emptyLabel),
    },
    { label: lt("Reputation", "Репутація"), value: currentCharacter.reputation },
    { label: lt("XP Bank", "Запас XP"), value: currentCharacter.experience },
  ];
  const skillGroups = attributeSkillSections.map((section) => {
    const attributeValue = currentCharacter[section.field];

    return {
      key: section.field,
      field: section.field,
      label: getAttributeLabel(section.field),
      value: attributeValue,
      rows: section.skills.map((skill) => {
        const skillValue = currentCharacter[skill.field];
        const total = getDicePool(attributeValue, skillValue, skill.kind);

        return {
          key: skill.field,
          field: skill.field,
          kind: skill.kind,
          label: getSkillLabel(skill.field),
          total,
          value: skillValue,
        };
      }),
    };
  });
  const relationshipRows: CompactTableRow[] = currentCharacter.relationships.map((relationship) => ({
    key: relationship.id,
    cells: [
      displayText(relationship.targetName, emptyLabel),
      displayText(relationship.description, emptyLabel),
      relationship.isBuddy ? lt("Yes", "Так") : "—",
    ],
  }));
  const talentRows: CompactTableRow[] = currentCharacter.talents.map((talent) => ({
    key: talent.id,
    cells: [
      getTalentSourceLabel(talent.source),
      displayText(talent.name, emptyLabel),
      displayText(talent.notes, emptyLabel),
    ],
  }));
  const equipmentRows: CompactTableRow[] = [...gearItems, ...tinyItems].map((item) => ({
    key: item.id,
    cells: [
      displayText(item.name, emptyLabel),
      item.isTiny ? lt("Tiny", "Дрібне") : lt("Gear", "Спорядження"),
      item.quantity,
      displayText(item.bonus, emptyLabel),
    ],
  }));
  const weaponRows: CompactTableRow[] = currentCharacter.weapons.map((weapon) => ({
    key: weapon.id,
    cells: [
      displayText(weapon.name, emptyLabel),
      weapon.bonus,
      weapon.initiative,
      weapon.damage,
      displayText(weapon.crit, emptyLabel),
      displayText(weapon.range, emptyLabel),
      displayText(weapon.comments, emptyLabel),
    ],
  }));
  const modifierRows: CompactTableRow[] = currentCharacter.conditionModifiers.map((modifier) => ({
    key: modifier.id,
    cells: [
      getConditionModifierTargetLabel(modifier.target),
      displayText(modifier.name, emptyLabel),
      modifier.value > 0 ? `+${modifier.value}` : modifier.value,
      displayText(modifier.description, emptyLabel),
    ],
  }));
  const contactRows: CompactTableRow[] = currentCharacter.contacts.map((contact) => ({
    key: contact.id,
    cells: [
      displayText(contact.name, emptyLabel),
      displayText(contact.concept, emptyLabel),
      displayText(contact.notes, emptyLabel),
    ],
  }));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--night)] text-[var(--ink)]">
      <div className="coriolis-stars pointer-events-none fixed inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-12 pt-4 md:px-6 lg:px-8">
        <header className="coriolis-panel relative mb-5 rounded-[1.7rem] border border-[var(--line-strong)] px-4 py-4 shadow-[0_24px_80px_rgba(4,7,13,0.36)] sm:px-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] xl:items-start">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className={heroEyebrowClassName}>
                  {lt("Alternative Character Sheet", "Альтернативний лист персонажа")}
                </p>
                <h1 className={heroTitleClassName}>
                  {lt("Compact Dossier", "Компактне досьє")}
                </h1>
              </div>

              <div className="space-y-2">
                <div>
                  <LanguageSwitcher className="w-full justify-start sm:w-auto" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="coriolis-chip"
                    onClick={() => setIsCrewDialogOpen(true)}
                  >
                    {lt("Crew", "Екіпаж")}
                  </button>
                  <Link href={getFullCharacterHref(currentCharacter.id)} className="coriolis-chip">
                    {lt("Full Sheet", "Повний лист")}
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[rgba(245,231,204,0.03)] px-4 py-3">
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                  {lt("Active Dossier", "Активне досьє")}
                </p>
                <p className="mt-2 text-[1rem] font-medium uppercase tracking-[0.14em] text-[var(--paper)]">
                  {currentCharacter.name}
                </p>
              </div>

              {statusMessage ? (
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {statusMessage}
                </p>
              ) : null}
            </div>

            <nav className="flex flex-col gap-2.5">
              <p className="px-1 text-[0.64rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                {lt("Navigate Compact Sheet", "Навігація компактним досьє")}
              </p>
              {sectionLinks.map((section) => (
                <HeaderSectionButton
                  key={section.href}
                  href={section.href}
                  label={section.label}
                  description={section.description}
                />
              ))}
            </nav>
          </div>
        </header>

        <main
          id="sheet"
          className="coriolis-sheet-board coriolis-sheet-board--mobile-plain !border-0 !p-0 md:!border md:!border-[rgba(201,160,80,0.16)] md:!p-[1.15rem] lg:!p-[1.25rem]"
        >
          <div className="coriolis-sheet-grid">
            <SheetPanel
              title={lt("Image", "Портрет")}
              className="lg:col-span-3"
              actions={
                <>
                  <PanelActionButton
                    disabled={isBusy}
                    onClick={() => {
                      const input = document.getElementById(portraitInputId) as HTMLInputElement | null;
                      input?.click();
                    }}
                  >
                    {portraitActionLabel}
                  </PanelActionButton>
                  <input
                    id={portraitInputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";

                      if (file) {
                        void uploadPortrait(file);
                      }
                    }}
                  />
                </>
              }
            >
              <div className="overflow-hidden rounded-[0.95rem] border border-[var(--line-soft)] bg-[radial-gradient(circle_at_top,_rgba(201,160,80,0.22),_rgba(19,24,36,0.2)_46%,_rgba(8,10,16,0.9)_100%)]">
                {currentCharacter.portraitPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentCharacter.portraitPath}
                    alt={lt(`${currentCharacter.name} portrait`, `Портрет ${currentCharacter.name}`)}
                    className="aspect-[4/5] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center px-6 text-center">
                    <div className="rounded-full border border-[var(--line-strong)] bg-[color:rgba(201,160,80,0.16)] px-5 py-4 text-4xl font-semibold uppercase tracking-[0.12em] text-[var(--paper)]">
                      {getInitials(currentCharacter.name)}
                    </div>
                  </div>
                )}
              </div>
            </SheetPanel>

            <SheetPanel
              title={lt("Passport", "Паспорт")}
              className="lg:col-span-9"
              id="passport"
              actions={
                <PanelActionButton
                  active={sectionIsEditing("passport")}
                  disabled={isBusy}
                  onClick={() => toggleSectionEditor("passport")}
                >
                  {sectionIsEditing("passport") ? lt("Done", "Готово") : lt("Edit", "Редагувати")}
                </PanelActionButton>
              }
            >
              {sectionIsEditing("passport") ? (
                <div className="coriolis-passport-layout">
                  <div className="coriolis-sheet-field-grid coriolis-passport-grid coriolis-passport-grid--meta">
                    <EditableCell>
                      <SavableTextField
                        label={lt("Name", "Ім'я")}
                        value={currentCharacter.name}
                        onCommit={(value) => commitField("name", value)}
                      />
                    </EditableCell>
                    <EditableCell className="coriolis-passport-field--wide">
                      <SavableTextField
                        label={lt("Concept", "Концепт")}
                        value={currentCharacter.concept}
                        onCommit={(value) => commitField("concept", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableTextField
                        label={lt("Icon", "Ікона")}
                        value={currentCharacter.icon}
                        onCommit={(value) => commitField("icon", value)}
                      />
                    </EditableCell>
                    <EditableCell className="coriolis-passport-field--wide">
                      <SavableTextField
                        label={lt("Background", "Походження")}
                        value={currentCharacter.background}
                        onCommit={(value) => commitField("background", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableSelectField
                        label={lt("Home System", "Домашня система")}
                        value={currentCharacter.originSystem ?? ""}
                        options={originSystemOptions}
                        onCommit={(value) => commitField("originSystem", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableSelectField
                        label={lt("Origin Culture", "Культура походження")}
                        value={currentCharacter.originCulture ?? ""}
                        options={originCultureOptions}
                        onCommit={(value) => commitField("originCulture", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableSelectField
                        label={lt("Upbringing", "Виховання")}
                        value={currentCharacter.upbringing ?? ""}
                        options={upbringingOptions}
                        onCommit={(value) => commitField("upbringing", value)}
                      />
                    </EditableCell>
                    <EditableCell className="coriolis-passport-field--wide">
                      <SavableTextField
                        label={lt("Group Concept", "Концепт команди")}
                        value={currentCharacter.groupConcept}
                        onCommit={(value) => commitField("groupConcept", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableNumberField
                        label={lt("Reputation", "Репутація")}
                        min={0}
                        max={12}
                        value={currentCharacter.reputation}
                        onCommit={(value) => commitField("reputation", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableNumberField
                        label={lt("XP Bank", "Запас XP")}
                        min={0}
                        value={currentCharacter.experience}
                        onCommit={(value) => commitField("experience", value)}
                      />
                    </EditableCell>
                  </div>

                  <div className="coriolis-sheet-field-grid coriolis-passport-grid coriolis-passport-grid--appearance">
                    <EditableCell className="coriolis-passport-field--text">
                      <SavableTextField
                        label={lt("Face", "Обличчя")}
                        multiline
                        rows={4}
                        value={currentCharacter.face}
                        onCommit={(value) => commitField("face", value)}
                      />
                    </EditableCell>
                    <EditableCell className="coriolis-passport-field--text">
                      <SavableTextField
                        label={lt("Clothing", "Одяг")}
                        multiline
                        rows={4}
                        value={currentCharacter.clothing}
                        onCommit={(value) => commitField("clothing", value)}
                      />
                    </EditableCell>
                  </div>

                  <div className="coriolis-sheet-field-grid coriolis-passport-grid coriolis-passport-grid--notes">
                    <EditableCell className="coriolis-passport-field--problem">
                      <SavableTextField
                        label={lt("Personal Problem", "Особиста проблема")}
                        multiline
                        rows={4}
                        value={currentCharacter.personalProblem}
                        onCommit={(value) => commitField("personalProblem", value)}
                      />
                    </EditableCell>
                    <EditableCell className="coriolis-passport-field--description">
                      <SavableTextField
                        label={lt("Description", "Опис")}
                        multiline
                        rows={5}
                        value={currentCharacter.description}
                        onCommit={(value) => commitField("description", value)}
                      />
                    </EditableCell>
                  </div>
                </div>
              ) : (
                <div className="coriolis-passport-layout">
                  <div className="coriolis-sheet-field-grid coriolis-passport-grid coriolis-passport-grid--meta">
                    {passportMetaFields.map((field) => (
                      <SheetField
                        key={field.label}
                        className={field.className}
                        label={field.label}
                        value={field.value}
                      />
                    ))}
                  </div>

                  <div className="coriolis-sheet-field-grid coriolis-passport-grid coriolis-passport-grid--appearance">
                    <SheetField
                      className="coriolis-passport-field--text"
                      label={lt("Face", "Обличчя")}
                      value={displayText(currentCharacter.face, emptyLabel)}
                    />
                    <SheetField
                      className="coriolis-passport-field--text"
                      label={lt("Clothing", "Одяг")}
                      value={displayText(currentCharacter.clothing, emptyLabel)}
                    />
                  </div>

                  <div className="coriolis-sheet-field-grid coriolis-passport-grid coriolis-passport-grid--notes">
                    <SheetField
                      className="coriolis-passport-field--problem"
                      label={lt("Personal Problem", "Особиста проблема")}
                      value={displayText(currentCharacter.personalProblem, emptyLabel)}
                    />
                    <SheetField
                      className="coriolis-passport-field--description"
                      label={lt("Description", "Опис")}
                      value={displayText(currentCharacter.description, noEntriesLabel)}
                    />
                  </div>
                </div>
              )}
            </SheetPanel>

            <SheetPanel
              title={lt("Conditions", "Стани")}
              className="lg:col-span-4 coriolis-sheet-panel--conditions"
              id="combat"
              actions={
                <>
                  {sectionIsEditing("conditions") ? (
                    <PanelActionButton disabled={isBusy} onClick={addConditionModifier}>
                      {lt("Add Modifier", "Додати модифікатор")}
                    </PanelActionButton>
                  ) : null}
                  <PanelActionButton
                    active={sectionIsEditing("conditions")}
                    disabled={isBusy}
                    onClick={() => toggleSectionEditor("conditions")}
                  >
                    {sectionIsEditing("conditions") ? lt("Done", "Готово") : lt("Edit", "Редагувати")}
                  </PanelActionButton>
                </>
              }
            >
              {sectionIsEditing("conditions") ? (
                <div className="grid gap-3 p-3">
                  <div className="overflow-hidden rounded-[0.9rem] border border-[rgba(201,160,80,0.12)]">
                    <SheetTrack
                      label={lt("Hit Points", "Очки здоров'я")}
                      note={lt("Strength + Agility", "Сила + Спритність")}
                      value={`${currentCharacter.currentHitPoints}/${currentCharacter.maxHitPoints}`}
                    />
                    <SheetPipRow
                      filled={currentCharacter.currentHitPoints}
                      max={currentCharacter.maxHitPoints}
                    />
                    <div className="px-4 pb-4">
                      <SavableNumberField
                        label={lt("Current HP", "Поточне здоров'я")}
                        min={0}
                        max={currentCharacter.maxHitPoints}
                        value={currentCharacter.currentHitPoints}
                        action={
                          <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                            / {currentCharacter.maxHitPoints}
                          </span>
                        }
                        onCommit={(value) => commitField("currentHitPoints", value)}
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[0.9rem] border border-[rgba(201,160,80,0.12)]">
                    <SheetTrack
                      label={lt("Mind Points", "Очки розуму")}
                      note={lt("Wits + Empathy", "Кмітливість + Емпатія")}
                      value={`${currentCharacter.currentMindPoints}/${currentCharacter.maxMindPoints}`}
                    />
                    <SheetPipRow
                      filled={currentCharacter.currentMindPoints}
                      max={currentCharacter.maxMindPoints}
                    />
                    <div className="px-4 pb-4">
                      <SavableNumberField
                        label={lt("Current MP", "Поточний розум")}
                        min={0}
                        max={currentCharacter.maxMindPoints}
                        value={currentCharacter.currentMindPoints}
                        action={
                          <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                            / {currentCharacter.maxMindPoints}
                          </span>
                        }
                        onCommit={(value) => commitField("currentMindPoints", value)}
                      />
                    </div>
                  </div>

                  <EditableCell>
                    <SavableTextField
                      label={lt("Critical Injuries", "Критичні травми")}
                      multiline
                      rows={3}
                      value={currentCharacter.criticalInjuries}
                      onCommit={(value) => commitField("criticalInjuries", value)}
                    />
                  </EditableCell>

                  <div className="overflow-hidden rounded-[0.9rem] border border-[rgba(201,160,80,0.12)]">
                    <SheetTrack
                      label={lt("Radiation", "Радіація")}
                      note={lt("Exposure", "Опромінення")}
                      value={`${currentCharacter.radiation}/${currentCharacter.maxRadiation}`}
                    />
                    <SheetPipRow
                      filled={currentCharacter.radiation}
                      max={currentCharacter.maxRadiation}
                    />
                    <div className="px-4 pb-4">
                      <SavableNumberField
                        label={lt("Current Radiation", "Поточна радіація")}
                        min={0}
                        max={currentCharacter.maxRadiation}
                        value={currentCharacter.radiation}
                        action={
                          <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                            / {currentCharacter.maxRadiation}
                          </span>
                        }
                        onCommit={(value) => commitField("radiation", value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {currentCharacter.conditionModifiers.length === 0 ? (
                      <p className="rounded-[1.1rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                        {lt(
                          "No condition modifiers active. Add one to mirror the full sheet.",
                          "Немає активних модифікаторів стану. Додайте його, щоб compact view повторював повний лист.",
                        )}
                      </p>
                    ) : null}
                    {currentCharacter.conditionModifiers.map((modifier) => (
                      <CompactConditionModifierEditor
                        key={modifier.id}
                        modifier={modifier}
                        onCommit={(field, value) => updateConditionModifier(modifier, field, value)}
                        onDelete={() => requestConditionModifierRemoval(modifier)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-0">
                  <SheetTrack
                    label={lt("Hit Points", "Очки здоров'я")}
                    note={lt("Strength + Agility", "Сила + Спритність")}
                    value={`${currentCharacter.currentHitPoints}/${currentCharacter.maxHitPoints}`}
                  />
                  <SheetPipRow
                    filled={currentCharacter.currentHitPoints}
                    max={currentCharacter.maxHitPoints}
                  />
                  <SheetTrack
                    label={lt("Mind Points", "Очки розуму")}
                    note={lt("Wits + Empathy", "Кмітливість + Емпатія")}
                    value={`${currentCharacter.currentMindPoints}/${currentCharacter.maxMindPoints}`}
                  />
                  <SheetPipRow
                    filled={currentCharacter.currentMindPoints}
                    max={currentCharacter.maxMindPoints}
                  />
                  <SheetField
                    label={lt("Critical Injuries", "Критичні травми")}
                    value={displayText(currentCharacter.criticalInjuries, emptyLabel)}
                  />
                  <SheetTrack
                    label={lt("Radiation", "Радіація")}
                    note={lt("Exposure", "Опромінення")}
                    value={`${currentCharacter.radiation}/${currentCharacter.maxRadiation}`}
                  />
                  <SheetPipRow
                    filled={currentCharacter.radiation}
                    max={currentCharacter.maxRadiation}
                  />
                  <div className="border-x border-b border-[rgba(201,160,80,0.12)] px-4 py-3">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                      {lt("Condition Modifiers", "Модифікатори стану")}
                    </p>
                  </div>
                  <CompactTable
                    dense
                    emptyMessage={lt(
                      "No condition modifiers active.",
                      "Немає активних модифікаторів стану.",
                    )}
                    headers={[
                      lt("Target", "Ціль"),
                      lt("Name", "Назва"),
                      lt("Value", "Значення"),
                      lt("Description", "Опис"),
                    ]}
                    rows={modifierRows}
                  />
                </div>
              )}
            </SheetPanel>

            <SheetPanel
              title={lt("Talents", "Таланти")}
              className="lg:col-span-8"
              id="skills-talents"
              actions={
                <>
                  {sectionIsEditing("talents") ? (
                    <PanelActionButton disabled={isBusy} onClick={addTalent}>
                      {lt("Add Talent", "Додати талант")}
                    </PanelActionButton>
                  ) : null}
                  <PanelActionButton
                    active={sectionIsEditing("talents")}
                    disabled={isBusy}
                    onClick={() => toggleSectionEditor("talents")}
                  >
                    {sectionIsEditing("talents") ? lt("Done", "Готово") : lt("Edit", "Редагувати")}
                  </PanelActionButton>
                </>
              }
            >
              {sectionIsEditing("talents") ? (
                <div className="grid gap-3 p-3">
                  {currentCharacter.talents.length === 0 ? (
                    <p className="rounded-[1.1rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                      {lt("No talents yet. Add the first one here.", "Талантів ще немає. Додайте перший тут.")}
                    </p>
                  ) : null}
                  {currentCharacter.talents.map((talent) => (
                    <CompactTalentEditor
                      key={talent.id}
                      talent={talent}
                      onCommit={(field, value) => commitRepeater("talent", talent.id, field, value)}
                      onDelete={() =>
                        requestRepeaterRemoval(
                          "talent",
                          talent.id,
                          talent.name.trim() || lt("talent", "талант"),
                          lt("Talent removed.", "Талант прибрано."),
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <CompactTable
                  dense
                  emptyMessage={lt("No talents yet.", "Талантів ще немає.")}
                  headers={[
                    lt("Source", "Джерело"),
                    lt("Talent", "Талант"),
                    lt("Notes", "Нотатки"),
                  ]}
                  rows={talentRows}
                />
              )}
            </SheetPanel>

            <SheetPanel
              title={lt("Skills", "Навички")}
              className="lg:col-span-12 coriolis-sheet-panel--skills"
              actions={
                <PanelActionButton
                  active={sectionIsEditing("skills")}
                  disabled={isBusy}
                  onClick={() => toggleSectionEditor("skills")}
                >
                  {sectionIsEditing("skills") ? lt("Done", "Готово") : lt("Edit", "Редагувати")}
                </PanelActionButton>
              }
            >
              <div className="coriolis-skill-groups">
                {skillGroups.map((group) => (
                  <section key={group.key} className="coriolis-skill-group">
                    {sectionIsEditing("skills") ? (
                      <>
                        <div className="border-b border-[rgba(201,160,80,0.12)] p-3">
                          <SavableNumberField
                            label={group.label}
                            min={1}
                            max={5}
                            value={group.value}
                            action={<CompactPips filled={group.value} max={5} />}
                            onCommit={(value) => commitField(group.field, value)}
                          />
                        </div>
                        <div className="divide-y divide-[rgba(201,160,80,0.1)]">
                          {group.rows.map((skill) => (
                            <div
                              key={skill.key}
                              className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_160px] md:items-start"
                            >
                              <div>
                                <p className="text-sm uppercase tracking-[0.08em] text-[var(--paper)]">
                                  {skill.label}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                                  {skill.kind === "advanced"
                                    ? lt("Advanced", "Просунута")
                                    : lt("General", "Загальна")}
                                </p>
                              </div>
                              <SavableNumberField
                                label={lt("Rank/(total)", "Ранг/(усього)")}
                                min={0}
                                max={5}
                                value={skill.value}
                                action={
                                  <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                                    {skill.total ?? "—"}
                                  </span>
                                }
                                onCommit={(value) => commitField(skill.field, value)}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="coriolis-skill-group__header">
                          <div>
                            <p className="coriolis-sheet-field__label">{lt("Attribute", "Атрибут")}</p>
                            <h3 className="coriolis-skill-group__title">{group.label}</h3>
                          </div>
                          <div className="coriolis-skill-group__meta">
                            <span className="coriolis-skill-group__value">{group.value}</span>
                            <CompactPips filled={group.value} max={5} />
                          </div>
                        </div>
                        <CompactTable
                          dense
                          className="coriolis-skill-table"
                          emptyMessage={lt("No skills available.", "Немає навичок.")}
                          headers={[
                            lt("Skill", "Навичка"),
                            lt("Rank/(total)", "Ранг/(усього)"),
                          ]}
                          rows={group.rows.map((skill) => ({
                            key: skill.key,
                            cells: [skill.label, `${skill.value} (${skill.total ?? "—"})`],
                          }))}
                        />
                      </>
                    )}
                  </section>
                ))}
              </div>
            </SheetPanel>

            <SheetPanel
              title={lt("Inventory", "Інвентар")}
              className="lg:col-span-12"
              id="loadout"
              actions={
                <>
                  {sectionIsEditing("inventory") ? (
                    <>
                      <PanelActionButton disabled={isBusy} onClick={() => setDrawerKind("weapon")}>
                        {lt("Add Weapon", "Додати зброю")}
                      </PanelActionButton>
                      <PanelActionButton disabled={isBusy} onClick={() => setDrawerKind("gear")}>
                        {lt("Add Gear", "Додати спорядження")}
                      </PanelActionButton>
                      <PanelActionButton disabled={isBusy} onClick={() => setDrawerKind("tiny")}>
                        {lt("Add Tiny", "Додати дрібницю")}
                      </PanelActionButton>
                    </>
                  ) : null}
                  <PanelActionButton
                    active={sectionIsEditing("inventory")}
                    disabled={isBusy}
                    onClick={() => toggleSectionEditor("inventory")}
                  >
                    {sectionIsEditing("inventory") ? lt("Done", "Готово") : lt("Edit", "Редагувати")}
                  </PanelActionButton>
                </>
              }
            >
              <div className="grid gap-2 md:grid-cols-[minmax(0,_0.95fr)_minmax(0,_1.45fr)] xl:grid-cols-[minmax(0,_0.9fr)_minmax(0,_1.5fr)]">
                <div className="grid content-start gap-2">
                  <InventoryBlock title={lt("Equipment", "Спорядження")}>
                    {sectionIsEditing("inventory") ? (
                      <div className="grid gap-3 p-3">
                        {gearItems.length === 0 && tinyItems.length === 0 ? (
                          <p className="rounded-[1rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                            {lt("No equipment listed yet.", "Спорядження ще не внесене.")}
                          </p>
                        ) : null}

                        {gearItems.map((item) => (
                          <CompactGearEditor
                            key={item.id}
                            item={item}
                            onCommit={(field, value) => commitRepeater("gear", item.id, field, value)}
                            onDelete={() =>
                              requestRepeaterRemoval(
                                "gear",
                                item.id,
                                item.name.trim() || lt("gear item", "предмет"),
                                lt("Inventory updated.", "Інвентар оновлено."),
                              )
                            }
                          />
                        ))}

                        {tinyItems.length > 0 ? (
                          <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                            {lt("Tiny Items", "Дрібні предмети")}
                          </p>
                        ) : null}
                        {tinyItems.map((item) => (
                          <CompactGearEditor
                            key={item.id}
                            item={item}
                            showEncumbrance={false}
                            onCommit={(field, value) => commitRepeater("gear", item.id, field, value)}
                            onDelete={() =>
                              requestRepeaterRemoval(
                                "gear",
                                item.id,
                                item.name.trim() || lt("tiny item", "дрібниця"),
                                lt("Inventory updated.", "Інвентар оновлено."),
                              )
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <CompactTable
                        dense
                        emptyMessage={lt("No equipment listed yet.", "Спорядження ще не внесене.")}
                        headers={[
                          lt("Item", "Предмет"),
                          lt("Type", "Тип"),
                          lt("Qty", "К-сть"),
                          lt("Bonus", "Бонус"),
                        ]}
                        rows={equipmentRows}
                      />
                    )}
                  </InventoryBlock>

                  <InventoryBlock title={lt("Armor", "Броня")}>
                    {sectionIsEditing("inventory") ? (
                      <div className="grid gap-3 p-3">
                        <SavableTextField
                          label={lt("Name", "Назва")}
                          value={currentCharacter.armorName}
                          onCommit={(value) => commitField("armorName", value)}
                        />
                        <SavableNumberField
                          label={lt("Rating", "Рейтинг")}
                          min={0}
                          max={12}
                          value={currentCharacter.armorRating}
                          onCommit={(value) => commitField("armorRating", value)}
                        />
                        <SavableTextField
                          label={lt("Comment", "Коментар")}
                          multiline
                          rows={3}
                          value={currentCharacter.armorComment}
                          onCommit={(value) => commitField("armorComment", value)}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-0">
                        <SheetField
                          label={lt("Name", "Назва")}
                          value={displayText(currentCharacter.armorName, emptyLabel)}
                        />
                        <SheetField
                          label={lt("Rating", "Рейтинг")}
                          value={currentCharacter.armorRating}
                        />
                        <SheetField
                          label={lt("Comment", "Коментар")}
                          value={displayText(currentCharacter.armorComment, emptyLabel)}
                        />
                      </div>
                    )}
                  </InventoryBlock>
                </div>

                <div className="grid content-start gap-2">
                  <InventoryBlock title={lt("Weapons", "Зброя")}>
                    {sectionIsEditing("inventory") ? (
                      <div className="grid gap-3 p-3">
                        {currentCharacter.weapons.length === 0 ? (
                          <p className="rounded-[1rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                            {lt("No weapons added yet.", "Зброю ще не додано.")}
                          </p>
                        ) : null}
                        {currentCharacter.weapons.map((weapon) => (
                          <CompactWeaponEditor
                            key={weapon.id}
                            weapon={weapon}
                            onCommit={(field, value) => commitRepeater("weapon", weapon.id, field, value)}
                            onDelete={() =>
                              requestRepeaterRemoval(
                                "weapon",
                                weapon.id,
                                weapon.name.trim() || lt("weapon", "зброя"),
                                lt("Inventory updated.", "Інвентар оновлено."),
                              )
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <CompactTable
                        className="min-w-[44rem] xl:min-w-0"
                        dense
                        emptyMessage={lt("No weapons added yet.", "Зброю ще не додано.")}
                        headers={[
                          lt("Name", "Назва"),
                          lt("Bonus", "Бонус"),
                          lt("Init", "Ініц."),
                          lt("Dmg", "Шк."),
                          lt("Crit", "Крит"),
                          lt("Range", "Дальність"),
                          lt("Note", "Нотатка"),
                        ]}
                        rows={weaponRows}
                      />
                    )}
                  </InventoryBlock>

                  <InventoryBlock title={lt("Birr + Notes", "Бірри й нотатки")} id="notes">
                    {sectionIsEditing("inventory") ? (
                      <div className="grid gap-3 p-3">
                        <SavableNumberField
                          label={lt("Birr", "Бірри")}
                          min={0}
                          max={999999}
                          value={currentCharacter.birr}
                          onCommit={(value) => commitField("birr", value)}
                        />
                        <SavableTextField
                          label={lt("Notes", "Нотатки")}
                          multiline
                          rows={4}
                          value={currentCharacter.notes}
                          onCommit={(value) => commitField("notes", value)}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-0">
                        <SheetField
                          label={lt("Birr", "Бірри")}
                          value={`${birrFormatter.format(currentCharacter.birr)} ${lt("birr", "бірр")}`}
                        />
                        <SheetField
                          label={lt("Notes", "Нотатки")}
                          value={displayText(currentCharacter.notes, noEntriesLabel)}
                        />
                      </div>
                    )}
                  </InventoryBlock>
                </div>
              </div>
            </SheetPanel>

            <SheetPanel
              title={lt("Contacts + Cabin", "Контакти й каюта")}
              className="lg:col-span-6"
              id="support"
              actions={
                <>
                  {sectionIsEditing("contacts") ? (
                    <PanelActionButton disabled={isBusy} onClick={addContact}>
                      {lt("Add Contact", "Додати контакт")}
                    </PanelActionButton>
                  ) : null}
                  <PanelActionButton
                    active={sectionIsEditing("contacts")}
                    disabled={isBusy}
                    onClick={() => toggleSectionEditor("contacts")}
                  >
                    {sectionIsEditing("contacts") ? lt("Done", "Готово") : lt("Edit", "Редагувати")}
                  </PanelActionButton>
                </>
              }
            >
              {sectionIsEditing("contacts") ? (
                <div className="grid gap-3 p-3">
                  {currentCharacter.contacts.length === 0 ? (
                    <p className="rounded-[1rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
                      {lt("No contacts logged yet.", "Контакти ще не занесені.")}
                    </p>
                  ) : null}
                  {currentCharacter.contacts.map((contact) => (
                    <CompactContactEditor
                      key={contact.id}
                      contact={contact}
                      onCommit={(field, value) => commitRepeater("contact", contact.id, field, value)}
                      onDelete={() =>
                        requestRepeaterRemoval(
                          "contact",
                          contact.id,
                          contact.name.trim() || lt("contact", "контакт"),
                          lt("Contact removed.", "Контакт прибрано."),
                        )
                      }
                    />
                  ))}
                  <div className="coriolis-sheet-field-grid md:grid-cols-3">
                    <EditableCell>
                      <SavableTextField
                        label={lt("Cabin", "Каюта")}
                        multiline
                        rows={3}
                        value={currentCharacter.myCabinDescription}
                        onCommit={(value) => commitField("myCabinDescription", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableTextField
                        label={lt("Cabin Gear", "Спорядження каюти")}
                        multiline
                        rows={3}
                        value={currentCharacter.myCabinGear}
                        onCommit={(value) => commitField("myCabinGear", value)}
                      />
                    </EditableCell>
                    <EditableCell>
                      <SavableTextField
                        label={lt("Cabin Other", "Інше в каюті")}
                        multiline
                        rows={3}
                        value={currentCharacter.myCabinOther}
                        onCommit={(value) => commitField("myCabinOther", value)}
                      />
                    </EditableCell>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <CompactTable
                    dense
                    emptyMessage={lt("No contacts logged yet.", "Контакти ще не занесені.")}
                    headers={[
                      lt("Name", "Ім'я"),
                      lt("Concept", "Концепт"),
                      lt("Notes", "Нотатки"),
                    ]}
                    rows={contactRows}
                  />
                  <div className="coriolis-sheet-field-grid md:grid-cols-3">
                    <SheetField
                      label={lt("Cabin", "Каюта")}
                      value={displayText(currentCharacter.myCabinDescription, emptyLabel)}
                    />
                    <SheetField
                      label={lt("Cabin Gear", "Спорядження каюти")}
                      value={displayText(currentCharacter.myCabinGear, emptyLabel)}
                    />
                    <SheetField
                      label={lt("Cabin Other", "Інше в каюті")}
                      value={displayText(currentCharacter.myCabinOther, emptyLabel)}
                    />
                  </div>
                </div>
              )}
            </SheetPanel>

            <SheetPanel
              title={lt("Relationships", "Стосунки")}
              className="lg:col-span-12"
              actions={
                <>
                  {sectionIsEditing("relationships") ? (
                    <PanelActionButton
                      disabled={isBusy || unassignedRelationshipNames.length === 0}
                      onClick={addRelationship}
                    >
                      {lt("Add Row", "Додати рядок")}
                    </PanelActionButton>
                  ) : null}
                  <PanelActionButton
                    active={sectionIsEditing("relationships")}
                    disabled={isBusy}
                    onClick={() => toggleSectionEditor("relationships")}
                  >
                    {sectionIsEditing("relationships") ? lt("Done", "Готово") : lt("Edit", "Редагувати")}
                  </PanelActionButton>
                </>
              }
            >
              {sectionIsEditing("relationships") ? (
                <div className="grid gap-3 p-3">
                  {currentCharacter.relationships.length === 0 ? (
                    <p className="rounded-[1rem] border border-dashed border-[var(--line-soft)] px-4 py-5 text-sm text-[var(--ink-muted)]">
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
                  {currentCharacter.relationships.map((relationship) => {
                    const isCurrentTargetValid = otherCharacterNames.includes(relationship.targetName);
                    const relationshipTargetOptions = [
                      {
                        value: "",
                        label:
                          otherCharacterNames.length === 0
                            ? lt(
                                "There are no other sheets in the roster",
                                "У реєстрі немає інших аркушів",
                              )
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
                            !currentCharacter.relationships.some(
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
                      <CompactRelationshipEditor
                        key={relationship.id}
                        relationship={relationship}
                        options={relationshipTargetOptions}
                        onCommit={(field, value) => commitRepeater("relationship", relationship.id, field, value)}
                        onDelete={() =>
                          requestRepeaterRemoval(
                            "relationship",
                            relationship.id,
                            relationship.targetName.trim() || lt("relationship", "стосунок"),
                            lt("Relationship removed.", "Стосунок прибрано."),
                          )
                        }
                        onToggleBuddy={() => markRelationshipBuddy(relationship.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <CompactTable
                  dense
                  emptyMessage={lt(
                    "No crew relationships recorded yet.",
                    "Стосунки з екіпажем ще не зафіксовані.",
                  )}
                  headers={[
                    lt("Other PC", "Інший ПГ"),
                    lt("Bond", "Зв'язок"),
                    lt("Buddy", "Напарник"),
                  ]}
                  rows={relationshipRows}
                />
              )}
            </SheetPanel>
          </div>
        </main>

        {isCrewDialogOpen ? (
          <CrewPickerModal
            activeCharacterId={currentCharacter.id}
            characters={characterSummaries}
            onClose={() => setIsCrewDialogOpen(false)}
          />
        ) : null}

        <CompactPresetDrawer
          kind={drawerKind}
          onClose={() => setDrawerKind(null)}
          onPick={(kind, presetId) => {
            runTask(async () => {
              const updated = await addInventoryPresetAction({
                characterId: currentCharacter.id,
                kind,
                presetId,
              });
              patchCharacter(updated);
              setDrawerKind(null);
            }, lt("Inventory updated.", "Інвентар оновлено."));
          }}
        />

        <style jsx global>{`
          .coriolis-sheet-board--mobile-plain {
            background: none !important;
            box-shadow: none !important;
          }

          @media (min-width: 768px) {
            .coriolis-sheet-board--mobile-plain {
              background:
                linear-gradient(180deg, rgba(248, 238, 216, 0.04), rgba(248, 238, 216, 0.018)),
                linear-gradient(135deg, rgba(201, 160, 80, 0.04), transparent 22%),
                rgba(7, 10, 18, 0.92) !important;
              box-shadow:
                0 30px 90px rgba(4, 7, 13, 0.34),
                inset 0 1px 0 rgba(255, 246, 226, 0.04) !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
