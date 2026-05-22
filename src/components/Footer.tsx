import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer() {
  const t = useTranslations("footer");
  const tnav = useTranslations("nav");
  const columns = t.raw("columns") as Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>;

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a href="/" className="footer-brand" aria-label={tnav("ariaHome")}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="24" height="24" rx="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8.5 8v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M8.5 14h6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M15 8v12" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M15 8C19 8 20.5 9.5 20.5 11C20.5 12.5 19 14 15 14" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              </svg>
              <span>HEIC<span className="brand-accent">PDF</span><span className="brand-muted">.TO</span></span>
            </a>
            <p className="footer-desc">{t("description")}</p>
          </div>
          {columns.map((col, i) => (
            <div key={i} className="footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span>{t("copyright")}</span>
            <LanguageSwitcher />
          </div>
          <span>{t("tagline")}</span>
        </div>
        <div className="footer-badges">
          <a href="https://dang.ai/" target="_blank" rel="noopener noreferrer nofollow" className="footer-badge">
            <img src="https://cdn.prod.website-files.com/63d8afd87da01fb58ea3fbcb/6487e2868c6c8f93b4828827_dang-badge.png" alt="Dang.ai" width="150" height="54" />
          </a>
          <a href="https://submitaitools.org" target="_blank" rel="noopener noreferrer nofollow" className="footer-badge">
            <img src="https://submitaitools.org/static_submitaitools/images/submitaitools.png" alt="Submit AI Tools" style={{ borderRadius: 10, width: 200, height: 60 }} />
          </a>
          <a href="https://aiagentsdirectory.com/agent/heicpdfto?utm_source=badge&utm_medium=referral&utm_campaign=free_listing&utm_content=heicpdfto" target="_blank" rel="noopener noreferrer nofollow" className="footer-badge">
            <img src="https://aiagentsdirectory.com/featured-badge.svg?v=2024" alt="HEICPDF.TO - Featured AI Agent on AI Agents Directory" width="200" height="50" />
          </a>
          <a href="https://sellwithboost.com" target="_blank" rel="noopener noreferrer nofollow" className="footer-badge">
            <img src="https://sellwithboost.com/badge/listing.svg" alt="Listed on Sell With Boost" style={{ height: 40, width: 'auto' }} />
          </a>
        </div>
      </div>
    </footer>
  );
}
