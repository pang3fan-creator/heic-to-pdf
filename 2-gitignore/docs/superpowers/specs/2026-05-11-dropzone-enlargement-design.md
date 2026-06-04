# Drop Zone Enlargement & Click Enhancement Design

**Date**: 2026-05-11

## Context

The homepage Drop Zone needs visual and interaction improvements. The button enlargement from the previous optimization made the content feel cramped. The drop zone itself feels small relative to the page. Additionally, clicking the empty area of the drop zone should also trigger file selection.

## Changes

### Size

- **Desktop padding**: `60px 40px` → `80px 48px`
- **Mobile padding** (≤640px): `40px 24px` → `56px 24px`
- No change to `max-width: 680px` or `border-radius: 16px`
- No explicit `min-height` added — height remains content-driven

### Spacing (moderate ~30% increase)

| Element | Before | After |
|---------|--------|-------|
| `.drop-zone-icon` margin-bottom | 16px | 22px |
| `.drop-zone h2` margin-bottom | 8px | 12px |
| `.hint` margin-top | 12px | 16px |
| `.privacy-note` margin-top | 18px | 22px |

### Click Anywhere Behavior

The entire drop zone `<div>` becomes clickable. Clicking the dashed area invokes the same file picker as the split button. The split button's wrapper uses `stopPropagation()` to prevent double-firing.

### Interaction Logic

- Click on split button → button's own handler (unchanged)
- Click on drop zone background (icon, title, text) → `onBrowse` via drop zone `onClick`
- Drop zone `onClick` checks `e.target` — if inside `.split-btn-wrap`, it stops

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/globals.css` | Update padding, margin values |
| `src/components/DropZone.tsx` | Add `onClick` to drop-zone div, `stopPropagation` to button wrapper |

## Verification

1. `npm test` — all tests pass
2. `npm run build` — build succeeds
3. Visual: drop zone appears larger with better spacing
4. Interaction: click empty area of drop zone triggers file picker
5. Interaction: click split button still works normally (no double-fire)
6. Mobile: drop zone works correctly at small viewport
