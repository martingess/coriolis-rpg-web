"use client";

import { useTranslation } from "react-i18next";

import type { AppLanguage } from "@/lib/i18n";

export function useLocaleText() {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? "uk") as AppLanguage;
  const isUk = language === "uk";

  return {
    isUk,
    language,
    lt: (en: string, uk: string) => (isUk ? uk : en),
  };
}
