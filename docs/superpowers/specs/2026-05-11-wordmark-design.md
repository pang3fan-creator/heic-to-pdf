# HEICPDF.TO Wordmark Design

**Date**: 2026-05-11

## Context

Design the brand name "HEICPDF.TO" using geometric SVG letterforms that match the H→P icon's visual style (2px stroke, round caps, clean lines).

## Design

### Color Coding

| Part | Color | Meaning |
|------|-------|---------|
| HEIC | `currentColor` | Source format |
| PDF | `var(--accent)` | Target format (matches icon's shared stem) |
| .TO | `var(--muted)` | Domain suffix, de-emphasized |

### Letter Proportions

All letters share the same stroke weight (2px), round linecaps, and baseline alignment. Letter width and spacing is optically balanced:

- Single-stroke letters (I): narrow (8px)
- Medium letters (H, E, C, P): 12-15px
- Wide letters (D, F with extenders): 18-22px
- Letter spacing: 2-3px between each

### SVG Path Reference

```
H: left=6 right=18 crossbar=21
E: left=26 right=41 crossbar=21
I: stem=52, width=8
C: left=66 right=79
P: stem=90, loop q curve
D: stem=112, right curve q
F: stem=139, top=8, mid=21
.TO: dot at 159, T stem=168
```

## File to Modify

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Replace `{t("brand")}` text with inline SVG wordmark |

The Footer uses `{t("brand")}` which is plain text and should remain unchanged (only the navbar brand gets the SVG treatment).

## SEO Consideration

Add `aria-label="HEICPDF.TO"` to the SVG for screen readers.

## Verification

1. `npm run build`
2. Wordmark renders correctly in navbar at all viewport sizes
3. Color coding visible (HEIC in fg, PDF in accent, .TO in muted)
4. Alignment with icon matches (vertically centered)
5. Screen reader announces "HEICPDF.TO"
