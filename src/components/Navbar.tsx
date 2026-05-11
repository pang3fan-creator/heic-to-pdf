"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

export default function Navbar() {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored && (stored === "dark" || stored === "light")) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }, [theme]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <a href="/" className="navbar-brand" aria-label="Home">
        <svg
          width="36"
          height="36"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="2"
            width="24"
            height="24"
            rx="7"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8.5 8v12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M8.5 14h6.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M15 8v12"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M15 8C19 8 20.5 9.5 20.5 11C20.5 12.5 19 14 15 14"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span>HEIC<span className="brand-accent">PDF</span><span className="brand-muted">.TO</span></span>
      </a>

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
          data-theme={mounted ? theme : "dark"}
        >
          <span className="theme-toggle-knob">
            {mounted && theme === "light" ? (
              <FiSun size={12} />
            ) : (
              <FiMoon size={12} />
            )}
          </span>
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
