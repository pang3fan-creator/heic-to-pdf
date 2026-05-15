import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://heicpdf.to",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: {
        languages: {
          en: "https://heicpdf.to",
          "x-default": "https://heicpdf.to",
        },
      },
    },
    {
      url: "https://heicpdf.to/privacy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: {
          en: "https://heicpdf.to/privacy",
          "x-default": "https://heicpdf.to/privacy",
        },
      },
    },
    {
      url: "https://heicpdf.to/terms",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: {
          en: "https://heicpdf.to/terms",
          "x-default": "https://heicpdf.to/terms",
        },
      },
    },
    {
      url: "https://heicpdf.to/blog/how-to-convert-heic-to-pdf",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          en: "https://heicpdf.to/blog/how-to-convert-heic-to-pdf",
          "x-default": "https://heicpdf.to/blog/how-to-convert-heic-to-pdf",
        },
      },
    },
  ];
}
