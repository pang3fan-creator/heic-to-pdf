import { useTranslations } from "next-intl";
import FaqItem from "./FaqItem";

export default function FaqSection() {
  const t = useTranslations("faq");
  const items = t.raw("items") as Array<{ q: string; a: string }>;

  return (
    <section className="section" id="faq">
      <div className="container">
        <h2 className="section-title">{t("title")}</h2>
        <p className="section-desc">{t("description")}</p>
        <div className="faq-list">
          {items.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
