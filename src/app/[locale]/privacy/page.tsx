import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  const t = await getTranslations({ locale, namespace: "privacy" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: buildAlternates(locale, "/privacy"),
  };
}

export default function PrivacyPage() {
  const t = useTranslations("privacy");
  const sections = t.raw("sections") as Section[];

  return (
    <>
      <Navbar />
      <main>
        <section className="policy-header">
          <div className="container">
            <div className="eyebrow">Legal</div>
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
                  <a href="#top" className="back-to-top">↑ Back to top</a>
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
