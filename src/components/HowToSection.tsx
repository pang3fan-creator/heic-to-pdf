import { useTranslations } from "next-intl";

export default function HowToSection() {
  const t = useTranslations("howto");
  const steps = t.raw("steps") as Array<{
    num: number;
    title: string;
    desc: string;
  }>;

  return (
    <section className="section" id="howto">
      <div className="container">
        <h2 className="section-title">{t("title")}</h2>
        <p className="section-desc">{t("description")}</p>
        <div className="steps-grid">
          {steps.map((step) => (
            <div key={step.num} className="step-card">
              <div className="step-num">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
