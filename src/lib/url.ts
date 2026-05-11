import { routing } from "@/i18n/routing";

const BASE_URL = "https://heicpdf.to";

export function buildAlternates(locale: string, path: string) {
  const languages: Record<string, string> = {};

  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    languages[loc] = `${BASE_URL}${prefix}${path}`;
  }
  languages["x-default"] = `${BASE_URL}${path}`;

  const currentPrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const canonical = `${BASE_URL}${currentPrefix}${path}`;

  return { canonical, languages };
}
