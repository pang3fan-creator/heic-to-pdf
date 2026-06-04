import type { MetadataRoute } from "next";

const BASE = "https://heicpdf.to";

const pages = [
  { path: "", priority: 1, lastMod: new Date() },
  { path: "/blog", priority: 0.7, lastMod: new Date("2026-05-26") },
  { path: "/blog/heic-vs-jpeg", priority: 0.8, lastMod: new Date("2026-05-26") },
  { path: "/blog/combine-heic-to-pdf", priority: 0.8, lastMod: new Date("2026-06-04") },
  { path: "/privacy", priority: 0.5, lastMod: new Date("2026-05-19") },
  { path: "/terms", priority: 0.5, lastMod: new Date("2026-05-19") },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap(({ path, priority, lastMod }) => {
    const langs = {
      en: `${BASE}${path}`,
      fr: `${BASE}/fr${path}`,
      "x-default": `${BASE}${path}`,
    };
    return [
      {
        url: langs.en,
        lastModified: lastMod,
        changeFrequency: "monthly",
        priority,
        alternates: { languages: langs },
      },
      {
        url: langs.fr,
        lastModified: lastMod,
        changeFrequency: "monthly",
        priority,
        alternates: { languages: langs },
      },
    ];
  });
}
