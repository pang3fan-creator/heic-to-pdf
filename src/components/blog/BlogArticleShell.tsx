import ReadingProgress from "@/components/blog/ReadingProgress";
import BlogSidebar from "@/components/blog/BlogSidebar";

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
  publishedAtIso: string;
  readingTime?: string;
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
      href: string;
    }>;
    ctaHeading: string;
    ctaText: string;
    ctaLabel: string;
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
    href?: string;
    image?: {
      src: string;
      alt: string;
      width: number;
      height: number;
    };
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
            <time dateTime={article.publishedAtIso}>{article.publishedAtLabel}</time>
            {article.readingTime && (
              <>
                <span className="blog-byline-separator">·</span>
                <span>{article.readingTime}</span>
              </>
            )}
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

        <BlogSidebar
          variant="article"
          ariaLabel={article.sidebarLabel}
          mostReadHeading={article.sidebar.mostReadHeading}
          mostRead={article.sidebar.mostRead}
          cta={{
            heading: article.sidebar.ctaHeading,
            text: article.sidebar.ctaText,
            label: article.sidebar.ctaLabel,
            href: article.converterHref,
          }}
        />
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

      <section className="blog-related-section">
        <h2>{article.relatedHeading}</h2>
        {article.related.length > 0 && (
          <div className="blog-related-grid">
            {article.related.map((item) => {
              const content = (
                <>
                  <div className="blog-related-image">
                    {item.image ? (
                      <img
                        src={item.image.src}
                        alt={item.image.alt}
                        width={item.image.width}
                        height={item.image.height}
                      />
                    ) : (
                      item.eyebrow
                    )}
                  </div>
                  <div className="blog-related-card-body">
                    <p className="blog-related-eyebrow">{item.eyebrow}</p>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt}</p>
                    <time>{item.date}</time>
                  </div>
                </>
              );
              return item.href ? (
                <a className="blog-related-card" href={item.href} key={item.title}>
                  {content}
                </a>
              ) : (
                <div className="blog-related-card" key={item.title}>
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
