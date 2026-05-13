import { useTranslations } from "next-intl";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <>
      <Navbar />
      <main>
        <section className="not-found-section">
          <div className="container">
            <div className="not-found-content">
              <p className="not-found-label">{t("label")}</p>
              <h1>{t("title")}</h1>
              <p className="not-found-description">{t("description")}</p>
              <div className="not-found-actions">
                <a className="not-found-primary" href="/">
                  {t("converterLabel")}
                </a>
                <a className="not-found-secondary" href="mailto:support@heicpdf.to">
                  {t("supportLabel")}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
