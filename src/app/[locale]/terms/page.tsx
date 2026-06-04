import { useTranslations, useLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { buildAlternates } from "@/lib/url";

type Section = {
  id: string;
  heading: string;
  body: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale, "/terms"),
  };
}

export default function TermsPage() {
  const locale = useLocale();
  const t = useTranslations("terms");
  const tnav = useTranslations("nav");
  const sections = t.raw("sections") as Section[];
  const breadcrumbItems = [
    { label: tnav("breadcrumbHome"), href: "/" },
    { label: t("pageTitle") },
  ];
  const { canonical } = buildAlternates(locale, "/terms");
  const homeUrl = buildAlternates(locale, "").canonical;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: t("pageTitle"),
        description: t("pageDescription"),
        inLanguage: locale,
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: breadcrumbItems[0].label,
            item: homeUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: breadcrumbItems[1].label,
          },
        ],
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
        <section className="policy-header">
          <div className="container">
            <Breadcrumb items={breadcrumbItems} />
            <h1>{t("pageTitle")}</h1>
            <p className="last-updated">{t("lastUpdated")}</p>
            <hr />
          </div>
        </section>

        <article className="policy-body">
          {sections.map((section, index) => (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: section.body }} />
              {index === sections.length - 1 && (
                <div style={{ textAlign: "center" }}>
                  <a href="#top" className="back-to-top">{t("backToTop")}</a>
                </div>
              )}
            </div>
          ))}
        </article>
      </main>
      <Footer />
    </>
  );
}
