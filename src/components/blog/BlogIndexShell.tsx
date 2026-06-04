import BlogSidebar from "@/components/blog/BlogSidebar";

export type BlogIndexPost = {
  eyebrow: string;
  title: string;
  excerpt: string;
  date: string;
  publishedAtIso: string;
  readTime: string;
  href: string;
  categorySlugs: string[];
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
  categories: Array<{
    label: string;
    slug: string;
    href: string;
    active: boolean;
  }>;
  posts: BlogIndexPost[];
  sidebar: {
    mostReadHeading: string;
    ctaHeading: string;
    ctaText: string;
    ctaLabel: string;
    mostRead: Array<{
      title: string;
      meta: string;
      href: string;
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
        {data.categories.map((category) => (
          <a
            className={`blog-index-category${category.active ? " active" : ""}`}
            aria-current={category.active ? "true" : undefined}
            href={category.href}
            key={category.slug}
          >
            {category.label}
          </a>
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

        <BlogSidebar
          variant="index"
          ariaLabel={data.sidebarLabel}
          mostReadHeading={data.sidebar.mostReadHeading}
          mostRead={data.sidebar.mostRead}
          cta={{
            heading: data.sidebar.ctaHeading,
            text: data.sidebar.ctaText,
            label: data.sidebar.ctaLabel,
            href: data.converterHref,
          }}
        />
      </div>
    </div>
  );
}
