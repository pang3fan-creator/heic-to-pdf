# Hero Button Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the "Select HEIC files" split button on the homepage with gradient styling, plus icon, larger arrow, uppercase text, and enhanced dropdown with brand logos.

**Architecture:** Three independent changes: translation update, CSS overhaul, and component markup update. CSS classes remain the same names, only values change.

**Tech Stack:** Next.js (App Router), CSS custom properties, SVG inline icons

---

### Task 1: Update translation text

**Files:**
- Modify: `messages/en.json:19`

- [ ] **Step 1: Change browseBtn text**

```json
"browseBtn": "SELECT HEIC FILE(S)",
```

- [ ] **Step 2: Commit**

```bash
git add messages/en.json
git commit -m "feat: update button text to uppercase SELECT HEIC FILE(S)"
```

---

### Task 2: Update CSS for hero split button

**Files:**
- Modify: `src/app/globals.css:1684-1748`

- [ ] **Step 1: Replace hero split button styles**

Replace the `.split-btn-main` through `.split-btn-dropdown button:hover` block (lines 1684-1748) with:

```css
/* Split button */
.split-btn-wrap {
  position: relative;
  display: flex;
}
.split-btn-main {
  padding: 12px 28px;
  border-radius: 100px 0 0 100px;
  border: none;
  background: linear-gradient(135deg, #ff8a3d, #ff6b2b);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(255, 107, 43, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
  line-height: 1.2;
}
.split-btn-main:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(255, 107, 43, 0.5);
}
.split-btn-main:active {
  transform: translateY(0);
}
.split-btn-arrow {
  padding: 0;
  width: 44px;
  border-radius: 0 100px 100px 0;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.25);
  background: linear-gradient(135deg, #ff8a3d, #ff6b2b);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
  font-family: var(--font-body);
  box-shadow: 0 4px 16px rgba(255, 107, 43, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.split-btn-arrow:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(255, 107, 43, 0.5);
}
.split-btn-arrow:active {
  transform: translateY(0);
}
.split-btn-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 100%;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  padding: 6px;
  z-index: 10;
  box-sizing: border-box;
}
.split-btn-dropdown button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fg);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: var(--font-body);
  text-align: left;
  transition: background 0.15s;
}
.split-btn-dropdown button:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.split-btn-dropdown hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2px 10px;
}
```

- [ ] **Step 2: Verify no other CSS rules conflict**

The editor's split button overrides (`.split-btn-editor`, `.split-btn-editor-arrow`) at line 1750+ are separate classes and unaffected.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: update hero split button CSS with gradient, shadow, and enhanced dropdown"
```

---

### Task 3: Update DropZone component with new icons and dropdown structure

**Files:**
- Modify: `src/components/DropZone.tsx`

- [ ] **Step 1: Replace the main button icon and SVG**

In DropZone.tsx, find the split-btn-wrap section. The main button currently has no icon. Add a plus SVG before the button text.

Replace:
```tsx
<button className="split-btn-main" onClick={onBrowse} type="button">
  {t("browseBtn")}
</button>
```

With:
```tsx
<button className="split-btn-main" onClick={onBrowse} type="button">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
  {t("browseBtn")}
</button>
```

- [ ] **Step 2: Add brand logos and separators to dropdown menu**

Replace the dropdown menu content (the three buttons inside `.split-btn-dropdown`):

Replace:
```tsx
{browseOpen && (
  <div className="split-btn-dropdown">
    <button onClick={() => { setBrowsePinned(false); setBrowseHover(false); onBrowse(); }} type="button">
      {t("fromDevice")}
    </button>
    <button onClick={handleFromDropbox} type="button">
      {t("fromDropbox")}
    </button>
    <button onClick={handleFromGoogleDrive} type="button">
      {t("fromGoogleDrive")}
    </button>
  </div>
)}
```

With:
```tsx
{browseOpen && (
  <div className="split-btn-dropdown">
    <button onClick={() => { setBrowsePinned(false); setBrowseHover(false); onBrowse(); }} type="button">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
      {t("fromDevice")}
    </button>
    <hr />
    <button onClick={handleFromDropbox} type="button">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#0061FF"/>
        <path d="M6 8l4-3 4 3-4 3-4-3z" fill="white"/>
        <path d="M10 13l4-3 4 3-4 3-4-3z" fill="white"/>
        <path d="M12 17l4-3 2 1.5v1L12 19l-6-3.5v-1L8 14l4 3z" fill="white" opacity="0.6"/>
      </svg>
      {t("fromDropbox")}
    </button>
    <hr />
    <button onClick={handleFromGoogleDrive} type="button">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path d="M12 2L8 9.5h8L12 2z" fill="#4285F4"/>
        <path d="M5.5 16L8 9.5l-3.5 6.5H2L4 12.5 2 9.5h5L12 2l5 7.5h5l-2 3 2 3.5h-3.5L16 9.5 13.5 16l-1.5 3-1.5-3z" fill="#34A853"/>
        <path d="M12 21l3.5-5h-7L12 21z" fill="#EA4335"/>
        <path d="M8 9.5L5.5 16h6L8 9.5z" fill="#FBBC05"/>
      </svg>
      {t("fromGoogleDrive")}
    </button>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DropZone.tsx
git commit -m "feat: add plus icon and brand logos to hero split button"
```

---

### Verification

- [ ] Run `npm run dev` and visually inspect the button on the homepage
- [ ] Verify: gradient background displays correctly
- [ ] Verify: plus icon shows in the main button
- [ ] Verify: text reads "SELECT HEIC FILE(S)"
- [ ] Verify: hover triggers translateY and shadow deepening
- [ ] Verify: arrow button is wider (44px) with 18px ▾
- [ ] Verify: dropdown opens with correct width
- [ ] Verify: each dropdown item has correct brand logo
- [ ] Verify: separators show between dropdown items
- [ ] Verify: dark mode and light mode both look correct
- [ ] Verify: responsive layout on mobile viewport
- [ ] Run `npm run lint` for static check
- [ ] Run `npm run build` to verify no build errors

```bash
npm run dev
# then manually test in browser
npm run lint
npm run build
```
