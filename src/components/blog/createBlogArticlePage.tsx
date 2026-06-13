import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import BlogArticleShell, { type BlogArticleData } from "@/components/blog/BlogArticleShell";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/url";

const WORDS_PER_MINUTE = 200;
const SITE_URL = "https://heicpdf.to";

type BlogArticlePageConfig = {
  namespace: "blog.heicVsJpeg" | "blog.combineHeicToPdf" | "blog.heicToPdfIphone";
  blogPath: "/blog/heic-vs-jpeg" | "/blog/combine-heic-to-pdf" | "/blog/heic-to-pdf-iphone";
  ogImageUrl: string;
  ogImageWidth: 1200;
  ogImageHeight: 630;
};

function calculateReadingTime(sections: Array<{ body: string }>, format: string): { readingTime: string; wordCount: number } {
  const text = sections
    .map((s) => s.body.replace(/<[^>]*>/g, "").replace(/\s+/g, " "))
    .join(" ");
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { readingTime: format.replace("{minutes}", String(minutes)), wordCount: words };
}

function getLocalizedPath(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

function getArticleUrl(locale: string, blogPath: string) {
  return `${SITE_URL}${getLocalizedPath(locale, blogPath)}`;
}

export function createBlogArticlePage(config: BlogArticlePageConfig) {
  async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: config.namespace });
    const articleUrl = getArticleUrl(locale, config.blogPath);

    const ogImage = {
      url: config.ogImageUrl,
      width: config.ogImageWidth,
      height: config.ogImageHeight,
      alt: t("title"),
    };

    return {
      title: t("title"),
      description: t("description"),
      alternates: buildAlternates(locale, config.blogPath),
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

  function BlogArticlePage() {
    const t = useTranslations(config.namespace);
    const tnav = useTranslations("nav");
    const locale = t("language");
    const breadcrumbItems = [
      { label: tnav("breadcrumbHome"), href: getLocalizedPath(locale, "/") },
      { label: tnav("breadcrumbBlog"), href: getLocalizedPath(locale, "/blog") },
      { label: t("title") },
    ];
    const rawArticle = t.raw("article") as BlogArticleData;
    const converterHref = getLocalizedPath(locale, "/");
    const articleHref = getLocalizedPath(locale, config.blogPath);
    const combineHeicToPdfHref = getLocalizedPath(locale, "/blog/combine-heic-to-pdf");
    const readingTimeFormat = t.raw("readingTimeFormat") as string;
    const { readingTime, wordCount } = calculateReadingTime(rawArticle.sections, readingTimeFormat);
    const article: BlogArticleData = {
      ...rawArticle,
      publishedAtIso: t("publishedAtIso"),
      readingTime,
      converterHref,
      articleHref,
      sidebar: {
        ...rawArticle.sidebar,
        mostRead: rawArticle.sidebar.mostRead.map((item) => ({
          ...item,
          href: getLocalizedPath(locale, item.href),
        })),
      },
      sections: rawArticle.sections.map((s) => ({
        ...s,
        body: s.body
          .replace(/\{converterHref\}/g, converterHref)
          .replace(/\{combineHeicToPdfHref\}/g, combineHeicToPdfHref),
      })),
    };
    const articleUrl = getArticleUrl(locale, config.blogPath);

    const faqSection = rawArticle.sections.find((s) => s.id === "faq");
    const faqItems: Array<{
      "@type": string;
      name: string;
      acceptedAnswer: { "@type": string; text: string };
    }> = [];

    if (faqSection) {
      const faqBody = faqSection.body
        .replace(/\{converterHref\}/g, converterHref)
        .replace(/\{combineHeicToPdfHref\}/g, combineHeicToPdfHref);
      const qaRegex = /<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/g;
      let match;
      while ((match = qaRegex.exec(faqBody)) !== null) {
        faqItems.push({
          "@type": "Question",
          name: match[1].replace(/<[^>]*>/g, "").trim(),
          acceptedAnswer: {
            "@type": "Answer",
            text: match[2].replace(/<[^>]*>/g, "").trim(),
          },
        });
      }
    }

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
            url: config.ogImageUrl,
            width: config.ogImageWidth,
            height: config.ogImageHeight,
          },
          author: {
            "@type": "Person",
            name: t("author.name"),
          },
          publisher: {
            "@type": "Organization",
            name: "HEICPDF.TO",
            url: SITE_URL,
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/heicpdf-logo-256.png`,
              width: 256,
              height: 256,
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": articleUrl,
          },
          inLanguage: t("language"),
          wordCount,
          about: rawArticle.sidebar.topics.map((topic) => ({
            "@type": "Thing",
            name: topic,
          })),
        },
        ...(faqItems.length > 0
          ? [
              {
                "@type": "FAQPage",
                "@id": `${articleUrl}#faq`,
                inLanguage: t("language"),
                mainEntity: faqItems,
              },
            ]
          : []),
        {
          "@type": "BreadcrumbList",
          "@id": `${articleUrl}#breadcrumb`,
          itemListElement: breadcrumbItems.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: item.href ? `${SITE_URL}${item.href}` : undefined,
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

  return {
    generateMetadata,
    BlogArticlePage,
  };
}
