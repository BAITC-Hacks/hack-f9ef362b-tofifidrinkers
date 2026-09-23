"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { translator, type Locale } from "./i18n";
const memory = new Map<string, string>();
const CHANGE = "akim-preference-change";
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(CHANGE, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(CHANGE, notify);
  };
}
/** SSR-safe external preference store, with an in-session fallback if storage is blocked. */
export function useStoredValue(key: string, initial: string) {
  const read = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? memory.get(key) ?? initial;
    } catch {
      return memory.get(key) ?? initial;
    }
  }, [key, initial]);
  const server = useCallback(() => initial, [initial]);
  const value = useSyncExternalStore(subscribe, read, server);
  const setValue = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* Session remains usable. */
      }
      window.dispatchEvent(new Event(CHANGE));
    },
    [key],
  );
  return [value, setValue] as const;
}
export function useLocale() {
  const [saved, setValue] = useStoredValue("akim-language", "ru");
  const locale: Locale = saved === "kk" || saved === "en" ? saved : "ru";
  useEffect(() => {
    const previous = document.documentElement.lang,
      title = document.title;
    document.documentElement.lang = locale;
    document.title = `${translator(locale)("mayor")} · ${translator(locale)("fiveHours")}`;
    return () => {
      document.documentElement.lang = previous;
      document.title = title;
    };
  }, [locale]);
  return {
    locale,
    setLocale: (value: Locale) => setValue(value),
    t: translator(locale),
  };
}
