# HEICPDF.TO Logo Icon Design

**Date**: 2026-05-11

## Context

Replace the current abstract shape SVG icon in the navbar brand with a meaningful "H→P" conversion mark that represents HEIC to PDF transformation.

## Design Concept

The icon uses a shared-vertical-stroke concept: the H and P share their middle vertical line, visually representing the conversion from HEIC (H) to PDF (P). The shared stroke is rendered in the accent color (orange) to emphasize the transformation.

## SVG Paths

28×28 viewBox with `rx=7` rounded rect container:

```
<rect x="2" y="2" width="24" height="24" rx="7" stroke="currentColor" stroke-width="1.5"/>
```

### Letters (stroke-width 2.2, round caps):

| Element | Path | Color |
|---------|------|-------|
| H left vertical | `M8.5 8v12` | currentColor |
| H crossbar | `M8.5 14h6.5` | currentColor |
| Shared vertical (H right = P left) | `M15 8v12` | accent |
| P right semi-circle | `M15 8C19 8 20.5 9.5 20.5 11C20.5 12.5 19 14 15 14` | accent |

The P loop uses a dual-segment cubic bezier to create a smooth semi-circular arc.

## File to Modify

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Replace the inline SVG icon paths |

## Verification

1. `npm run build`
2. Icon displays correctly at 28×28 in the navbar
3. P loop renders as a smooth rounded curve
4. Accent color transition is visible
