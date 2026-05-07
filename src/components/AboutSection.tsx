import { useTranslations } from "next-intl";

const checkIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function AboutSection() {
  const t = useTranslations("about");
  const reasons = t.raw("reasons") as string[];
  const table = t.raw("table") as {
    headers: string[];
    rows: string[][];
  };

  return (
    <section className="section" id="about">
      <div className="container">
        <div className="about-grid">
          <div className="about-text">
            <h2>{t("title")}</h2>
            <p>{t("description")}</p>
            <ul>
              {reasons.map((reason, i) => (
                <li key={i}>
                  {checkIcon}
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="compare-table">
            <table>
              <thead>
                <tr>
                  {table.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={ci > 0 && cell === "Best" || cell === "Wide" || cell === "Universal" || cell === "Small" ? "highlight" : undefined}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
