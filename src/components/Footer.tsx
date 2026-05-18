import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  const columns = t.raw("columns") as Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>;

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a href="/" className="footer-brand" aria-label="Home">
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
          <span>{t("copyright")}</span>
          <span>{t("tagline")}</span>
        </div>
        <div className="footer-badge">
          <a href="https://dang.ai/" target="_blank" rel="noopener noreferrer">
            <img src="https://cdn.prod.website-files.com/63d8afd87da01fb58ea3fbcb/6487e2868c6c8f93b4828827_dang-badge.png" alt="Dang.ai" width="150" height="54" />
          </a>
        </div>
      </div>
    </footer>
  );
}
