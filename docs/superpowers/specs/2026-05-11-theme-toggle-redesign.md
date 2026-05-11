# Theme Toggle Button Redesign

**Date**: 2026-05-11

## Context

Replace the current emoji-based (☀️/🌙) circular theme toggle with a pill/capsule-shaped switch featuring SVG icons and smooth sliding animation.

## Design

### Structure

A 52×26px pill-shaped button containing a 20×20px sliding knob:

```
[◉  ]  Dark mode  — knob on right, moon icon
[  ◉]  Light mode — knob on left, sun icon
```

### Visual Specs

| Property | Dark mode | Light mode |
|----------|-----------|------------|
| Track background | `var(--border)` | `var(--accent)` |
| Knob background | `var(--fg)` | `#fff` |
| Knob position | right: 3px | left: 3px |
| Icon | Moon (FiMoon from react-icons) | Sun (FiSun from react-icons) |
| Icon color | `var(--bg)` | `var(--accent)` |

### States

- **Default**: smooth transition 0.3s
- **Hover**: slight scale (1.05) on the entire capsule for feedback
- **Focus**: visible outline for keyboard navigation
- **Active/Click**: momentary scale(0.95) press effect

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Navbar.tsx` | Replace emoji + circle button with pill capsule + FiSun/FiMoon |
| `src/app/globals.css` | Replace `.theme-toggle` styles with new capsule styles |

## Verification

1. `npm test` / `npm run build`
2. Toggle works in both dark/light mode
3. Animation smooth
4. Mobile responsive
5. aria-label preserved
