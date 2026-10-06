import { z } from "zod";
import raw from "./legacy/translations.json";
const translations = z
  .record(z.string(), z.record(z.string(), z.string()))
  .parse(raw);
export function translate(
  language: string,
  spanish: string,
  english: string,
): string {
  return language === "es"
    ? spanish
    : language === "en"
      ? english
      : (translations[language]?.[spanish] ?? english);
}
export const languages = [
  "es",
  "en",
  "fr",
  "zh",
  "hi",
  "ar",
  "de",
  "it",
  "pt",
] as const;
export function textDirection(language: string): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}
export function localeFor(language?: string): string {
  return languages.some((known) => known === language) ? language! : "es";
}
