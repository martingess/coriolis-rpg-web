"use client";

import { useEffect, useTransition } from "react";
import { useTranslation } from "react-i18next";

import {
  defaultLanguage,
  i18n,
  languageStorageKey,
  type AppLanguage,
} from "@/lib/i18n";

const languageOptions: AppLanguage[] = ["en", "uk"];

export function LanguageSwitcher() {
  const { t, i18n: activeI18n } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const currentLanguage = (activeI18n.resolvedLanguage ??
    activeI18n.language ??
    defaultLanguage) as AppLanguage;

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(languageStorageKey) as
      | AppLanguage
      | null;

    if (storedLanguage && storedLanguage !== currentLanguage) {
      void i18n.changeLanguage(storedLanguage);
      document.documentElement.lang = storedLanguage;
      return;
    }

    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  function setLanguage(language: AppLanguage) {
    if (language === currentLanguage) {
      return;
    }

    startTransition(() => {
      window.localStorage.setItem(languageStorageKey, language);
      document.documentElement.lang = language;
      void i18n.changeLanguage(language);
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--line-soft)] bg-[color:rgba(245,231,204,0.06)] px-2 py-1">
      <span className="px-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
        {t("common.language.label")}
      </span>
      {languageOptions.map((language) => {
        const isActive = language === currentLanguage;

        return (
          <button
            key={language}
            type="button"
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
              isActive
                ? "bg-[color:rgba(201,160,80,0.18)] text-[var(--paper)]"
                : "text-[var(--ink-muted)] hover:text-[var(--paper)]"
            }`}
            disabled={isPending}
            onClick={() => setLanguage(language)}
          >
            {language === "en"
              ? t("common.language.english")
              : t("common.language.ukrainian")}
          </button>
        );
      })}
    </div>
  );
}
