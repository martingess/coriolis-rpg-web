"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import {
  createTeamRepeaterItemAction,
  deleteTeamRepeaterItemAction,
  promoteKnownFaceToCharacterAction,
  updateTeamFieldAction,
  updateTeamRepeaterFieldAction,
} from "@/app/actions";
import {
  SavableNumberField,
  SavableSelectField,
  SavableTextField,
} from "@/components/field-controls";
import { LanguageSwitcher } from "@/components/language-switcher";
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
import {
  TEAM_FULL_HREF,
  TEAM_HREF,
  getCompactCharacterHref,
  getCharacterHref,
} from "@/lib/roster-routes";
import type { CharacterRecord } from "@/lib/roster-types";
import {
  findBestCharactersByField,
  findBestCharactersBySkill,
  findBestCharactersForRole,
  formatBestMatchNames,
} from "@/lib/team-readouts";
import {
  groupConceptValues,
  groupTalentOptionsByConcept,
  teamCrewRoleValues,
  teamFactionStanceValues,
  teamNoteTagValues,
  type GroupConcept,
  type TeamFactionTieRecord,
  type TeamKnownFaceRecord,
  type TeamNoteRecord,
  type TeamRecord,
  type TeamRepeaterKind,
  type TeamScalarField,
} from "@/lib/team-types";
import { useLocaleText } from "@/lib/use-locale-text";

type CompactTeamSheetProps = {
  characters: CharacterRecord[];
  team: TeamRecord;
};

type SkillReadoutField = Extract<
  keyof CharacterRecord,
  | "command"
  | "manipulation"
  | "observation"
  | "pilot"
  | "rangedCombat"
  | "technology"
>;

type CompactTableRow = {
  cells: ReactNode[];
  key: string;
};

const attributeSpotlightFields: Array<{
  field: Extract<keyof CharacterRecord, "strength" | "agility" | "wits" | "empathy">;
}> = [
  { field: "strength" },
  { field: "agility" },
  { field: "wits" },
  { field: "empathy" },
];

const skillReadoutFields: SkillReadoutField[] = [
  "observation",
  "pilot",
  "technology",
  "command",
  "manipulation",
  "rangedCombat",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function CompactTable({
  className = "",
  emptyMessage,
  headers,
  rows,
}: {
  className?: string;
  emptyMessage: string;
  headers: ReactNode[];
  rows: CompactTableRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`coriolis-compact-table ${className}`}>
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

function SubsectionBlock({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[0.7rem] border border-[rgba(201,160,80,0.14)] bg-[linear-gradient(180deg,rgba(248,238,216,0.028),rgba(248,238,216,0.014)),rgba(8,11,18,0.62)]">
      <div className="flex min-h-[2.15rem] items-center border-b border-[rgba(201,160,80,0.14)] bg-[linear-gradient(90deg,rgba(201,160,80,0.12),rgba(201,160,80,0.03)_28%,transparent_100%),rgba(248,238,216,0.02)] px-[0.78rem] py-2">
        <h3 className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[var(--paper)]">
          {title}
        </h3>
        {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="coriolis-sheet-field">
      <p className="coriolis-sheet-field__label">{label}</p>
      <div className="coriolis-sheet-field__value">{value}</div>
    </div>
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
  characters,
  onClose,
  teamName,
}: {
  characters: CharacterRecord[];
  onClose: () => void;
  teamName: string;
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
                "Jump between the compact crew dossier and every character dossier from one place.",
                "Перемикайтеся між компактним досьє екіпажу та досьє всіх персонажів з одного місця.",
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
            className="block rounded-[1.15rem] border border-[var(--gold)] bg-[color:rgba(201,160,80,0.14)] px-4 py-4 transition"
            onClick={onClose}
          >
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
              {lt("Current Ledger", "Поточний журнал")}
            </p>
            <p className="mt-2 text-base font-medium uppercase tracking-[0.14em] text-[var(--paper)]">
              {teamName}
            </p>
          </Link>
          <div className="grid gap-3">
            {characters.map((entry) => (
              <Link
                key={entry.id}
                href={getCompactCharacterHref(entry.id)}
                className="block rounded-[1.15rem] border border-[var(--line-soft)] bg-[rgba(245,231,204,0.03)] px-4 py-4 transition hover:border-[var(--gold)] hover:bg-[color:rgba(201,160,80,0.08)]"
                onClick={onClose}
              >
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                  {lt("Character Dossier", "Досьє персонажа")}
                </p>
                <p className="mt-2 text-base font-medium uppercase tracking-[0.14em] text-[var(--paper)]">
                  {entry.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompactTeamSheet({ characters, team }: CompactTeamSheetProps) {
  const router = useRouter();
  const { isUk, lt } = useLocaleText();
  const [currentTeam, setCurrentTeam] = useState(team);
  const [crew, setCrew] = useState(characters);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCrewDialogOpen, setIsCrewDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [isTransitionPending, startTransition] = useTransition();
  const emptyLabel = lt("Not filled", "Не заповнено");
  const noEntriesLabel = lt("No entries yet", "Записів ще немає");
  const heroTitleClassName = isUk
    ? "text-[1.9rem] font-semibold uppercase tracking-[0.06em] text-[var(--paper)] sm:text-[2.35rem]"
    : "font-display text-[2.3rem] uppercase tracking-[0.12em] text-[var(--paper)] sm:text-[2.7rem]";
  const heroEyebrowClassName = isUk
    ? "text-[0.72rem] uppercase tracking-[0.14em] text-[var(--ink-faint)]"
    : "text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]";
  const statusMessage = isUploading
    ? lt("Uploading portrait...", "Завантажую портрет...")
    : pendingTasks > 0 || isTransitionPending
      ? lt("Saving changes...", "Зберігаю зміни...")
      : notice;
  const sectionLinks = [
    {
      href: "#team-passport",
      label: lt("Crew Passport", "Паспорт екіпажу"),
      description: lt(
        "Identity, concept, patron, nemesis, and the shared story of the crew.",
        "Назва, концепт, патрон, немезида та спільна історія екіпажу.",
      ),
    },
    {
      href: "#crew-overview",
      label: lt("Crew", "Екіпаж"),
      description: lt(
        "Member roster, best-match readouts, and a compact bridge snapshot.",
        "Склад команди, ключові readout-и та компактний зріз містка.",
      ),
    },
    {
      href: "#crew-roles",
      label: lt("Crew Roles", "Ролі екіпажу"),
      description: lt(
        "Bridge stations, best fits, and primary or backup assignments.",
        "Станції містка, найкращі кандидати та основні або резервні призначення.",
      ),
    },
    {
      href: "#ship-mission",
      label: lt("Ship + Mission", "Корабель і місія"),
      description: lt(
        "Ship profile, debt, upgrades, current objective, and the next lead.",
        "Профіль корабля, борг, покращення, поточна ціль та наступна зачіпка.",
      ),
    },
    {
      href: "#team-factions",
      label: lt("Faction Ties", "Зв'язки з фракціями"),
      description: lt(
        "Faction heat, leverage, and the current balance of pressure around the crew.",
        "Жар фракцій, важелі впливу та поточний баланс тиску навколо екіпажу.",
      ),
    },
    {
      href: "#team-memory",
      label: lt("Faces + Notes", "Обличчя й нотатки"),
      description: lt(
        "Known faces, trust tracking, promotion to crew, and structured notes.",
        "Знайомі обличчя, відстеження довіри, підвищення до екіпажу та структуровані нотатки.",
      ),
    },
    {
      href: "#team-timeline",
      label: lt("Timeline", "Хронологія"),
      description: lt(
        "The shared story arc of the crew, nested by major beats and fallout.",
        "Спільна історія екіпажу, вкладена за ключовими подіями та їхніми наслідками.",
      ),
    },
  ];

  useEffect(() => {
    setCurrentTeam(team);
  }, [team]);

  useEffect(() => {
    setCrew(characters);
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

  function patchTeam(updatedTeam: TeamRecord) {
    startTransition(() => {
      setCurrentTeam(updatedTeam);
    });
  }

  function patchCharacter(updatedCharacter: CharacterRecord) {
    startTransition(() => {
      setCrew((currentCrew) => {
        const hasCharacter = currentCrew.some((entry) => entry.id === updatedCharacter.id);
        const nextCrew = currentCrew.map((entry) =>
          entry.id === updatedCharacter.id ? updatedCharacter : entry,
        );

        return hasCharacter ? nextCrew : [...nextCrew, updatedCharacter];
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

  function commitTeamField(field: TeamScalarField, value: string | number) {
    runTask(async () => {
      const updated = await updateTeamFieldAction({
        teamId: currentTeam.id,
        field,
        value,
      });
      patchTeam(updated);
    });
  }

  function commitTeamRepeater(
    kind: TeamRepeaterKind,
    id: string,
    field: string,
    value: string | number,
  ) {
    runTask(async () => {
      const updated = await updateTeamRepeaterFieldAction({
        kind,
        id,
        field,
        value,
      });
      patchTeam(updated);
    });
  }

  function addTeamRepeater(
    kind: Exclude<TeamRepeaterKind, "crewPosition">,
    options?: { parentBeatId?: string | null },
  ) {
    runTask(async () => {
      const updated = await createTeamRepeaterItemAction({
        teamId: currentTeam.id,
        kind,
        parentBeatId: options?.parentBeatId,
      });
      patchTeam(updated);
    }, lt("Crew ledger updated.", "Журнал екіпажу оновлено."));
  }

  function requestTeamRepeaterRemoval(
    kind: Exclude<TeamRepeaterKind, "crewPosition">,
    id: string,
    entryLabel: string,
  ) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(lt(`Remove ${entryLabel}?`, `Прибрати ${entryLabel}?`))
    ) {
      return;
    }

    runTask(async () => {
      const updated = await deleteTeamRepeaterItemAction({ kind, id });
      patchTeam(updated);
    }, lt("Crew ledger updated.", "Журнал екіпажу оновлено."));
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
        error?: string;
        team?: TeamRecord;
      };

      if (!response.ok || !payload.team) {
        throw new Error(payload.error ?? lt("Portrait upload failed.", "Не вдалося завантажити портрет."));
      }

      patchTeam(payload.team);
      setNotice(lt("Known-face portrait updated.", "Портрет знайомого обличчя оновлено."));
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

  function promoteKnownFace(knownFaceId: string) {
    runTask(async () => {
      const result = await promoteKnownFaceToCharacterAction(knownFaceId);
      patchTeam(result.team);
      patchCharacter(result.character);
      router.push(getCharacterHref(result.character.id));
    }, lt("Known face promoted to the crew.", "Знайоме обличчя переведено до екіпажу."));
  }

  const rolesByCharacterId = new Map<string, string[]>();

  for (const crewPosition of currentTeam.crewPositions) {
    if (crewPosition.primaryCharacterId) {
      const roles = rolesByCharacterId.get(crewPosition.primaryCharacterId) ?? [];
      roles.push(getTeamCrewRoleLabel(crewPosition.role));
      rolesByCharacterId.set(crewPosition.primaryCharacterId, roles);
    }
  }

  const groupConceptOptions = [
    { value: "", label: lt("Choose crew concept", "Оберіть концепт команди") },
    ...groupConceptValues.map((value) => ({
      value,
      label: getGroupConceptLabel(value),
    })),
  ];
  const availableGroupTalents =
    groupConceptValues.includes(currentTeam.groupConcept as GroupConcept)
      ? groupTalentOptionsByConcept[currentTeam.groupConcept as GroupConcept]
      : [];
  const groupTalentOptions = [
    {
      value: "",
      label:
        availableGroupTalents.length > 0
          ? lt("Choose crew talent", "Оберіть талант команди")
          : lt("Choose a crew concept first", "Спочатку оберіть концепт команди"),
    },
    ...(!availableGroupTalents.includes(currentTeam.groupTalent) && currentTeam.groupTalent
      ? [{ value: currentTeam.groupTalent, label: currentTeam.groupTalent }]
      : []),
    ...availableGroupTalents.map((value) => ({
      value,
      label: value,
    })),
  ];
  const characterSelectOptions = [
    { value: "", label: lt("Unassigned", "Не призначено") },
    ...crew.map((character) => ({
      value: character.id,
      label: character.name,
    })),
  ];
  const factionStanceOptions = teamFactionStanceValues.map((value) => ({
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
  const maxHeat = currentTeam.factionTies.reduce(
    (highest, tie) => Math.max(highest, tie.heat),
    0,
  );

  const attributeRows: CompactTableRow[] = attributeSpotlightFields.map(({ field }) => {
    const bestMatch = findBestCharactersByField(crew, field);

    return {
      key: field,
      cells: [
        getAttributeLabel(field),
        bestMatch
          ? `${formatBestMatchNames(bestMatch.winners)} · ${bestMatch.value}`
          : lt("No crew", "Немає екіпажу"),
      ],
    };
  });

  const skillRows: CompactTableRow[] = skillReadoutFields.map((field) => {
    const bestMatch = findBestCharactersBySkill(crew, field);

    return {
      key: field,
      cells: [
        getSkillLabel(field),
        bestMatch
          ? `${formatBestMatchNames(bestMatch.winners)} · ${bestMatch.value}`
          : crew.length > 0
            ? lt("No trained crew", "Немає підготовленого екіпажу")
            : lt("No crew", "Немає екіпажу"),
      ],
    };
  });

  const roleRows: CompactTableRow[] = teamCrewRoleValues.map((role) => {
    const bestMatch = findBestCharactersForRole(crew, role);

    return {
      key: role,
      cells: [
        getTeamCrewRoleLabel(role),
        bestMatch
          ? formatBestMatchNames(bestMatch.winners)
          : crew.length > 0
            ? lt("No trained crew", "Немає підготовленого екіпажу")
            : lt("No crew", "Немає екіпажу"),
      ],
    };
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--night)] text-[var(--ink)]">
      <div className="coriolis-stars pointer-events-none fixed inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-12 pt-4 md:px-6 lg:px-8">
        <header className="coriolis-panel relative mb-5 rounded-[1.7rem] border border-[var(--line-strong)] px-4 py-4 shadow-[0_24px_80px_rgba(4,7,13,0.36)] sm:px-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] xl:items-start">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className={heroEyebrowClassName}>
                  {lt("Bridge Dossier", "Місткове досьє")}
                </p>
                <h1 className={heroTitleClassName}>
                  {lt("Compact Crew Dossier", "Компактне досьє екіпажу")}
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
                  <Link href={TEAM_FULL_HREF} className="coriolis-chip">
                    {lt("Full Sheet", "Повний лист")}
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-[var(--line-soft)] bg-[rgba(245,231,204,0.03)] px-4 py-3">
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                  {lt("Active Dossier", "Активне досьє")}
                </p>
                <p className="mt-2 text-[1rem] font-medium uppercase tracking-[0.14em] text-[var(--paper)]">
                  {currentTeam.name}
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
                  description={section.description}
                  href={section.href}
                  label={section.label}
                />
              ))}
            </nav>
          </div>
        </header>

        <main className="coriolis-sheet-board coriolis-sheet-board--mobile-plain !border-0 !p-0 md:!border md:!border-[rgba(201,160,80,0.16)] md:!p-[1.15rem] lg:!p-[1.25rem]">
          <div className="coriolis-sheet-grid">
            <SheetPanel id="team-passport" className="lg:col-span-12" title={lt("Crew Passport", "Паспорт екіпажу")}>
              <div className="grid gap-0 md:grid-cols-4">
                <SavableTextField
                  className="coriolis-sheet-field md:col-span-2"
                  label={lt("Crew Name", "Назва екіпажу")}
                  value={currentTeam.name}
                  onCommit={(value) => commitTeamField("name", value)}
                />
                <SavableSelectField
                  className="coriolis-sheet-field"
                  label={lt("Crew Concept", "Концепт команди")}
                  value={currentTeam.groupConcept}
                  options={groupConceptOptions}
                  onCommit={(value) => commitTeamField("groupConcept", value)}
                />
                <SavableSelectField
                  className="coriolis-sheet-field"
                  label={lt("Crew Talent", "Талант команди")}
                  value={currentTeam.groupTalent}
                  options={groupTalentOptions}
                  onCommit={(value) => commitTeamField("groupTalent", value)}
                />
                <SavableTextField
                  className="coriolis-sheet-field md:col-span-2"
                  label={lt("Crew Manifesto", "Маніфест екіпажу")}
                  value={currentTeam.manifesto}
                  onCommit={(value) => commitTeamField("manifesto", value)}
                />
                <SavableTextField
                  className="coriolis-sheet-field"
                  label={lt("Patron", "Патрон")}
                  value={currentTeam.patron}
                  onCommit={(value) => commitTeamField("patron", value)}
                />
                <SavableTextField
                  className="coriolis-sheet-field"
                  label={lt("Nemesis", "Немезида")}
                  value={currentTeam.nemesis}
                  onCommit={(value) => commitTeamField("nemesis", value)}
                />
              </div>

              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                <SavableTextField
                  className="coriolis-sheet-field"
                  label={lt("Crew Story", "Історія команди")}
                  multiline
                  rows={6}
                  value={currentTeam.story}
                  onCommit={(value) => commitTeamField("story", value)}
                />
                <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-1">
                  <MetricCard label={lt("Crew", "Екіпаж")} value={crew.length} />
                  <MetricCard
                    label={lt("Known Faces", "Знайомі обличчя")}
                    value={currentTeam.knownFaces.length}
                  />
                  <MetricCard label={lt("Open Notes", "Нотатки")} value={currentTeam.notes.length} />
                  <MetricCard label={lt("Max Heat", "Макс. жар")} value={maxHeat} />
                </div>
              </div>
            </SheetPanel>

            <SheetPanel id="crew-overview" className="lg:col-span-12" title={lt("Crew Overview", "Огляд екіпажу")}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
                <div className="grid gap-3">
                  <SubsectionBlock title={lt("Best by Attributes", "Найкращі за атрибутами")}>
                    <CompactTable
                      headers={[
                        lt("Focus", "Фокус"),
                        lt("Best Match", "Найкращий збіг"),
                      ]}
                      rows={attributeRows}
                      emptyMessage={noEntriesLabel}
                    />
                  </SubsectionBlock>
                  <SubsectionBlock title={lt("Key Skills", "Ключові навички")}>
                    <CompactTable
                      headers={[
                        lt("Skill", "Навичка"),
                        lt("Best Match", "Найкращий збіг"),
                      ]}
                      rows={skillRows}
                      emptyMessage={noEntriesLabel}
                    />
                  </SubsectionBlock>
                  <SubsectionBlock title={lt("Best by Role", "Найкращі за роллю")}>
                    <CompactTable
                      headers={[
                        lt("Role", "Роль"),
                        lt("Best Match", "Найкращий збіг"),
                      ]}
                      rows={roleRows}
                      emptyMessage={noEntriesLabel}
                    />
                  </SubsectionBlock>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {crew.map((character) => {
                    const assignedRoles = rolesByCharacterId.get(character.id) ?? [];

                    return (
                      <div
                        key={character.id}
                        className="overflow-hidden rounded-[0.7rem] border border-[rgba(201,160,80,0.14)] bg-[linear-gradient(180deg,rgba(248,238,216,0.028),rgba(248,238,216,0.014)),rgba(8,11,18,0.62)]"
                      >
                        <div className="flex gap-3 border-b border-[rgba(201,160,80,0.14)] p-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[0.8rem] border border-[var(--line-soft)] bg-[rgba(245,231,204,0.06)] text-sm uppercase tracking-[0.18em] text-[var(--paper)]">
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
                            <p className="text-[0.82rem] font-medium uppercase tracking-[0.12em] text-[var(--paper)]">
                              {character.name}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                              {character.concept || emptyLabel}
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-0">
                          <MetricCard label={lt("Icon", "Ікона")} value={character.icon || emptyLabel} />
                          <MetricCard label={lt("Reputation", "Репутація")} value={character.reputation} />
                        </div>
                        <div className="border-t border-[rgba(201,160,80,0.14)] p-3">
                          <div className="mb-3 flex flex-wrap gap-2">
                            {assignedRoles.length > 0 ? (
                              assignedRoles.map((role) => (
                                <span
                                  key={`${character.id}-${role}`}
                                  className="rounded-full border border-[var(--line-soft)] bg-[rgba(245,231,204,0.05)] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--ink-muted)]"
                                >
                                  {role}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-[var(--line-soft)] bg-[rgba(245,231,204,0.05)] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                                {lt("Unassigned", "Не призначено")}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="coriolis-chip w-full justify-center"
                            onClick={() => router.push(getCharacterHref(character.id))}
                          >
                            {lt("Open Dossier", "Відкрити досьє")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SheetPanel>

            <SheetPanel id="crew-roles" className="lg:col-span-12" title={lt("Crew Roles", "Ролі екіпажу")}>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {currentTeam.crewPositions.map((crewPosition) => {
                  return (
                    <div
                      key={crewPosition.id}
                      className="overflow-hidden rounded-[0.7rem] border border-[rgba(201,160,80,0.14)] bg-[linear-gradient(180deg,rgba(248,238,216,0.028),rgba(248,238,216,0.014)),rgba(8,11,18,0.62)]"
                    >
                      <div className="border-b border-[rgba(201,160,80,0.14)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                              {getTeamCrewRoleLabel(crewPosition.role)}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                              {getTeamCrewRoleDescription(crewPosition.role)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-0">
                        <SavableSelectField
                          className="coriolis-sheet-field"
                          label={lt("Primary", "Основний")}
                          value={crewPosition.primaryCharacterId ?? ""}
                          options={characterSelectOptions}
                          onCommit={(value) =>
                            commitTeamRepeater("crewPosition", crewPosition.id, "primaryCharacterId", value)
                          }
                        />
                        <SavableSelectField
                          className="coriolis-sheet-field"
                          label={lt("Backup", "Резервний")}
                          value={crewPosition.backupCharacterId ?? ""}
                          options={characterSelectOptions}
                          onCommit={(value) =>
                            commitTeamRepeater("crewPosition", crewPosition.id, "backupCharacterId", value)
                          }
                        />
                        <SavableTextField
                          className="coriolis-sheet-field"
                          label={lt("Station Notes", "Нотатки по станції")}
                          multiline
                          rows={3}
                          value={crewPosition.notes}
                          onCommit={(value) =>
                            commitTeamRepeater("crewPosition", crewPosition.id, "notes", value)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SheetPanel>

            <SheetPanel id="ship-mission" className="lg:col-span-12" title={lt("Ship + Mission", "Корабель і місія")}>
              <div className="grid gap-3 lg:grid-cols-2">
                <SubsectionBlock title={lt("Ship", "Корабель")}>
                  <div className="grid gap-0 md:grid-cols-2">
                    <SavableTextField
                      className="coriolis-sheet-field"
                      label={lt("Ship Name", "Назва корабля")}
                      value={currentTeam.shipName}
                      onCommit={(value) => commitTeamField("shipName", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field"
                      label={lt("Ship Type", "Тип корабля")}
                      value={currentTeam.shipType}
                      onCommit={(value) => commitTeamField("shipType", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field"
                      label={lt("Ship Class", "Клас корабля")}
                      value={currentTeam.shipClass}
                      onCommit={(value) => commitTeamField("shipClass", value)}
                    />
                    <SavableNumberField
                      className="coriolis-sheet-field"
                      label={lt("Debt", "Борг")}
                      min={0}
                      value={currentTeam.shipDebt}
                      onCommit={(value) => commitTeamField("shipDebt", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field md:col-span-2"
                      label={lt("Ship Problem", "Проблема корабля")}
                      value={currentTeam.shipProblem}
                      onCommit={(value) => commitTeamField("shipProblem", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field md:col-span-2"
                      label={lt("Upgrades", "Покращення")}
                      multiline
                      rows={4}
                      value={currentTeam.shipUpgrades}
                      onCommit={(value) => commitTeamField("shipUpgrades", value)}
                    />
                  </div>
                </SubsectionBlock>

                <SubsectionBlock title={lt("Mission Board", "Дошка місії")}>
                  <div className="grid gap-0 md:grid-cols-2">
                    <SavableTextField
                      className="coriolis-sheet-field md:col-span-2"
                      label={lt("Current Goal", "Поточна ціль")}
                      value={currentTeam.currentGoal}
                      onCommit={(value) => commitTeamField("currentGoal", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field md:col-span-2"
                      label={lt("Next Lead", "Наступна зачіпка")}
                      value={currentTeam.nextLead}
                      onCommit={(value) => commitTeamField("nextLead", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field"
                      label={lt("Reward", "Винагорода")}
                      value={currentTeam.reward}
                      onCommit={(value) => commitTeamField("reward", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field"
                      label={lt("Deadline", "Дедлайн")}
                      value={currentTeam.deadline}
                      onCommit={(value) => commitTeamField("deadline", value)}
                    />
                    <SavableTextField
                      className="coriolis-sheet-field md:col-span-2"
                      label={lt("Unresolved Mystery", "Нерозкрита таємниця")}
                      multiline
                      rows={4}
                      value={currentTeam.unresolvedMystery}
                      onCommit={(value) => commitTeamField("unresolvedMystery", value)}
                    />
                  </div>
                </SubsectionBlock>
              </div>
            </SheetPanel>

            <SheetPanel
              id="team-factions"
              className="lg:col-span-12"
              title={lt("Faction Ties", "Зв'язки з фракціями")}
              actions={
                <button type="button" className="coriolis-chip" onClick={() => addTeamRepeater("factionTie")}>
                  {lt("Add Tie", "Додати зв'язок")}
                </button>
              }
            >
              <div className="grid gap-3">
                {currentTeam.factionTies.length === 0 ? (
                  <div className="coriolis-sheet-field">
                    <p className="coriolis-sheet-field__value text-[var(--ink-muted)]">
                      {lt(
                        "Track allies, enemies, faction heat, and who currently holds leverage over the crew.",
                        "Фіксуйте союзників, ворогів, рівень жару фракцій і те, хто зараз має важелі впливу на команду.",
                      )}
                    </p>
                  </div>
                ) : null}
                {currentTeam.factionTies.map((tie: TeamFactionTieRecord) => (
                  <div
                    key={tie.id}
                    className="overflow-hidden rounded-[0.7rem] border border-[rgba(201,160,80,0.14)] bg-[linear-gradient(180deg,rgba(248,238,216,0.028),rgba(248,238,216,0.014)),rgba(8,11,18,0.62)]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[rgba(201,160,80,0.14)] px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[0.66rem] uppercase tracking-[0.2em] text-[var(--paper)]">
                          {tie.faction || lt("Unnamed tie", "Безіменний зв'язок")}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--ink-faint)]">
                          {lt("Faction status, leverage, and field notes", "Статус фракції, важелі впливу й польові нотатки")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-[0.62rem] uppercase tracking-[0.18em] text-[var(--ink-faint)]"
                        onClick={() =>
                          requestTeamRepeaterRemoval("factionTie", tie.id, lt("this faction tie", "цей зв'язок із фракцією"))
                        }
                      >
                        {lt("Remove", "Прибрати")}
                      </button>
                    </div>
                    <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_220px_120px]">
                      <SavableTextField
                        className="coriolis-sheet-field"
                        label={lt("Faction", "Фракція")}
                        value={tie.faction}
                        onCommit={(value) => commitTeamRepeater("factionTie", tie.id, "faction", value)}
                      />
                      <SavableSelectField
                        className="coriolis-sheet-field"
                        label={lt("Stance", "Позиція")}
                        value={tie.stance}
                        options={factionStanceOptions}
                        onCommit={(value) => commitTeamRepeater("factionTie", tie.id, "stance", value)}
                      />
                      <SavableNumberField
                        className="coriolis-sheet-field"
                        label={lt("Heat", "Жар")}
                        min={0}
                        max={5}
                        value={tie.heat}
                        onCommit={(value) => commitTeamRepeater("factionTie", tie.id, "heat", value)}
                      />
                    </div>
                    <div className="grid gap-0 md:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
                      <SavableTextField
                        className="coriolis-sheet-field"
                        label={lt("Leverage Holder", "Хто тримає важіль")}
                        value={tie.leverageHolder}
                        onCommit={(value) =>
                          commitTeamRepeater("factionTie", tie.id, "leverageHolder", value)
                        }
                      />
                      <div className="coriolis-sheet-field hidden md:block">
                        <p className="coriolis-sheet-field__label">
                          {lt("Current stance", "Поточна позиція")}
                        </p>
                        <div className="coriolis-sheet-field__value">
                          {getTeamFactionStanceLabel(tie.stance)}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-[rgba(201,160,80,0.14)]">
                      <SavableTextField
                        className="coriolis-sheet-field"
                        label={lt("Notes", "Нотатки")}
                        multiline
                        rows={5}
                        value={tie.notes}
                        onCommit={(value) => commitTeamRepeater("factionTie", tie.id, "notes", value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SheetPanel>

            <SheetPanel id="team-memory" className="lg:col-span-12" title={lt("Shared Memory", "Спільна пам'ять")}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <SubsectionBlock
                  title={lt("Known Faces", "Знайомі обличчя")}
                  actions={
                    <button type="button" className="coriolis-chip" onClick={() => addTeamRepeater("knownFace")}>
                      {lt("Add Face", "Додати обличчя")}
                    </button>
                  }
                >
                  <div className="grid gap-3">
                    {currentTeam.knownFaces.length === 0 ? (
                      <div className="coriolis-sheet-field">
                        <p className="coriolis-sheet-field__value text-[var(--ink-muted)]">
                          {lt(
                            "Shared contacts live here: upload a portrait, track trust, and promote them into the crew when the story turns.",
                            "Тут живуть спільні контакти: завантажуйте портрет, відстежуйте довіру і переводьте їх до екіпажу, коли того потребує сюжет.",
                          )}
                        </p>
                      </div>
                    ) : null}
                    {currentTeam.knownFaces.map((knownFace: TeamKnownFaceRecord) => (
                      <div
                        key={knownFace.id}
                        className="overflow-hidden rounded-[0.7rem] border border-[rgba(201,160,80,0.14)] bg-[linear-gradient(180deg,rgba(248,238,216,0.028),rgba(248,238,216,0.014)),rgba(8,11,18,0.62)]"
                      >
                        <div className="flex flex-col gap-3 border-b border-[rgba(201,160,80,0.14)] p-3 md:flex-row">
                          <div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] border border-[var(--line-soft)] bg-[rgba(245,231,204,0.06)] text-sm uppercase tracking-[0.18em] text-[var(--paper)]">
                            {knownFace.portraitPath ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={knownFace.portraitPath}
                                alt={`${knownFace.name || lt("Known Face", "Знайоме обличчя")} portrait`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(knownFace.name || lt("Unknown Face", "Невідоме обличчя"))}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[0.82rem] font-medium uppercase tracking-[0.12em] text-[var(--paper)]">
                                  {knownFace.name || lt("Known Face", "Знайоме обличчя")}
                                </p>
                                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                                  {knownFace.concept || emptyLabel}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="text-[0.62rem] uppercase tracking-[0.18em] text-[var(--ink-faint)]"
                                onClick={() =>
                                  requestTeamRepeaterRemoval("knownFace", knownFace.id, lt("this known face", "це знайоме обличчя"))
                                }
                              >
                                {lt("Remove", "Прибрати")}
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <label className="coriolis-chip cursor-pointer">
                                {lt("Upload Avatar", "Завантажити аватар")}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                      void uploadKnownFacePortrait(knownFace.id, file);
                                    }
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                              {knownFace.promotedCharacterId ? (
                                <button
                                  type="button"
                                  className="coriolis-chip"
                                  onClick={() => router.push(getCharacterHref(knownFace.promotedCharacterId!))}
                                >
                                  {lt("Open Dossier", "Відкрити досьє")}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="coriolis-chip"
                                  onClick={() => promoteKnownFace(knownFace.id)}
                                >
                                  {lt("Promote to Crew", "Підвищити до екіпажу")}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-0 md:grid-cols-2">
                          <SavableTextField
                            className="coriolis-sheet-field"
                            label={lt("Name", "Ім'я")}
                            value={knownFace.name}
                            onCommit={(value) => commitTeamRepeater("knownFace", knownFace.id, "name", value)}
                          />
                          <SavableTextField
                            className="coriolis-sheet-field"
                            label={lt("Concept", "Концепт")}
                            value={knownFace.concept}
                            onCommit={(value) => commitTeamRepeater("knownFace", knownFace.id, "concept", value)}
                          />
                          <SavableTextField
                            className="coriolis-sheet-field"
                            label={lt("Faction", "Фракція")}
                            value={knownFace.faction}
                            onCommit={(value) => commitTeamRepeater("knownFace", knownFace.id, "faction", value)}
                          />
                          <SavableTextField
                            className="coriolis-sheet-field"
                            label={lt("Last Seen", "Де бачили востаннє")}
                            value={knownFace.lastSeen}
                            onCommit={(value) => commitTeamRepeater("knownFace", knownFace.id, "lastSeen", value)}
                          />
                          <SavableSelectField
                            className="coriolis-sheet-field md:col-span-2"
                            label={lt("Trust", "Довіра")}
                            value={String(knownFace.trustLevel)}
                            options={trustOptions}
                            onCommit={(value) => commitTeamRepeater("knownFace", knownFace.id, "trustLevel", value)}
                          />
                          <SavableTextField
                            className="coriolis-sheet-field md:col-span-2"
                            label={lt("Notes", "Нотатки")}
                            multiline
                            rows={4}
                            value={knownFace.notes}
                            onCommit={(value) => commitTeamRepeater("knownFace", knownFace.id, "notes", value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SubsectionBlock>

                <SubsectionBlock
                  title={lt("Structured Notes", "Структуровані нотатки")}
                  actions={
                    <button type="button" className="coriolis-chip" onClick={() => addTeamRepeater("note")}>
                      {lt("Add Note", "Додати нотатку")}
                    </button>
                  }
                >
                  <div className="grid gap-3">
                    {currentTeam.notes.length === 0 ? (
                      <div className="coriolis-sheet-field">
                        <p className="coriolis-sheet-field__value text-[var(--ink-muted)]">
                          {lt(
                            "Use notes for mission prompts, debts, ship problems, and unresolved NPC threads.",
                            "Використовуйте нотатки для підказок місії, боргів, проблем корабля та незавершених ліній NPC.",
                          )}
                        </p>
                      </div>
                    ) : null}
                    {currentTeam.notes.map((note: TeamNoteRecord) => (
                      <div
                        key={note.id}
                        className="overflow-hidden rounded-[0.7rem] border border-[rgba(201,160,80,0.14)] bg-[linear-gradient(180deg,rgba(248,238,216,0.028),rgba(248,238,216,0.014)),rgba(8,11,18,0.62)]"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-[rgba(201,160,80,0.14)] px-3 py-2">
                          <p className="text-[0.66rem] uppercase tracking-[0.2em] text-[var(--paper)]">
                            {note.title || lt("Untitled note", "Нотатка без назви")}
                          </p>
                          <button
                            type="button"
                            className="text-[0.62rem] uppercase tracking-[0.18em] text-[var(--ink-faint)]"
                            onClick={() =>
                              requestTeamRepeaterRemoval("note", note.id, lt("this note", "цю нотатку"))
                            }
                          >
                            {lt("Remove", "Прибрати")}
                          </button>
                        </div>
                        <div className="grid gap-0">
                          <SavableSelectField
                            className="coriolis-sheet-field"
                            label={lt("Tag", "Тег")}
                            value={note.tag}
                            options={noteTagOptions}
                            onCommit={(value) => commitTeamRepeater("note", note.id, "tag", value)}
                          />
                          <SavableTextField
                            className="coriolis-sheet-field"
                            label={lt("Title", "Заголовок")}
                            value={note.title}
                            onCommit={(value) => commitTeamRepeater("note", note.id, "title", value)}
                          />
                          <SavableTextField
                            className="coriolis-sheet-field"
                            label={lt("Body", "Текст")}
                            multiline
                            rows={4}
                            value={note.body}
                            onCommit={(value) => commitTeamRepeater("note", note.id, "body", value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SubsectionBlock>
              </div>
            </SheetPanel>

            <TeamStoryTimeline
              className="xl:!col-span-12 !rounded-[1rem] !border-[rgba(201,160,80,0.16)] !p-4 md:!p-4"
              storyBeats={currentTeam.storyBeats}
              onCreateBeat={(parentBeatId) =>
                addTeamRepeater("storyBeat", parentBeatId ? { parentBeatId } : undefined)
              }
              onRemoveBeat={(beatId) =>
                requestTeamRepeaterRemoval("storyBeat", beatId, lt("this story beat", "цю подію історії"))
              }
              onUpdateBeat={(beatId, field, value) =>
                commitTeamRepeater("storyBeat", beatId, field, value)
              }
            />
          </div>
        </main>
      </div>

      {isCrewDialogOpen ? (
        <CrewPickerModal
          characters={crew}
          onClose={() => setIsCrewDialogOpen(false)}
          teamName={currentTeam.name}
        />
      ) : null}
    </div>
  );
}
