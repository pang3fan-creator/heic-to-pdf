import ReadingProgress from "@/components/blog/ReadingProgress";

export type BlogArticleData = {
  eyebrow: string;
  title: string;
  description: string;
  author: {
    name: string;
    role: string;
    initials: string;
    bio: string;
  };
  publishedAtLabel: string;
  sections: Array<{
    id: string;
    heading: string;
    body: string;
  }>;
  sidebar: {
    mostReadHeading: string;
    mostRead: Array<{
      title: string;
      meta: string;
    }>;
    ctaHeading: string;
    ctaText: string;
    ctaLabel: string;
    topicsHeading: string;
    topics: string[];
  };
  relatedHeading: string;
  readingProgressLabel: string;
  sidebarLabel: string;
  authorLabel: string;
  converterHref: string;
  articleHref: string;
  related: Array<{
    eyebrow: string;
    title: string;
    excerpt: string;
    date: string;
  }>;
  backToTop: string;
};

/**
 * Renders the reusable blog article structure adapted from the reference HTML.
 */
export default function BlogArticleShell({
  article,
  breadcrumb,
}: {
  article: BlogArticleData;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="blog-article-page" id="top">
      <ReadingProgress label={article.readingProgressLabel} />

      <header className="blog-article-header">
        <div className="container">
          {breadcrumb}
          <h1>{article.title}</h1>
          <p className="blog-article-deck">{article.description}</p>
          <div className="blog-article-byline">
            <span className="blog-author-avatar">{article.author.initials}</span>
            <span>{article.author.name}</span>
            <span className="blog-byline-separator">·</span>
            <span>{article.author.role}</span>
            <span className="blog-byline-separator">·</span>
            <time dateTime="2026-05-12">{article.publishedAtLabel}</time>
          </div>
        </div>
      </header>

      <div className="blog-article-layout">
        <article className="blog-article-body">
          {article.sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: section.body }} />
            </section>
          ))}
        </article>

        <aside className="blog-sidebar" aria-label={article.sidebarLabel}>
          <section className="blog-sidebar-section">
            <h2 className="blog-sidebar-heading">{article.sidebar.mostReadHeading}</h2>
            {article.sidebar.mostRead.map((item, index) => (
              <a className="blog-most-read-item" href={article.articleHref} key={item.title}>
                <span className="blog-most-read-number">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="blog-most-read-title">{item.title}</span>
                <span className="blog-most-read-meta">{item.meta}</span>
              </a>
            ))}
          </section>

          <section className="blog-sidebar-section">
            <div className="blog-sidebar-cta">
              <h2>{article.sidebar.ctaHeading}</h2>
              <p>{article.sidebar.ctaText}</p>
              <a className="blog-sidebar-cta-button" href={article.converterHref}>
                {article.sidebar.ctaLabel}
              </a>
            </div>
          </section>

          <section className="blog-sidebar-section">
            <h2 className="blog-sidebar-heading">{article.sidebar.topicsHeading}</h2>
            <div className="blog-topic-list">
              {article.sidebar.topics.map((topic) => (
                <span className="blog-topic-pill" key={topic}>
                  {topic}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div style={{ textAlign: "center" }}>
        <a href="#top" className="blog-back-to-top">{article.backToTop}</a>
      </div>

      <section className="blog-author-footer" aria-label={article.authorLabel}>
        <div className="blog-author-footer-avatar">{article.author.initials}</div>
        <div>
          <h2>{article.author.name}</h2>
          <p>{article.author.bio}</p>
        </div>
      </section>

      {article.related.length > 0 && (
        <section className="blog-related-section">
          <h2>{article.relatedHeading}</h2>
          <div className="blog-related-grid">
            {article.related.map((item) => (
              <a className="blog-related-card" href={article.articleHref} key={item.title}>
                <div className="blog-related-image">{item.eyebrow}</div>
                <div className="blog-related-card-body">
                  <p className="blog-related-eyebrow">{item.eyebrow}</p>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <time>{item.date}</time>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
