"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export default function Navbar() {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const cur = html.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-brand">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="2"
            width="24"
            height="24"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 18L12 10L16 18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 15H14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M19 12L22 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M22 12L19 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {t("brand")}
      </div>

      <ul className={`nav-links${menuOpen ? " open" : ""}`}>
        {(t.raw("links") as Array<{ label: string; href: string }>).map((link, i) => (
          <li key={i}>
            <a href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={t("themeToggle")}
        >
          {mounted
            ? document.documentElement.getAttribute("data-theme") === "dark"
              ? "☀️"
              : "🌙"
            : "☀️"}
        </button>
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          ☰
        </button>
      </div>
    </nav>
  );
}
