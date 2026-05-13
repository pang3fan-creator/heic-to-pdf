import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
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

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
