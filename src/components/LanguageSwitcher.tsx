"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import type { ChangeEvent } from "react";

const languageLabels: Record<string, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    router.replace(pathname, { locale: e.target.value });
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      aria-label="Select language"
      className="lang-switcher"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {languageLabels[loc] ?? loc}
        </option>
      ))}
    </select>
  );
}
