import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogArticleShell, { type BlogArticleData } from "@/components/blog/BlogArticleShell";
import Breadcrumb from "@/components/Breadcrumb";
import { buildAlternates } from "@/lib/url";
import { routing } from "@/i18n/routing";

const BLOG_PATH = "/blog/how-to-convert-heic-to-pdf";
const ARTICLE_URL = `https://heicpdf.to${BLOG_PATH}`;

function getLocalizedPath(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

function getArticleUrl(locale: string) {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `https://heicpdf.to${prefix}${BLOG_PATH}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog.howToConvertHeicToPdf" });
  const articleUrl = getArticleUrl(locale);

  return {
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates(locale, BLOG_PATH),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: articleUrl,
      siteName: "HEICPDF.TO",
      locale,
      type: "article",
      publishedTime: t("publishedAtIso"),
      authors: [t("author.name")],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default function BlogArticlePage() {
  const t = useTranslations("blog.howToConvertHeicToPdf");
  const tnav = useTranslations("nav");
  const locale = t("language");
  const breadcrumbItems = [
    { label: tnav("breadcrumbHome"), href: "/" },
    { label: tnav("breadcrumbBlog") },
    { label: t("title") },
  ];
  const article = {
    ...(t.raw("article") as BlogArticleData),
    converterHref: getLocalizedPath(locale, "/"),
    articleHref: getLocalizedPath(locale, BLOG_PATH),
  };
  const articleUrl = getArticleUrl(locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    headline: t("title"),
    description: t("description"),
    url: articleUrl,
    datePublished: t("publishedAtIso"),
    dateModified: t("modifiedAtIso"),
    author: {
      "@type": "Person",
      name: t("author.name"),
    },
    publisher: {
      "@type": "Organization",
      name: "HEICPDF.TO",
      url: "https://heicpdf.to",
      logo: {
        "@type": "ImageObject",
        url: "https://heicpdf.to/heicpdf-logo-256.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    inLanguage: t("language"),
  };

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main>
        <BlogArticleShell article={article} breadcrumb={<Breadcrumb items={breadcrumbItems} />} />
      </main>
      <Footer />
    </>
  );
}
