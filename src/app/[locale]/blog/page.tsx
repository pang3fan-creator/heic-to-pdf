import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogIndexShell, { type BlogIndexData, type BlogIndexPost } from "@/components/blog/BlogIndexShell";
import Breadcrumb from "@/components/Breadcrumb";
import { buildAlternates } from "@/lib/url";
import { routing } from "@/i18n/routing";

const BLOG_PATH = "/blog";
const BASE_URL = "https://heicpdf.to";
const ALL_TOPIC_SLUG = "all";

function getLocalizedPath(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path === "/" ? "" : path}`;
}

function getBlogUrl(locale: string) {
  return `${BASE_URL}${getLocalizedPath(locale, BLOG_PATH)}`;
}

function getTopicParam(searchParams?: { topic?: string | string[] }) {
  const topic = searchParams?.topic;
  return Array.isArray(topic) ? topic[0] : topic;
}

function getTopicHref(locale: string, slug: string) {
  const blogPath = getLocalizedPath(locale, BLOG_PATH);
  return slug === ALL_TOPIC_SLUG ? blogPath : `${blogPath}?topic=${encodeURIComponent(slug)}`;
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

export default function BlogIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{ topic?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const t = useTranslations("blog.index");
  const tnav = useTranslations("nav");
  const locale = t("language");
  const breadcrumbItems = [
    { label: tnav("breadcrumbHome"), href: getLocalizedPath(locale, "/") },
    { label: tnav("breadcrumbBlog") },
  ];
  const posts = (t.raw("posts") as BlogIndexPost[]).map((post) => ({
    ...post,
    href: getLocalizedPath(locale, post.href),
  }));
  const categories = (t.raw("categories") as Array<{ label: string; slug: string }>).map(
    (category) => ({
      ...category,
      href: getTopicHref(locale, category.slug),
      active: false,
    }),
  );
  const requestedTopic = getTopicParam(resolvedSearchParams);
  const validTopic = categories.some((category) => category.slug === requestedTopic)
    ? requestedTopic
    : undefined;
  const activeTopic = validTopic ?? ALL_TOPIC_SLUG;
  const filteredPosts =
    activeTopic === ALL_TOPIC_SLUG
      ? posts
      : posts.filter((post) => post.categorySlugs.includes(activeTopic));
  const sidebar = t.raw("sidebar") as BlogIndexData["sidebar"];
  const data: BlogIndexData = {

    title: t("heading"),
    description: t("description"),
    categoryLabel: t("categoryLabel"),
    sidebarLabel: t("sidebarLabel"),
    categories: categories.map((category) => ({
      ...category,
      active: category.slug === activeTopic,
    })),
    posts: filteredPosts,
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
        name: t("heading"),
        description: t("description"),
        url: blogUrl,
        inLanguage: locale,
      },
      {
        "@type": "CollectionPage",
        "@id": `${blogUrl}#collection`,
        name: t("heading"),
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
          author: {
            "@type": "Person",
            name: t("authorName"),
          },
          image: {
            "@type": "ImageObject",
            url: post.image ? `${BASE_URL}${post.image.src}` : "https://heicpdf.to/og-image.png",
            width: post.image?.width ?? 1200,
            height: post.image?.height ?? 630,
          },
          inLanguage: locale,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${blogUrl}#breadcrumb`,
        itemListElement: breadcrumbItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          item: item.href ? `${BASE_URL}${item.href}` : undefined,
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
        <BlogIndexShell data={data} breadcrumb={<Breadcrumb items={breadcrumbItems} />} />
      </main>
      <Footer />
    </>
  );
}
