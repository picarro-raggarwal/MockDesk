# WMS-UI theme palette (portable reference)

Use this document to recreate the same look in another app or as context in **Cursor** (paste into a rule, `AGENTS.md`, or a design doc).

**MockDesk source of truth:** `src/index.css` (CSS variables), `tailwind.config.js` (Tailwind `theme.extend`).

**Convention:** Semantic colors are **HSL triplets** (no `hsl()` wrapper) so Tailwind can do `hsl(var(--token) / <alpha-value>)`.

---

## Typography

| Usage | Stack |
|--------|--------|
| Default UI | `"Wix Madefor Text", "Inter", Helvetica, sans-serif` |
| Alternate (`.font-barlow`) | `"Barlow", sans-serif` |

Defined on `:root, body` and `fontFamily.sans` in `tailwind.config.js`.

---

## Core semantic tokens (shadcn-style)

Values are **HSL components only** (`H S% L%`). See `src/index.css` for `:root` and `.dark`.

### Light (`:root`)

| Token | Value |
|--------|--------|
| `--background` | `0 0% 100%` |
| `--foreground` | `240 10% 3.9%` |
| `--card` | `0 0% 100%` |
| `--card-foreground` | `240 10% 3.9%` |
| `--card-elevated` | `0 0% 98%` |
| `--popover` | `0 0% 100%` |
| `--popover-foreground` | `240 10% 3.9%` |
| `--primary` | `105 42% 34%` |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `240 4.8% 95.9%` |
| `--secondary-foreground` | `240 5.9% 10%` |
| `--muted` | `240 4.8% 95.9%` |
| `--muted-foreground` | `240 3.8% 40%` |
| `--accent` | `240 4.8% 95.9%` |
| `--accent-foreground` | `240 5.9% 10%` |
| `--destructive` | `0 84.2% 60.2%` |
| `--destructive-foreground` | `0 0% 98%` |
| `--border` | `240 5.9% 86%` |
| `--input` | `240 5.9% 88%` |
| `--ring` | `240 10% 3.9%` |
| `--chart-1` … `--chart-5` | `12 76% 61%`, `173 58% 39%`, `197 37% 24%`, `43 74% 66%`, `27 87% 67%` |
| `--primary-brand-400` | `105 45% 51%` |
| `--primary-brand-500` | `105 42% 34%` |
| `--primary-brand-600` | `105 42% 29%` |
| `--radius` | `0.5rem` |

**Brand hue:** `105°` (yellow–green). Light primary ≈ **#4a7c2f** (approximate from HSL).

### Dark (`.dark`)

| Token | Value |
|--------|--------|
| `--background` | `0 0% 10.5%` |
| `--foreground` | `0 0% 97%` |
| `--card` | `0 0% 12.5%` |
| `--card-foreground` | `0 0% 97%` |
| `--card-elevated` | `0 0% 16%` |
| `--popover` | `0 0% 12.5%` |
| `--popover-foreground` | `0 0% 97%` |
| `--primary` | `105 38% 46%` |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `0 0% 15%` |
| `--secondary-foreground` | `0 0% 96%` |
| `--muted` | `0 0% 14%` |
| `--muted-foreground` | `0 0% 76%` |
| `--accent` | `0 0% 17%` |
| `--accent-foreground` | `0 0% 96%` |
| `--destructive` | `0 62% 50%` |
| `--destructive-foreground` | `0 0% 100%` |
| `--border` | `0 0% 23%` |
| `--input` | `0 0% 15%` |
| `--ring` | `105 42% 52%` |
| `--chart-1` … `--chart-5` | `105 48% 55%`, `168 45% 50%`, `38 78% 56%`, `275 50% 60%`, `335 60% 58%` |
| `--primary-brand-400` | `105 44% 56%` |
| `--primary-brand-500` | `105 38% 46%` |
| `--primary-brand-600` | `105 36% 40%` |
| `--surface-dark` | `#141414` |
| `--surface-dark-elevated` | `#1f1f1f` |

Dark neutrals are **achromatic** (`0 0% …`); green is reserved for primary / sidebar accents.

---

## Sidebar

Light `:root` uses a **dark sidebar** strip even in light mode (`--sidebar` ≈ `0 0% 10%`) so the shell matches product chrome. See `src/index.css` for full `--sidebar-*` tokens.

---

## Tailwind mapping

Semantic colors use `hsl(var(--…))`. Primary scale: `primary.400` | `primary.500` | `primary.600` → `hsl(var(--primary-brand-*) / <alpha-value>)`.

Extended utilities: `shadow-card`, `shadow-cardDark`, `shadow-border`, `shadow-elevated`, `shadow-input`, `bg-striped` / `bg-stripedDark`, `bg-card-elevated`, `font-barlow`.

---

## Data / chart hex colors

**Source in MockDesk:** `src/theme/chartPalette.ts`

---

## Live-style status ↔ UI (Tailwind classes)

**Source in MockDesk:** `src/theme/liveStatusStyles.ts` — status `0 | 1 | 2 | 3` → text and top border classes.

---

## Reusing in another project (or in Cursor)

1. Copy the **`@layer base` variable blocks** from `src/index.css` (`:root` + `.dark`).
2. Point Tailwind at them like `tailwind.config.js`.
3. Keep `darkMode: ["class"]` and toggle `.dark` on `<html>` (see `useThemeClass`).
4. **tailwindcss-animate** is already used for UI primitives.
