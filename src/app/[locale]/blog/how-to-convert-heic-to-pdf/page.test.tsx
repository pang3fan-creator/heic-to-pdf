import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../../../messages/en.json";
import BlogArticlePage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(({ namespace }: { namespace: string }) => {
    const namespaceValue = namespace
      .split(".")
      .reduce<Record<string, unknown> | unknown>((value, key) => {
        if (value && typeof value === "object" && key in value) {
          return (value as Record<string, unknown>)[key];
        }
        return undefined;
      }, messages);

    return (key: string) =>
      key.split(".").reduce<Record<string, unknown> | string | unknown>((value, part) => {
        if (value && typeof value === "object" && part in value) {
          return (value as Record<string, unknown>)[part];
        }
        return undefined;
      }, namespaceValue) as string;
  }),
}));

vi.mock("@/components/Navbar", () => ({
  default: () => createElement("nav", { "aria-label": "Main navigation" }),
}));

vi.mock("@/components/Footer", () => ({
  default: () => createElement("footer"),
}));

function renderBlogArticle() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BlogArticlePage />
    </NextIntlClientProvider>,
  );
}

describe("How to Convert HEIC to PDF blog article page", () => {
  it("renders the article shell from localized content", () => {
    renderBlogArticle();

    expect(
      screen.getAllByRole("heading", {
        name: "How to Convert HEIC to PDF: A Private & Instant Guide (2026)",
      }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("progressbar", { name: "Reading progress" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Most Read" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Try HEIC to PDF" }).getAttribute("href")).toBe(
      "/",
    );
    expect(screen.getByRole("heading", { name: "Related Articles" })).toBeTruthy();
  });

  it("adds BlogPosting structured data with the current language", () => {
    const { container } = renderBlogArticle();
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).toBeTruthy();
    const structuredData = JSON.parse(script?.textContent ?? "{}");
    expect(structuredData["@type"]).toBe("BlogPosting");
    expect(structuredData.headline).toBe(
      "How to Convert HEIC to PDF: A Private Guide",
    );
    expect(structuredData.inLanguage).toBe("en");
  });

  it("keeps one page-level main landmark", () => {
    const { container } = renderBlogArticle();

    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector(".blog-article-body")?.tagName).toBe("ARTICLE");
  });

  it("generates canonical blog metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(metadata.title).toBe("How to Convert HEIC to PDF: A Private Guide");
    expect(metadata.description).toContain("Learn how to convert HEIC to PDF locally in your browser");
    expect(metadata.alternates).toEqual({
      canonical: "https://heicpdf.to/blog/how-to-convert-heic-to-pdf",
      languages: {
        en: "https://heicpdf.to/blog/how-to-convert-heic-to-pdf",
        "x-default": "https://heicpdf.to/blog/how-to-convert-heic-to-pdf",
      },
    });
  });
});
