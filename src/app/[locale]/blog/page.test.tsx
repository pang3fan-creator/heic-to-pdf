import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { createElement, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/en.json";
import frMessages from "../../../../messages/fr.json";
import BlogIndexPage, { generateMetadata } from "./page";

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

function renderBlogIndex() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BlogIndexPage />
    </NextIntlClientProvider>,
  );
}

function createResolvedSearchParams(topic: string) {
  const searchParams = Promise.resolve({ topic }) as Promise<{ topic: string }> & {
    status: "fulfilled";
    value: { topic: string };
  };
  searchParams.status = "fulfilled";
  searchParams.value = { topic };
  return searchParams;
}

function renderFilteredBlogIndex(topic: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Suspense fallback={null}>
        <BlogIndexPage searchParams={createResolvedSearchParams(topic)} />
      </Suspense>
    </NextIntlClientProvider>,
  );
}

function renderFrenchBlogIndex() {
  return render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      <BlogIndexPage />
    </NextIntlClientProvider>,
  );
}

describe("Blog index page", () => {
  it("renders the localized blog index shell", () => {
    const { container } = renderBlogIndex();

    expect(screen.getByRole("heading", { name: "Image Format Guides & Insights" })).toBeTruthy();

    expect(screen.getAllByRole("link", { name: /HEIC vs JPEG/i })[0].getAttribute("href")).toBe(
      "/blog/heic-vs-jpeg",
    );
    expect(screen.getByRole("heading", { name: "Most Read" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Topics" })).toBeNull();
    expect(screen.getByRole("link", { name: "Try HEIC to PDF" }).getAttribute("href")).toBe(
      "/",
    );
    expect(container.querySelector(".blog-convert-cta")).toBeTruthy();
  });

  it("renders topic filters as localized links", () => {
    renderBlogIndex();

    const topicNav = screen.getByRole("navigation", { name: "Blog topics" });
    expect(topicNav).toBeTruthy();
    expect(screen.getByRole("link", { name: "All" }).getAttribute("href")).toBe("/blog");
    expect(screen.getByRole("link", { name: "PDF" }).getAttribute("href")).toBe(
      "/blog?topic=pdf",
    );
  });

  it("renders French topic filter links with the locale prefix", () => {
    renderFrenchBlogIndex();

    expect(screen.getByRole("link", { name: "Tous" }).getAttribute("href")).toBe("/fr/blog");
    expect(screen.getByRole("link", { name: "PDF" }).getAttribute("href")).toBe(
      "/fr/blog?topic=pdf",
    );
  });

  it("filters posts by a valid topic", () => {
    const { container } = renderFilteredBlogIndex("pdf");
    const postList = within(container.querySelector(".blog-index-main") as HTMLElement);

    expect(
      postList.getByRole("link", { name: /Combine Multiple HEIC Photos Into One PDF/ }),
    ).toBeTruthy();
    expect(postList.queryByRole("link", { name: /HEIC vs JPEG/i })).toBeNull();
  });

  it("falls back to all posts for an unknown topic", () => {
    const { container } = renderFilteredBlogIndex("unknown-topic");
    const postList = within(container.querySelector(".blog-index-main") as HTMLElement);

    expect(postList.getByRole("link", { name: /HEIC vs JPEG/i })).toBeTruthy();
    expect(
      postList.getByRole("link", { name: /Combine Multiple HEIC Photos Into One PDF/ }),
    ).toBeTruthy();
  });

  it("renders breadcrumb with Home link and current Blog page", () => {
    renderBlogIndex();

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb).toBeTruthy();
    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink.getAttribute("href")).toBe("/");
    expect(screen.getByText("Blog")).toBeTruthy();
  });

  it("keeps the index structure accessible", () => {
    const { container } = renderBlogIndex();

    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector(".blog-index-featured")).toBeTruthy();
    expect(container.querySelector(".blog-index-main")).toBeTruthy();
    expect(container.querySelector(".blog-index-sidebar")).toBeTruthy();
  });

  it("renders the HEIC vs JPEG cover image on the featured post", () => {
    renderBlogIndex();

    const image = screen.getByRole("img", {
      name: "HEIC vs JPEG image format comparison cover",
    });

    expect(image.getAttribute("src")).toBe("/images/blog/heic-vs-jpeg-cover.png");
    expect(image.getAttribute("width")).toBe("1200");
    expect(image.getAttribute("height")).toBe("675");
  });

  it("renders the Combine HEIC to PDF cover image on its post card", () => {
    renderBlogIndex();

    const image = screen.getByRole("img", {
      name: "Merge multiple HEIC photos into one PDF cover",
    });

    expect(image.getAttribute("src")).toBe("/images/blog/combine-heic-to-pdf-cover.png");
    expect(image.getAttribute("width")).toBe("1200");
    expect(image.getAttribute("height")).toBe("675");
  });

  it("adds CollectionPage structured data with the current language", () => {
    const { container } = renderBlogIndex();
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).toBeTruthy();
    const structuredData = JSON.parse(script?.textContent ?? "{}");
    const collectionPage = structuredData["@graph"].find(
      (item: { "@type"?: string }) => item["@type"] === "CollectionPage",
    );

    expect(collectionPage.name).toBe("Image Format Guides & Insights");
    expect(collectionPage.inLanguage).toBe("en");
    expect(collectionPage.hasPart).toHaveLength(3);
    expect(collectionPage.hasPart[0].image.url).toBe(
      "https://heicpdf.to/images/blog/heic-to-pdf-iphone-cover.png",
    );
    expect(collectionPage.hasPart[1].image.url).toBe(
      "https://heicpdf.to/images/blog/heic-vs-jpeg-cover.png",
    );
    expect(collectionPage.hasPart[2].image.url).toBe(
      "https://heicpdf.to/images/blog/combine-heic-to-pdf-cover.png",
    );

    const breadcrumbList = structuredData["@graph"].find(
      (item: { "@type"?: string }) => item["@type"] === "BreadcrumbList",
    );
    expect(breadcrumbList).toBeTruthy();
    expect(breadcrumbList.itemListElement).toHaveLength(2);
    expect(breadcrumbList.itemListElement[0].name).toBe("Home");
    expect(breadcrumbList.itemListElement[1].name).toBe("Blog");
  });

  it("generates canonical blog index metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(metadata.title).toBe("Image Format Guides & HEIC Tips for Mac & iOS");
    expect(metadata.description).toContain("Tips, benchmarks, and deep dives");
    expect(metadata.alternates).toEqual({
      canonical: "https://heicpdf.to/blog",
      languages: {
        en: "https://heicpdf.to/blog",
        fr: "https://heicpdf.to/fr/blog",
        "x-default": "https://heicpdf.to/blog",
      },
    });
  });
});
