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
            <div className="footer-brand">{t("brand")}</div>
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
      </div>
    </footer>
  );
}
