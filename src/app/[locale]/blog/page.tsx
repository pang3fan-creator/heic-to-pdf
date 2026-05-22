import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogIndexShell, { type BlogIndexData, type BlogIndexPost } from "@/components/blog/BlogIndexShell";
import { buildAlternates } from "@/lib/url";
import { routing } from "@/i18n/routing";

const BLOG_PATH = "/blog";
const BASE_URL = "https://heicpdf.to";

function getLocalizedPath(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

function getBlogUrl(locale: string) {
  return `${BASE_URL}${getLocalizedPath(locale, BLOG_PATH)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog.index" });
  const blogUrl = getBlogUrl(locale);

  return {
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates(locale, BLOG_PATH),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: blogUrl,
      siteName: "HEICPDF.TO",
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default function BlogIndexPage() {
  const t = useTranslations("blog.index");
  const locale = t("language");
  const posts = (t.raw("posts") as BlogIndexPost[]).map((post) => ({
    ...post,
    href: getLocalizedPath(locale, post.href),
  }));
  const sidebar = t.raw("sidebar") as BlogIndexData["sidebar"];
  const data: BlogIndexData = {
    eyebrow: t("eyebrow"),
    title: t("title"),
    description: t("description"),
    categoryLabel: t("categoryLabel"),
    sidebarLabel: t("sidebarLabel"),
    categories: t.raw("categories") as string[],
    posts,
    sidebar: {
      ...sidebar,
      mostRead: sidebar.mostRead.map((item) => ({
        ...item,
        href: getLocalizedPath(locale, item.href),
      })),
    },
    converterHref: getLocalizedPath(locale, "/"),
  };
  const blogUrl = getBlogUrl(locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${blogUrl}#blog`,
        name: t("title"),
        description: t("description"),
        url: blogUrl,
        inLanguage: locale,
      },
      {
        "@type": "CollectionPage",
        "@id": `${blogUrl}#collection`,
        name: t("title"),
        description: t("description"),
        url: blogUrl,
        inLanguage: locale,
        isPartOf: {
          "@id": `${blogUrl}#blog`,
        },
        hasPart: posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          url: `${BASE_URL}${post.href}`,
          datePublished: post.publishedAtIso,
          inLanguage: locale,
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
        <BlogIndexShell data={data} />
      </main>
      <Footer />
    </>
  );
}
