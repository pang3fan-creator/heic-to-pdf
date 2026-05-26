"use client";

import { useTranslations } from "next-intl";

type GuidePart = {
  id: string;
  heading: string;
  body: string;
};

export default function GuideSection() {
  const t = useTranslations("guideSection");
  const parts = t.raw("parts") as GuidePart[];

  return (
    <section className="section" id="guide">
      <div className="container">
        <h2 className="section-title">{t("title")}</h2>
        <p className="section-desc">{t("description")}</p>
        <div className="guide-content">
          {parts.map((part) => (
            <div key={part.id} className="guide-block">
              <h3>{part.heading}</h3>
              <div dangerouslySetInnerHTML={{ __html: part.body }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
