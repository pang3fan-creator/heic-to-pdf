# Brand Wordmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Split "HEICPDF.TO" brand text into three colored segments: HEIC(fg) + PDF(accent) + .TO(muted).

**Architecture:** CSS utility classes + replace `{t("brand")}` with hardcoded spans.

---

### Task 1: Add CSS classes

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add brand color classes**

```css
.brand-accent { color: var(--accent); }
.brand-muted { color: var(--muted); }
```

- [ ] **Step 2: Build check**

`npm run build` — quick syntax check.

---

### Task 2: Update Navbar brand

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Replace `{t("brand")}`**

Replace:
```tsx
{t("brand")}
```
With:
```tsx
HEIC<span className="brand-accent">PDF</span><span className="brand-muted">.TO</span>
```

---

### Task 3: Update Footer brand

**Files:**
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Replace `{t("brand")}`**

Same replacement:
```tsx
HEIC<span className="brand-accent">PDF</span><span className="brand-muted">.TO</span>
```

---

### Verification

- [ ] `npm test` + `npm run build`
- [ ] Navbar brand reads: HEIC(fg) **PDF(orange)** .TO(gray)
- [ ] Footer brand reads the same
- [ ] Works in dark and light mode
