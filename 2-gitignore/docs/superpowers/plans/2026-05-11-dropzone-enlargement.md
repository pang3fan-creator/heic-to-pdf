# Drop Zone Enlargement & Click Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge the drop zone visual area, improve internal spacing, and make the entire drop zone clickable for file selection.

**Architecture:** Two independent changes: CSS values update, then JSX event handler update. Simple, no new components needed.

**Tech Stack:** CSS custom properties, React onClick/stopPropagation

---

### Task 1: Update CSS — larger padding and spacing

**Files:**
- Modify: `src/app/globals.css:244-316`

- [ ] **Step 1: Update desktop drop-zone padding**

Line 248: change `padding: 60px 40px` → `padding: 80px 48px`

- [ ] **Step 2: Update mobile drop-zone padding (≤640px)**

Line 1488: change `padding: 40px 24px` → `padding: 56px 24px`

- [ ] **Step 3: Update internal spacing values**

Line 270: `.drop-zone-icon` margin-bottom: `16px` → `22px`
Line 277: `.drop-zone h2` margin-bottom: `8px` → `12px`
Line 288: `.drop-zone .hint` margin-top: `12px` → `16px`
Line 313: `.privacy-note` margin-top: `18px` → `22px`

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: enlarge drop zone padding and improve internal spacing"
```

---

### Task 2: Add click-to-upload and stopPropagation

**Files:**
- Modify: `src/components/DropZone.tsx`

- [ ] **Step 1: Add onClick to drop-zone div**

On the main `<div className="drop-zone" ...>` element (line 116-136), add an `onClick` handler that calls `onBrowse`. The handler must check that the click didn't originate from inside `.split-btn-wrap`:

After the existing `onDrop` handler (line 136), add:
```tsx
onClick={(e) => {
  if ((e.target as HTMLElement).closest('.split-btn-wrap')) return;
  onBrowse();
}}
```

The `.closest('.split-btn-wrap')` check prevents double-firing when clicking the split button — clicks on buttons or dropdown items inside that wrapper are ignored by the drop-zone click handler.

- [ ] **Step 2: Commit**

```bash
git add src/components/DropZone.tsx
git commit -m "feat: make entire drop zone clickable for file selection"
```

---

### Verification

- [ ] `npm test`
- [ ] `npm run build`
- [ ] Visually: drop zone appears larger with improved spacing
- [ ] Click empty area of drop zone (icon/title/text) → file picker opens
- [ ] Click split button → file picker opens (no double-fire)
- [ ] Drag and drop still works correctly
- [ ] Mobile viewport: drop zone adapts correctly
