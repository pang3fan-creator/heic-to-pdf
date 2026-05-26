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

describe("HEIC vs JPEG blog article page", () => {
  it("renders the article shell from localized content", () => {
    renderBlogArticle();

    expect(
      screen.getAllByRole("heading", {
        name: "HEIC vs JPEG: Which Image Format Should You Use in 2026?",
      }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("progressbar", { name: "Reading progress" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Most Read" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Try HEIC to PDF" }).getAttribute("href")).toBe(
      "/",
    );
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
      "HEIC vs JPEG: Which Image Format Should You Use in 2026?",
    );
    expect(blogPosting.inLanguage).toBe("en");
    expect(blogPosting.image).toEqual({
      "@type": "ImageObject",
      url: "https://heicpdf.to/images/blog/heic-vs-jpeg-og.png",
      width: 1200,
      height: 630,
    });
  });

  it("keeps one page-level main landmark", () => {
    const { container } = renderBlogArticle();

    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector(".blog-article-body")?.tagName).toBe("ARTICLE");
  });

  it("generates canonical blog metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(metadata.title).toBe("HEIC vs JPEG: Which Format Should You Use?");
    expect(metadata.description).toContain("HEIC vs JPEG: a practical guide");
    expect(metadata.alternates).toEqual({
      canonical: "https://heicpdf.to/blog/heic-vs-jpeg",
      languages: {
        en: "https://heicpdf.to/blog/heic-vs-jpeg",
        fr: "https://heicpdf.to/fr/blog/heic-vs-jpeg",
        "x-default": "https://heicpdf.to/blog/heic-vs-jpeg",
      },
    });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://heicpdf.to/images/blog/heic-vs-jpeg-og.png",
        width: 1200,
        height: 630,
        alt: "HEIC vs JPEG: Which Format Should You Use?",
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      {
        url: "https://heicpdf.to/images/blog/heic-vs-jpeg-og.png",
        width: 1200,
        height: 630,
        alt: "HEIC vs JPEG: Which Format Should You Use?",
      },
    ]);
  });
});
