# Privacy Policy Page Integration Design

**Date**: 2026-05-11

## Context

Integrate a standalone Privacy Policy HTML design into the Next.js project as a proper locale-routed page. The design is provided in `0-Develop_Doc/UI-UX/privacy-policy.html`.

## Approach

### Route

New page at `src/app/[locale]/privacy/page.tsx`. Under existing `[locale]` route group so middleware handles locale routing automatically.

### Translation Strategy

Add `privacy` namespace to `messages/en.json`. Content stored as HTML strings in a section array, loaded via `t.raw()`. This enables future multi-language support without code changes.

### Components

Privacy page reuses existing `<Navbar />` and `<Footer />` components (same pattern as homepage).

### CSS

Add privacy page specific styles to `globals.css`:
- `.policy-header` — page title and metadata
- `.policy-body` — content container with max-width 720px
- `.policy-body h2` / `h3` — section headings
- `.policy-body .emph-box` — highlighted callout box
- `.policy-body .data-table` — data collection table
- `.policy-body .back-to-top` — anchor navigation
- Responsive overrides

These styles share the project's existing theme variables (`--accent`, `--surface`, `--border`, `--muted`, etc.).

### Footer Link

Update `messages/en.json` footer > Support > Privacy policy href from `"#"` to `"/privacy"`.

## Files to Modify

| File | Change |
|------|--------|
| `src/app/[locale]/privacy/page.tsx` | Create - privacy page component |
| `messages/en.json` | Add `privacy` namespace (12 sections) + update footer link |
| `src/app/globals.css` | Add privacy page styles |
| `src/app/sitemap.ts` | Add privacy page URL |

## Verification

1. `npm test` / `npm run build`
2. Visit `/privacy` — page renders with correct layout
3. Verify dark/light theme toggle works
4. Verify footer link navigates to privacy page
5. Verify back-to-top links work
6. Responsive behavior on mobile viewport
