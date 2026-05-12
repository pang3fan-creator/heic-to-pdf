import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/url";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const ogImageUrl = "https://heicpdf.to/og-image.png";

  return {
    title: {
      template: "%s | HEICPDF.TO",
      default: "HEIC to PDF — Fast, Private & Free Online Tool | HEICPDF.TO",
    },
    description:
      "Easily convert your Apple HEIC photos to high-quality PDF documents. No registration required. Supports batch, Dropbox & Google Drive. 100% privacy guaranteed.",
    icons: "/heicpdf-logo.svg",
    alternates: buildAlternates(locale, ""),
    openGraph: {
      title: "HEIC to PDF — Fast, Private & Free Online Tool | HEICPDF.TO",
      description:
        "Easily convert your Apple HEIC photos to high-quality PDF documents. No registration required. Supports batch, Dropbox & Google Drive. 100% privacy guaranteed.",
      url: "https://heicpdf.to",
      siteName: "HEICPDF.TO",
      locale,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "HEICPDF.TO — Convert HEIC to PDF Free Online",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "HEIC to PDF — Fast, Private & Free Online Tool | HEICPDF.TO",
      description:
        "Easily convert your Apple HEIC photos to high-quality PDF documents. No registration required. Supports batch, Dropbox & Google Drive. 100% privacy guaranteed.",
      images: [ogImageUrl],
    },
  };
}

const themeScript = `
(function() {
  var theme = localStorage.getItem('theme');
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
})();
`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const faqT = await getTranslations({ locale, namespace: "faq" });
  const howtoT = await getTranslations({ locale, namespace: "howto" });
  const faqItems = faqT.raw("items") as Array<{ q: string; a: string }>;
  const howtoSteps = howtoT.raw("steps") as Array<{ num: number; title: string; desc: string }>;
  const schemaDescription =
    "Easily convert your Apple HEIC photos to high-quality PDF documents. No registration required. Supports batch, Dropbox & Google Drive. 100% privacy guaranteed.";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://heicpdf.to",
        name: "HEICPDF.TO - HEIC to PDF Converter",
        url: "https://heicpdf.to",
        description: schemaDescription,
        operatingSystem: "All",
        applicationCategory: ["Multimedia", "Utilities"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Convert HEIC to PDF",
          "Batch conversion up to 20 images",
          "Dropbox & Google Drive support",
          "Page arrangement and customization",
          "100% browser-based processing",
        ],
        inLanguage: locale,
      },
      {
        "@type": "HowTo",
        name: howtoT("title"),
        description: howtoT("description"),
        step: howtoSteps.map((step) => ({
          "@type": "HowToStep",
          position: step.num,
          name: step.title,
          text: step.desc,
        })),
        inLanguage: locale,
      },
      {
        "@type": "FAQPage",
        "@id": "https://heicpdf.to/#faq",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
        inLanguage: locale,
      },
    ],
  };

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
