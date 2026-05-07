"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

export default function HeroSection({ children }: Props) {
  const t = useTranslations("hero");

  return (
    <section className="hero section" id="converter">
      <div className="container">
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
        {children}
      </div>
    </section>
  );
}
