# Theme Toggle Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current emoji-based circular theme toggle with a pill/capsule-shaped switch with SVG icons and sliding animation.

**Architecture:** CSS capsule styling + Navbar component update to use FiSun/FiMoon from react-icons.

**Tech Stack:** React, CSS transitions, react-icons (FiSun, FiMoon)

---

### Task 1: Update theme toggle CSS

**Files:**
- Modify: `src/app/globals.css:138-155`

- [ ] **Step 1: Replace .theme-toggle CSS**

Replace the existing `.theme-toggle` and `.theme-toggle:hover` rules (lines 138-155) with:

```css
.theme-toggle {
  position: relative;
  width: 52px;
  height: 26px;
  border-radius: 100px;
  border: none;
  cursor: pointer;
  background: var(--border);
  transition: background 0.3s;
  flex-shrink: 0;
  padding: 3px;
  display: flex;
  align-items: center;
}
.theme-toggle[data-theme="light"] {
  background: var(--accent);
}
.theme-toggle:hover {
  transform: scale(1.05);
}
.theme-toggle:active {
  transform: scale(0.95);
}
.theme-toggle-knob {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--fg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s, background 0.3s;
  pointer-events: none;
}
.theme-toggle[data-theme="light"] .theme-toggle-knob {
  transform: translateX(-26px);
  background: #fff;
}
.theme-toggle-knob svg {
  color: var(--bg);
}
.theme-toggle[data-theme="light"] .theme-toggle-knob svg {
  color: var(--accent);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: update theme toggle CSS to pill/capsule design"
```

---

### Task 2: Update Navbar component

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add FiSun and FiMoon imports**

```tsx
import { FiSun, FiMoon } from "react-icons/fi";
```

- [ ] **Step 2: Replace theme toggle button markup**

Replace the current button:

```tsx
<button
  className="theme-toggle"
  onClick={toggleTheme}
  aria-label={t("themeToggle")}
>
  {mounted
    ? document.documentElement.getAttribute("data-theme") === "dark"
      ? "☀️"
      : "🌙"
    : "☀️"}
</button>
```

With:

```tsx
<button
  className="theme-toggle"
  onClick={toggleTheme}
  aria-label={t("themeToggle")}
  data-theme={mounted ? document.documentElement.getAttribute("data-theme") : "dark"}
>
  <span className="theme-toggle-knob">
    {mounted && document.documentElement.getAttribute("data-theme") === "light" ? (
      <FiSun size={12} />
    ) : (
      <FiMoon size={12} />
    )}
  </span>
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: replace emoji theme toggle with FiSun/FiMoon capsule"
```

---

### Verification

- [ ] `npm test` + `npm run build`
- [ ] Capsule renders in dark mode: moon icon, knob on right, `var(--border)` track
- [ ] Click toggles to light mode: sun icon, knob slides left, `var(--accent)` track
- [ ] Animation is smooth (0.3s transition)
- [ ] Hover/active states work
- [ ] Mobile responsive
