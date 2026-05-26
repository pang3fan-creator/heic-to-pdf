export type BlogIndexPost = {
  eyebrow: string;
  title: string;
  excerpt: string;
  date: string;
  publishedAtIso: string;
  readTime: string;
  href: string;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export type BlogIndexData = {
  title: string;
  description: string;
  categoryLabel: string;
  sidebarLabel: string;
  categories: string[];
  posts: BlogIndexPost[];
  sidebar: {
    mostReadHeading: string;
    topicsHeading: string;
    ctaHeading: string;
    ctaText: string;
    ctaLabel: string;
    mostRead: Array<{
      title: string;
      meta: string;
      href: string;
    }>;
    topics: Array<{
      name: string;
      count: string;
    }>;
  };
  converterHref: string;
};

function BlogCardArt({ label }: { label: string }) {
  return (
    <div className="blog-index-art" aria-hidden="true">
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
        <rect x="12" y="15" width="44" height="38" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="27" cy="30" r="4" fill="currentColor" opacity="0.45" />
        <path
          d="M22 44l7-8 6 6 5-10 8 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function BlogPostImage({ post }: { post: BlogIndexPost }) {
  if (!post.image) {
    return <BlogCardArt label={post.eyebrow} />;
  }

  return (
    <div className="blog-index-art blog-index-art-cover">
      <img
        src={post.image.src}
        alt={post.image.alt}
        width={post.image.width}
        height={post.image.height}
      />
    </div>
  );
}

/**
 * Renders the localized blog index layout adapted from the reference HTML template.
 */
export default function BlogIndexShell({
  data,
  breadcrumb,
}: {
  data: BlogIndexData;
  breadcrumb?: React.ReactNode;
}) {
  const [featuredPost, ...secondaryPosts] = data.posts;
  const cardPosts = secondaryPosts;

  return (
    <div className="blog-index-page">
      <section className="blog-index-hero">
        <div className="container">
          {breadcrumb}

          <h1>{data.title}</h1>
          <p className="blog-index-deck">{data.description}</p>
          <hr />
        </div>
      </section>

      <nav className="blog-index-category-bar" aria-label={data.categoryLabel}>
        {data.categories.map((category, index) => (
          <span
            className={`blog-index-category${index === 0 ? " active" : ""}`}
            aria-current={index === 0 ? "true" : undefined}
            key={category}
          >
            {category}
          </span>
        ))}
      </nav>

      <div className="blog-index-layout">
        <div className="blog-index-main">
          {featuredPost && (
            <a className="blog-index-featured" href={featuredPost.href}>
              <BlogPostImage post={featuredPost} />
              <div className="blog-index-featured-body">
                <p className="blog-index-post-tag">{featuredPost.eyebrow}</p>
                <h2>{featuredPost.title}</h2>
                <p>{featuredPost.excerpt}</p>
                <div className="blog-index-meta">
                  <time>{featuredPost.date}</time>
                  <span aria-hidden="true">·</span>
                  <span>{featuredPost.readTime}</span>
                </div>
              </div>
            </a>
          )}

          {cardPosts.length > 0 && (
            <div className="blog-index-grid">
              {cardPosts.map((post) => (
                <a className="blog-index-card" href={post.href} key={`${post.href}-${post.title}`}>
                  <BlogPostImage post={post} />
                  <div className="blog-index-card-body">
                    <p className="blog-index-post-tag">{post.eyebrow}</p>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <div className="blog-index-meta">
                      <time>{post.date}</time>
                      <span aria-hidden="true">·</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <aside className="blog-index-sidebar" aria-label={data.sidebarLabel}>
          <section className="blog-index-sidebar-section">
            <h2 className="blog-index-sidebar-heading">{data.sidebar.mostReadHeading}</h2>
            {data.sidebar.mostRead.map((item, index) => (
              <a className="blog-index-most-read" href={item.href} key={item.title}>
                <span className="blog-index-most-read-number">#{index + 1}</span>
                <span className="blog-index-most-read-title">{item.title}</span>
                <span className="blog-index-most-read-meta">{item.meta}</span>
              </a>
            ))}
          </section>

          <section className="blog-index-sidebar-section">
            <h2 className="blog-index-sidebar-heading">{data.sidebar.topicsHeading}</h2>
            {data.sidebar.topics.map((topic) => (
              <div className="blog-index-topic" key={topic.name}>
                <span className="blog-index-topic-icon" aria-hidden="true">
                  {topic.name.slice(0, 1)}
                </span>
                <span>{topic.name}</span>
                <span className="blog-index-topic-count">{topic.count}</span>
              </div>
            ))}
          </section>

          <section className="blog-index-cta">
            <h2>{data.sidebar.ctaHeading}</h2>
            <p>{data.sidebar.ctaText}</p>
            <a href={data.converterHref}>{data.sidebar.ctaLabel}</a>
          </section>
        </aside>
      </div>
    </div>
  );
}
