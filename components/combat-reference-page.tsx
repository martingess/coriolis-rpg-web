"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { COMBAT_HREF, SHIP_COMBAT_HREF, TEAM_HREF } from "@/lib/roster-routes";

type RuleEntry = {
  children?: RuleEntry[];
  childrenStyle?: "ordered" | "unordered";
  text: string;
};

type RuleSection = {
  entries: RuleEntry[];
  ordered?: boolean;
  title: string;
};

type CombatReferencePageProps = {
  mode: "personal" | "ship";
};

function RouteChip({
  active,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`min-w-fit rounded-full border px-3.5 py-2 text-xs uppercase tracking-[0.18em] transition sm:px-4 sm:text-sm ${
        active
          ? "border-[var(--gold)] bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
          : "border-[var(--line-soft)] bg-[color:rgba(245,231,204,0.06)] text-[var(--ink-muted)] hover:border-[var(--line-strong)] hover:text-[var(--paper)]"
      }`}
    >
      {label}
    </Link>
  );
}

function RuleList({
  entries,
  ordered = false,
  depth = 0,
}: {
  depth?: number;
  entries: RuleEntry[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";
  const listClassName = ordered
    ? "list-decimal"
    : depth === 0
      ? "list-disc"
      : "list-[circle]";

  return (
    <ListTag
      className={`space-y-3 pl-5 text-sm leading-6 text-[var(--ink-muted)] marker:text-[var(--gold)] ${listClassName}`}
    >
      {entries.map((entry, index) => (
        <li key={`${entry.text}-${index}`} className="pl-1">
          <span className="text-[var(--paper)]">{entry.text}</span>
          {entry.children?.length ? (
            <div className="mt-3">
              <RuleList
                depth={depth + 1}
                entries={entry.children}
                ordered={entry.childrenStyle === "ordered"}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ListTag>
  );
}

export function CombatReferencePage({ mode }: CombatReferencePageProps) {
  const { t } = useTranslation();
  const sections = t("combat.source.sections", {
    returnObjects: true,
  }) as RuleSection[];

  const section = mode === "personal" ? sections[0] : sections[1];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--night)] text-[var(--ink)]">
      <div className="coriolis-stars pointer-events-none fixed inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-14 pt-4 md:px-6 lg:px-8">
        <header className="sticky top-4 z-30 mb-5 rounded-[1.7rem] border border-[var(--line-strong)] bg-[color:rgba(14,18,29,0.78)] px-3 py-3 shadow-[0_24px_80px_rgba(4,7,13,0.36)] backdrop-blur-xl sm:px-4 sm:py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.34em] text-[var(--ink-faint)]">
                  {t("combat.page.eyebrow")}
                </p>
                <h1 className="font-display text-[2.35rem] leading-[0.88] uppercase tracking-[0.12em] text-[var(--paper)] sm:text-[2.8rem] lg:text-4xl lg:tracking-[0.16em]">
                  {section.title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-[var(--ink-muted)] sm:text-[0.98rem]">
                  {t("combat.page.description")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LanguageSwitcher />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 pr-4 [scrollbar-width:none]">
              <RouteChip active={false} href={TEAM_HREF} label={t("common.nav.team")} />
              <RouteChip active href={COMBAT_HREF} label={t("common.nav.combat")} />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 pr-4 [scrollbar-width:none]">
              <RouteChip
                active={mode === "personal"}
                href={COMBAT_HREF}
                label={t("common.nav.personalCombat")}
              />
              <RouteChip
                active={mode === "ship"}
                href={SHIP_COMBAT_HREF}
                label={t("common.nav.shipCombat")}
              />
            </div>
          </div>
        </header>

        <main className="grid gap-5 xl:gap-6">
          <section className="coriolis-panel relative overflow-hidden rounded-[1.7rem] border border-[var(--line-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <h2 className="mb-5 font-display text-[1.85rem] uppercase tracking-[0.14em] text-[var(--paper)]">
              {section.title}
            </h2>
            <RuleList entries={section.entries} ordered={section.ordered} />
          </section>
        </main>
      </div>
    </div>
  );
}
