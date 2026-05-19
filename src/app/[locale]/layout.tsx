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
  const layoutT = await getTranslations({ locale, namespace: "layout" });

  return {
    title: {
      template: "%s | HEICPDF.TO",
      default: layoutT("title"),
    },
    description: layoutT("description"),
    icons: [
      { rel: "icon", url: "/heicpdf-logo.svg", type: "image/svg+xml" },
      { rel: "icon", url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    alternates: buildAlternates(locale, ""),
    openGraph: {
      title: layoutT("title"),
      description: layoutT("description"),
      url: "https://heicpdf.to",
      siteName: "HEICPDF.TO",
      locale,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: layoutT("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: layoutT("title"),
      description: layoutT("description"),
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
  const orgT = await getTranslations({ locale, namespace: "org" });

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://heicpdf.to#organization",
    name: "HEICPDF.TO",
    url: "https://heicpdf.to",
    description: orgT("description"),
    logo: {
      "@type": "ImageObject",
      url: "https://heicpdf.to/heicpdf-logo-256.png",
      width: 256,
      height: 256,
    },
  };

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
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
