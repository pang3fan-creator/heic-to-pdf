import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogArticleShell, { type BlogArticleData } from "@/components/blog/BlogArticleShell";
import Breadcrumb from "@/components/Breadcrumb";
import { buildAlternates } from "@/lib/url";
import { routing } from "@/i18n/routing";

const BLOG_PATH = "/blog/heic-vs-jpeg";
const ARTICLE_URL = `https://heicpdf.to${BLOG_PATH}`;
const OG_IMAGE_URL = "https://heicpdf.to/images/blog/heic-vs-jpeg-og.png";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const WORDS_PER_MINUTE = 200;

function calculateReadingTime(sections: Array<{ body: string }>): string {
  const text = sections
    .map((s) => s.body.replace(/<[^>]*>/g, "").replace(/\s+/g, " "))
    .join(" ");
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

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
  const t = await getTranslations({ locale, namespace: "blog.heicVsJpeg" });
  const articleUrl = getArticleUrl(locale);

  const ogImage = {
    url: OG_IMAGE_URL,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: t("title"),
  };

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
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [ogImage],
    },
  };
}

export default function BlogArticlePage() {
  const t = useTranslations("blog.heicVsJpeg");
  const tnav = useTranslations("nav");
  const locale = t("language");
  const breadcrumbItems = [
    { label: tnav("breadcrumbHome"), href: getLocalizedPath(locale, "/") },
    { label: tnav("breadcrumbBlog"), href: getLocalizedPath(locale, "/blog") },
    { label: t("title") },
  ];
  const rawArticle = t.raw("article") as BlogArticleData;
  const converterHref = getLocalizedPath(locale, "/");
  const articleHref = getLocalizedPath(locale, BLOG_PATH);
  const readingTime = calculateReadingTime(rawArticle.sections);
  const article = {
    ...rawArticle,
    publishedAtIso: t("publishedAtIso"),
    readingTime,
    converterHref,
    articleHref,
    sections: rawArticle.sections.map((s) => ({
      ...s,
      body: s.body.replace(/\{converterHref\}/g, converterHref),
    })),
  };
  const articleUrl = getArticleUrl(locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${articleUrl}#article`,
        headline: rawArticle.title,
        description: t("description"),
        url: articleUrl,
        datePublished: t("publishedAtIso"),
        dateModified: t("modifiedAtIso"),
        image: {
          "@type": "ImageObject",
          url: OG_IMAGE_URL,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
        },
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
            width: 256,
            height: 256,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
        },
        inLanguage: t("language"),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${articleUrl}#breadcrumb`,
        itemListElement: breadcrumbItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          item: item.href ? `https://heicpdf.to${item.href}` : undefined,
        })),
      },
    ],
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
