import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../../../messages/en.json";
import frMessages from "../../../../../messages/fr.json";
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

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "fr"],
    defaultLocale: "en",
  },
}));

function renderBlogArticle() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BlogArticlePage />
    </NextIntlClientProvider>,
  );
}

function renderFrenchBlogArticle() {
  return render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      <BlogArticlePage />
    </NextIntlClientProvider>,
  );
}

describe("HEIC to PDF on iPhone blog article page", () => {
  it("renders the article shell from localized content", () => {
    const { container } = renderBlogArticle();

    expect(
      screen.getAllByRole("heading", {
        name: "How to Convert HEIC to PDF on iPhone",
      }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("progressbar", { name: "Reading progress" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Most Read" })).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: /Combine Multiple HEIC Photos Into One PDF/ })
        .some((link) => link.getAttribute("href") === "/blog/combine-heic-to-pdf"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /combine multiple HEIC photos into one PDF/ })
        .some((link) => link.getAttribute("href") === "/blog/combine-heic-to-pdf"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /HEIC vs JPEG/ })
        .some((link) => link.getAttribute("href") === "/blog/heic-vs-jpeg"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "Try HEIC to PDF" }).getAttribute("href")).toBe(
      "/",
    );
    expect(container.querySelector(".blog-convert-cta")).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "Merge multiple HEIC photos into one PDF cover",
      }).getAttribute("src"),
    ).toBe("/images/blog/combine-heic-to-pdf-cover.png");
    expect(
      screen.getByRole("img", {
        name: "HEIC vs JPEG image format comparison cover",
      }).getAttribute("src"),
    ).toBe("/images/blog/heic-vs-jpeg-cover.png");
    expect(screen.getByRole("region", { name: "Author" })).toBeTruthy();
  });

  it("adds BlogPosting structured data with the current language", () => {
    const { container } = renderBlogArticle();
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).toBeTruthy();
    const structuredData = JSON.parse(script?.textContent ?? "{}");
    const blogPosting = structuredData["@graph"].find(
      (item: { "@type"?: string }) => item["@type"] === "BlogPosting",
    );

    expect(blogPosting.headline).toBe(
      "How to Convert HEIC to PDF on iPhone",
    );
    expect(blogPosting.inLanguage).toBe("en");
    expect(blogPosting.image).toEqual({
      "@type": "ImageObject",
      url: "https://heicpdf.to/images/blog/heic-to-pdf-iphone-og.png",
      width: 1200,
      height: 630,
    });

    const faqPage = structuredData["@graph"].find(
      (item: { "@type"?: string }) => item["@type"] === "FAQPage",
    );
    expect(faqPage).toBeTruthy();
    expect(faqPage.mainEntity).toHaveLength(4);
  });

  it("keeps one page-level main landmark", () => {
    const { container } = renderBlogArticle();

    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector(".blog-article-body")?.tagName).toBe("ARTICLE");
  });

  it("localizes article sidebar links for French", () => {
    renderFrenchBlogArticle();

    expect(
      screen
        .getAllByRole("link", { name: /Fusionner des photos HEIC en un seul PDF/ })
        .some((link) => link.getAttribute("href") === "/fr/blog/combine-heic-to-pdf"),
    ).toBe(true);
  });

  it("generates canonical blog metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(metadata.title).toBe("Convert HEIC to PDF on iPhone");
    expect(metadata.description).toContain("Convert HEIC photos to PDF on iPhone");
    expect(metadata.alternates).toEqual({
      canonical: "https://heicpdf.to/blog/heic-to-pdf-iphone",
      languages: {
        en: "https://heicpdf.to/blog/heic-to-pdf-iphone",
        fr: "https://heicpdf.to/fr/blog/heic-to-pdf-iphone",
        "x-default": "https://heicpdf.to/blog/heic-to-pdf-iphone",
      },
    });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://heicpdf.to/images/blog/heic-to-pdf-iphone-og.png",
        width: 1200,
        height: 630,
        alt: "Convert HEIC to PDF on iPhone",
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      {
        url: "https://heicpdf.to/images/blog/heic-to-pdf-iphone-og.png",
        width: 1200,
        height: 630,
        alt: "Convert HEIC to PDF on iPhone",
      },
    ]);
  });
});
