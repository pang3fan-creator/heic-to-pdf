# Hero Button Optimization Design

**Date**: 2026-05-09

## Context

The homepage DropZone's "Select HEIC files" split button needs UI/UX optimization. Current implementation uses a standard orange pill button with a small arrow dropdown, no icon, and basic dropdown menu.

## Changes

### Visual Style

- **Background**: `linear-gradient(135deg, #ff8a3d, #ff6b2b)` gradient
- **Size**: padding increased from `10px 24px` to `12px 28px`, font size 15px, weight 700
- **Icon**: Plus sign SVG (`+`) inside the main button, replacing no-icon
- **Shadow**: `box-shadow: 0 4px 16px rgba(255,107,43,0.35)` for depth
- **Hover**: `translateY(-1px) + shadow deepening` transition

### Split Button

- Arrow button width increased to 44px, font size 18px
- White semi-transparent `border-left` separator between main and arrow
- Arrow and main button share same gradient + shadow treatment

### Copy

- `"Select HEIC files"` → `"SELECT HEIC FILE(S)"` (uppercase)
- Update translation file `messages/en.json`

### Dropdown Menu

- Width aligned with the combined button width
- Each option prefixed with correct brand SVG logo:
  - **From your device**: Monitor/display icon
  - **From Dropbox**: Dropbox logo (blue rounded rect with white triangle)
  - **From Google Drive**: Google Drive logo (four-color triangle)
- Visual separators (`<hr>`) between options
- Border radius 12px, improved hover highlight

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/DropZone.tsx` | Updated button styles, new SVG icons, dropdown layout |
| `src/app/globals.css` | Updated `.split-btn-*` CSS classes |
| `messages/en.json` | Updated `browseBtn` value |

## Verification

1. Visual inspection: button displays correctly in dark/light mode
2. Interaction: split button hover/click/dropdown works end-to-end
3. Responsive: button renders properly on mobile viewports
4. Dropdown: From device / Dropbox / Google Drive all functional
