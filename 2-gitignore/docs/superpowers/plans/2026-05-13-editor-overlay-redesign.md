# EditorOverlay Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform EditorOverlay from full-screen fixed overlay to inset card with backdrop blur

**Architecture:** Add backdrop layer behind the editor, reduce `.editor-overlay` from `inset: 0` to `inset: 16px` with rounded corners. Editor.tsx gets a new sibling backdrop div with synchronized show/hide. CSS handles all visual styling and transitions.

**Tech Stack:** Next.js, CSS (no frameworks), React

---

### Task 1: Update CSS — Modify `.editor-overlay` + Add `.editor-backdrop`

**Files:**
- Modify: `src/app/globals.css:428-442`

- [ ] **Step 1: Update `.editor-overlay` CSS**

Replace lines 428-442 with:

```css
/* ========== Editor Overlay ========== */
.editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: oklch(0% 0 0 / 30%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}
.editor-backdrop.active {
  opacity: 1;
  pointer-events: auto;
}
.editor-overlay {
  position: fixed;
  inset: 16px;
  z-index: 10000;
  border-radius: 16px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  opacity: 0;
  transform: scale(0.98);
  pointer-events: none;
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.editor-overlay.active {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
```

**Key changes from current:**
- New `.editor-backdrop` block (semi-transparent + blur)
- `inset: 0` → `inset: 16px`
- `background: var(--bg)` → `background: var(--surface)`
- Added `border-radius: 16px; overflow: hidden`
- Added `box-shadow`
- Added `transform: scale(0.98)` → `scale(1)` animation
- Deleted `background: var(--bg)`

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: Build succeeds

---

### Task 2: Add backdrop element to EditorOverlay.tsx

**Files:**
- Modify: `src/components/EditorOverlay.tsx:408-409`

- [ ] **Step 1: Wrap backdrop + overlay in a Fragment**

The current return structure is:
```tsx
return (
    <div className="editor-overlay active" id="editorOverlay">
      ...header, body, input...
    </div>
);
```

Change to:
```tsx
return (
    <>
    <div className="editor-backdrop active" />
    <div className="editor-overlay active" id="editorOverlay">
      ...header, body, input...
    </div>
    </>
);
```

Specifically:
- Line 408: `return (` → `return (<>`
- Line 409: `<div className="editor-overlay active" id="editorOverlay">` → `<div className="editor-backdrop active" /><div className="editor-overlay active" id="editorOverlay">`
- Line 700: `</div>` → `</div></>`

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: Build succeeds

---

### Task 3: Visual verification with browser

- [ ] **Step 1: Start dev server and navigate to page**

```bash
npm run dev
```
Navigate to http://localhost:3000

- [ ] **Step 2: Use agent-browser to verify the editor appearance**

Trigger the editor state (via file selection or manual injection) and verify:
- Editor is inset 16px from all edges
- Four corners are rounded (16px radius)
- Background behind the editor shows page content with blur
- Entry animation (scale + opacity) works
- Transition is smooth

Use `agent-browser eval` to measure positions:

```javascript
var e = document.getElementById('editorOverlay');
var r = e.getBoundingClientRect();
JSON.stringify({top: r.top, left: r.left, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom, width: r.width, height: r.height, br: getComputedStyle(e).borderRadius})
```

Expected: top=16, left=16, right-window=16, bottom-window=16, borderRadius=16px

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/EditorOverlay.tsx docs/
git commit -m "feat: redesign editor overlay as inset card with backdrop blur"
```
