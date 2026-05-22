import type { MetadataRoute } from "next";

const BASE = "https://heicpdf.to";

const pages = [
  { path: "", priority: 1 },
  { path: "/blog", priority: 0.7 },
  { path: "/blog/how-to-convert-heic-to-pdf", priority: 0.8 },
  { path: "/privacy", priority: 0.5 },
  { path: "/terms", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap(({ path, priority }) => {
    const langs = {
      en: `${BASE}${path}`,
      fr: `${BASE}/fr${path}`,
      "x-default": `${BASE}${path}`,
    };
    return [
      {
        url: langs.en,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority,
        alternates: { languages: langs },
      },
      {
        url: langs.fr,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority,
        alternates: { languages: langs },
      },
    ];
  });
}
