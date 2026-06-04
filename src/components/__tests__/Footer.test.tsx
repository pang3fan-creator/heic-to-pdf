import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import frMessages from "../../../messages/fr.json";
import Footer from "../Footer";

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "fr"],
    defaultLocale: "en",
    localePrefix: "as-needed",
  },
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

function renderFooter(locale: "en" | "fr") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? enMessages : frMessages}>
      <Footer />
    </NextIntlClientProvider>,
  );
}

describe("Footer", () => {
  it("links to the combine HEIC to PDF article and removes All articles in English", () => {
    renderFooter("en");

    expect(screen.queryByRole("link", { name: "All articles" })).toBeNull();
    expect(screen.getByRole("link", { name: "Combine HEIC to PDF" }).getAttribute("href")).toBe(
      "/blog/combine-heic-to-pdf",
    );
  });

  it("localizes the combine HEIC to PDF footer link in French", () => {
    renderFooter("fr");

    expect(screen.queryByRole("link", { name: "Tous les articles" })).toBeNull();
    expect(screen.getByRole("link", { name: "Fusionner HEIC en PDF" }).getAttribute("href")).toBe(
      "/fr/blog/combine-heic-to-pdf",
    );
  });
});
