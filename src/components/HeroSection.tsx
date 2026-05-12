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
        <h1 style={{ marginBottom: "100px" }}>{t("title")}</h1>
        {children}
        <div className="privacy-note" style={{ marginTop: "40px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {t("dropzone.privacy")}
        </div>
      </div>
    </section>
  );
}
