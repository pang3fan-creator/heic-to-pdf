"use client";

import { useTranslations } from "next-intl";
import DropZone from "./DropZone";

export default function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="hero section" id="converter">
      <div className="container">
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
        <DropZone />
      </div>
    </section>
  );
}
