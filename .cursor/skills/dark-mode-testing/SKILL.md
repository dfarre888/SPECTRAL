---
name: dark-mode-testing
description: Toggle SPECTRAL light and dark themes, screenshot both, and flag missing token mappings or contrast issues.
---

# Dark Mode Testing — SPECTRAL

SPECTRAL default is **dark ops floor**. Light theme is daylight briefing-room paper.

## Tokens

- Persistence: `localStorage['spectral-theme']` = `dark` | `light`
- Root: `data-theme="dark|light"`, `.dark` / `.light` classes, `color-scheme`
- Boot script: `THEME_BOOT_SCRIPT` in `lib/ui/theme.ts` (inline in `app/layout.tsx`)
- Toggle: `ThemeToggle` in the topbar (sun/moon) and login page
- Canonical colours: `--store-*` in `app/globals.css`
- Do **not** theme the classification banner off amber
- Do **not** restyle Cesium globe scene backgrounds (`#0A0A0F` on the globe stays)
- HUD over the globe uses `.theme-on-globe` so `text-white` stays white

## Workflow

1. Open `/` or `/map` with the app running.
2. Screenshot dark (default).
3. Click the sun button (`aria-label="Switch to light theme"`) or run:
   ```js
   document.documentElement.setAttribute('data-theme', 'light')
   document.documentElement.classList.remove('dark')
   document.documentElement.classList.add('light')
   ```
4. Screenshot light.
5. Inspect for:
   - Invisible text (white ink on paper, or zinc ink on zinc)
   - Hardcoded `#0A0A0F` / `#080808` on chrome panels (should be `var(--store-surface)`)
   - Inputs that keep a dark field with dark text
   - Classification banner still amber and readable
   - Map HUD still readable over the globe
6. Toggle back to dark and confirm no flash / leftover light tokens.

## Report format

```
Theme test:
  Dark: OK | issues
  Light: OK | issues
```
