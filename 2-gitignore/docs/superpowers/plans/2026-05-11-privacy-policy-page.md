# Privacy Policy Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a locale-aware Privacy Policy page at `/privacy` using translation file content.

**Architecture:** New Next.js page under `[locale]` route group, content from `messages/en.json` via `t.raw()`, reuses existing Navbar/Footer components.

**Tech Stack:** Next.js App Router, next-intl, CSS custom properties

---

### Task 1: Add privacy policy content to messages/en.json

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add privacy namespace**

Add the entire `privacy` section to `messages/en.json`. Structure:

```json
"privacy": {
  "pageTitle": "Privacy Policy",
  "pageDescription": "Privacy policy for HEIC→PDF. Learn how we protect your data — all file processing happens in your browser, nothing is uploaded to our servers.",
  "lastUpdated": "Last updated: May 11, 2026",
  "sections": [
    {
      "id": "introduction",
      "heading": "1. Introduction",
      "body": "<p>HEIC→PDF (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website at <strong>heictopdf.app</strong> (the &ldquo;Service&rdquo;). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p><p>We take your privacy seriously. This tool is designed around a core principle: <strong>your files never leave your device</strong>. All HEIC-to-PDF conversion is performed entirely in your browser using WebAssembly — no images are uploaded to any server, and we have no ability to access, store, or share your files.</p><p>We use your data only to operate and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.</p><div class=\"emph-box\"><strong>In plain language:</strong> We process files in your browser, not on our servers. We don&rsquo;t see your photos, we don&rsquo;t store them, and we don&rsquo;t share them.</div>"
    },
    ... (continue for all 12 sections)
  ]
}
```

Include all 12 sections from the HTML design file at `0-Develop_Doc/UI-UX/privacy-policy.html`. Each section gets:
- `id` — anchor ID for navigation
- `heading` — section title
- `body` — full HTML content including `<p>`, `<ul>`, `<table>`, `<div class="emph-box">` tags

- [ ] **Step 2: Update footer privacy link**

Change the footer `Support > Privacy policy` link from `"#"` to `"/privacy"`:

```json
{ "label": "Privacy policy", "href": "/privacy" }
```

- [ ] **Step 3: Verify**

Run `npm test` to confirm translations don't break existing tests.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json
git commit -m "feat: add privacy policy translation content and update footer link"
```

---

### Task 2: Create privacy page component

**Files:**
- Create: `src/app/[locale]/privacy/page.tsx`

- [ ] **Step 1: Create page component**

```tsx
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Section = {
  id: string;
  heading: string;
  body: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  return {
    title: `${t("pageTitle")} — HEIC to PDF`,
    description: t("pageDescription"),
    alternates: {
      canonical: `/${locale}/privacy`,
    },
  };
}

export default function PrivacyPage() {
  const t = useTranslations("privacy");
  const sections = t.raw("sections") as Section[];

  return (
    <>
      <Navbar />
      <main>
        {/* Header */}
        <section className="policy-header">
          <div className="container">
            <div className="eyebrow">Legal</div>
            <h1>{t("pageTitle")}</h1>
            <p className="last-updated">{t("lastUpdated")}</p>
            <hr />
          </div>
        </section>

        {/* Body */}
        <article className="policy-body">
          {sections.map((section) => (
            <div key={section.id}>
              <h2 id={section.id}>{section.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: section.body }} />
              <a href="#top" className="back-to-top">↑ Back to top</a>
            </div>
          ))}
        </article>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Add metadata for page template reference**

Also add the privacy route to the `generateStaticParams` pattern — but since it's under `[locale]`, it's already handled.

- [ ] **Step 3: Verify**

Check the directory structure is correct:
```
src/app/[locale]/privacy/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/privacy/page.tsx
git commit -m "feat: create privacy policy page with translation-driven content"
```

---

### Task 3: Add privacy page CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add privacy page styles to globals.css**

Add the following CSS before the responsive section (before `@media` breakpoints):

```css
/* ========== Privacy Policy ========== */
.policy-header {
  padding: 120px 0 0;
  text-align: center;
}
.policy-header .eyebrow {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--accent);
  margin-bottom: 16px;
}
.policy-header h1 {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 600;
  letter-spacing: -.025em;
  line-height: 1.15;
  margin-bottom: 12px;
}
.policy-header .last-updated {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 48px;
}
.policy-header hr {
  max-width: 720px;
  margin: 0 auto;
  border: none;
  height: 1px;
  background: var(--border);
}
.policy-body {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 24px 80px;
}
.policy-body h2 {
  font-family: var(--font-display);
  font-size: clamp(22px, 2.5vw, 28px);
  font-weight: 600;
  letter-spacing: -.015em;
  line-height: 1.3;
  margin-top: 48px;
  margin-bottom: 14px;
  padding-top: 48px;
  scroll-margin-top: 100px;
}
.policy-body h2:first-of-type {
  margin-top: 0;
  padding-top: 0;
}
.policy-body h3 {
  font-size: 17px;
  font-weight: 550;
  letter-spacing: -.005em;
  color: var(--fg);
  margin-top: 28px;
  margin-bottom: 10px;
}
.policy-body p {
  font-size: 16px;
  line-height: 1.7;
  color: var(--fg);
  margin-bottom: 16px;
  max-width: 65ch;
}
.policy-body ul,
.policy-body ol {
  margin: 0 0 20px;
  padding-left: 24px;
  font-size: 16px;
  line-height: 1.7;
}
.policy-body li {
  margin-bottom: 8px;
  color: var(--fg);
}
.policy-body li::marker {
  color: var(--accent);
}
.policy-body strong {
  font-weight: 550;
  color: var(--fg);
}
.policy-body .emph-box {
  border-inline-start: 3px solid var(--accent);
  padding: 16px 0 16px 24px;
  margin: 24px 0 28px;
  font-size: 17px;
  line-height: 1.6;
  color: var(--fg);
  background: var(--accent-soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.policy-body .data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0 28px;
  font-size: 14px;
}
.policy-body .data-table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--muted);
  border-bottom: 2px solid var(--border);
}
.policy-body .data-table td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  line-height: 1.5;
}
.policy-body .data-table tr:last-child td {
  border-bottom: none;
}
.policy-body .data-table td:first-child {
  font-weight: 500;
  white-space: nowrap;
}
.policy-body .back-to-top {
  display: inline-block;
  margin-top: 32px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  transition: color 0.2s;
}
.policy-body .back-to-top:hover {
  color: var(--accent);
}
```

And add responsive overrides at the existing mobile breakpoints:

At `@media (max-width: 640px)`:
```css
.policy-header {
  padding-top: 110px;
}
.policy-body {
  padding: 40px 20px 64px;
}
.policy-body h2 {
  margin-top: 36px;
  padding-top: 36px;
}
.policy-body .emph-box {
  padding: 14px 0 14px 18px;
  font-size: 16px;
}
```

At `@media (max-width: 900px)`:
```css
.policy-body .data-table {
  font-size: 13px;
}
.policy-body .data-table td:first-child {
  white-space: normal;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add privacy policy page styles"
```

---

### Task 4: Create sitemap entry

**Files:**
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Create sitemap**

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://heictopdf.app",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://heictopdf.app/privacy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat: add sitemap with homepage and privacy page URLs"
```

---

### Verification

- [ ] `npm test`
- [ ] `npm run build`
- [ ] Visit `/privacy` — full page renders with Navbar, header, 12 sections, Footer
- [ ] Theme toggle works on privacy page
- [ ] Footer privacy link navigates to `/privacy`
- [ ] Back-to-top links scroll smoothly
- [ ] Data tables render correctly
- [ ] Mobile responsive: test at ≤640px and ≤900px
