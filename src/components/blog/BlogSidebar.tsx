import BlogConvertCta from "@/components/blog/BlogConvertCta";

type MostReadItem = {
  title: string;
  meta: string;
  href: string;
};

type TopicItem =
  | string
  | {
      name: string;
      count: string;
    };

type BlogSidebarProps = {
  variant: "article" | "index";
  ariaLabel: string;
  mostReadHeading: string;
  mostRead: MostReadItem[];
  cta?: {
    heading: string;
    text: string;
    label: string;
    href: string;
  };
  topicsHeading?: string;
  topics?: TopicItem[];
};

export default function BlogSidebar({
  variant,
  ariaLabel,
  mostReadHeading,
  mostRead,
  cta,
  topicsHeading,
  topics = [],
}: BlogSidebarProps) {
  const isIndex = variant === "index";
  const sidebarClass = isIndex ? "blog-index-sidebar" : "blog-sidebar";
  const sectionClass = isIndex ? "blog-index-sidebar-section" : "blog-sidebar-section";
  const headingClass = isIndex ? "blog-index-sidebar-heading" : "blog-sidebar-heading";
  const mostReadClass = isIndex ? "blog-index-most-read" : "blog-most-read-item";
  const numberClass = isIndex ? "blog-index-most-read-number" : "blog-most-read-number";
  const titleClass = isIndex ? "blog-index-most-read-title" : "blog-most-read-title";
  const metaClass = isIndex ? "blog-index-most-read-meta" : "blog-most-read-meta";

  return (
    <aside className={sidebarClass} aria-label={ariaLabel}>
      <section className={sectionClass}>
        <h2 className={headingClass}>{mostReadHeading}</h2>
        {mostRead.map((item, index) => (
          <a className={mostReadClass} href={item.href} key={`${item.href}-${item.title}`}>
            <span className={numberClass}>
              {isIndex ? `#${index + 1}` : (index + 1).toString().padStart(2, "0")}
            </span>
            <span className={titleClass}>{item.title}</span>
            <span className={metaClass}>{item.meta}</span>
          </a>
        ))}
      </section>

      {topicsHeading && topics.length > 0 && (
        <section className={sectionClass}>
          <h2 className={headingClass}>{topicsHeading}</h2>
          {isIndex ? (
            topics.map((topic) => {
              const item = topic as { name: string; count: string };
              return (
                <div className="blog-index-topic" key={item.name}>
                  <span className="blog-index-topic-icon" aria-hidden="true">
                    {item.name.slice(0, 1)}
                  </span>
                  <span>{item.name}</span>
                  <span className="blog-index-topic-count">{item.count}</span>
                </div>
              );
            })
          ) : (
            <div className="blog-topic-list">
              {topics.map((topic) => (
                <span className="blog-topic-pill" key={String(topic)}>
                  {String(topic)}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {cta && (
        <section className={sectionClass}>
          <BlogConvertCta heading={cta.heading} text={cta.text} label={cta.label} href={cta.href} />
        </section>
      )}
    </aside>
  );
}
