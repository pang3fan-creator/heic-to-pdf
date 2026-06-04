# HEICPDF.TO Brand Wordmark Design

**Date**: 2026-05-11

## Context

Design the brand name "HEICPDF.TO" to visually match the H→P icon style using color splitting: HEIC in standard text color, PDF in accent orange, .TO in muted gray.

## Design

### Color Split

| Segment | Color | CSS Variable |
|---------|-------|-------------|
| HEIC | Foreground (white/dark) | `var(--fg)` |
| PDF | Accent (orange) | `var(--accent)` |
| .TO | Muted (gray) | `var(--muted)` |

### Implementation

Replace `{t("brand")}` in Navbar and Footer with styled inline spans:

```tsx
<span style={{ color: "var(--fg)" }}>HEIC</span>
<span style={{ color: "var(--accent)" }}>PDF</span>
<span style={{ color: "var(--muted)" }}>.TO</span>
```

The brand name is a fixed property that doesn't change with locale, so hardcoding is appropriate.

Since the translation key `nav.brand` / `footer.brand` will no longer be used, it can be removed from the translation file or kept for reference.

### Alternative: CSS class approach

Add a CSS class for `.brand-highlight` and `.brand-suffix` to keep markup clean:

```tsx
<span>HEIC</span><span className="brand-accent">PDF</span><span className="brand-muted">.TO</span>
```

```css
.brand-accent { color: var(--accent); }
.brand-muted { color: var(--muted); }
.navbar-brand .brand-accent { color: var(--accent); } /* or rely on inheritance */
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Split brand text into three colored parts |
| `src/components/Footer.tsx` | Same |
| `messages/en.json` | `nav.brand` and `footer.brand` could be removed or kept |

## Verification

1. `npm test` / `npm run build`
2. Navbar shows HEIC(fg) **PDF(accent)** .TO(muted)
3. Footer shows the same three-color split
4. Both dark and light modes render correctly
