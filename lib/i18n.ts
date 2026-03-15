"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const languageStorageKey = "coriolis-language";
export const defaultLanguage = "uk";
export const supportedLanguages = ["en", "uk"] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

const resources = {
  en: {
    translation: {
      common: {
        actions: {
          add: "Add",
          apply: "Apply",
          cancel: "Cancel",
          close: "Close",
          delete: "Delete",
          hide: "Hide",
          new: "New",
          open: "Open",
          remove: "Remove",
          rename: "Rename",
          save: "Save",
          showAll: "Show all",
        },
        language: {
          english: "English",
          ukrainian: "Ukrainian",
          label: "Language",
        },
        quickNav: {
          active: "Active section",
          label: "Quick Nav",
        },
        states: {
          none: "None",
          ready: "Ready",
          unknown: "Unknown",
        },
      },
      controls: {
        decreaseTo: "decrease to {{value}}",
        setTo: "set to {{value}}",
      },
      layout: {
        title: "Coriolis Dossier",
        description: "Interactive character and crew roster for Coriolis.",
      },
    },
  },
  uk: {
    translation: {
      common: {
        actions: {
          add: "Додати",
          apply: "Застосувати",
          cancel: "Скасувати",
          close: "Закрити",
          delete: "Видалити",
          hide: "Сховати",
          new: "Нове",
          open: "Відкрити",
          remove: "Прибрати",
          rename: "Перейменувати",
          save: "Зберегти",
          showAll: "Показати все",
        },
        quickNav: {
          active: "Активний розділ",
          label: "Швидка навігація",
        },
        language: {
          english: "Англійська",
          ukrainian: "Українська",
          label: "Мова",
        },
        states: {
          none: "Немає",
          ready: "Готово",
          unknown: "Невідомо",
        },
      },
      controls: {
        decreaseTo: "зменшити до {{value}}",
        setTo: "встановити {{value}}",
      },
      layout: {
        title: "Досьє Коріоліса",
        description: "Інтерактивний реєстр персонажів і команди для Coriolis.",
      },
    },
  },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: defaultLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export { i18n };
