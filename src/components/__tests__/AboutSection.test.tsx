import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import frMessages from "../../../messages/fr.json";
import AboutSection from "../AboutSection";

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "fr"],
    defaultLocale: "en",
    localePrefix: "as-needed",
  },
}));

function renderEnglishAboutSection() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AboutSection />
    </NextIntlClientProvider>,
  );
}

function renderFrenchAboutSection() {
  return render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      <AboutSection />
    </NextIntlClientProvider>,
  );
}

describe("AboutSection", () => {
  it("renders a supporting link to the HEIC vs JPEG guide in English", () => {
    renderEnglishAboutSection();

    const link = screen.getByRole("link", {
      name: "Compare HEIC and JPEG in more detail",
    });

    expect(link.getAttribute("href")).toBe("/blog/heic-vs-jpeg");

    const combineLink = screen.getByRole("link", {
      name: "Learn how to combine multiple HEIC photos into one PDF",
    });

    expect(combineLink.getAttribute("href")).toBe("/blog/combine-heic-to-pdf");
  });

  it("renders a localized supporting link in French", () => {
    renderFrenchAboutSection();

    const link = screen.getByRole("link", {
      name: "Comparer HEIC et JPEG plus en détail",
    });

    expect(link.getAttribute("href")).toBe("/fr/blog/heic-vs-jpeg");

    const combineLink = screen.getByRole("link", {
      name: "Apprendre à fusionner plusieurs photos HEIC en un seul PDF",
    });

    expect(combineLink.getAttribute("href")).toBe("/fr/blog/combine-heic-to-pdf");
  });
});
