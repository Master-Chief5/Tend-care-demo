# Tend design system — how to build with it

Tend is a care-operations app for group homes. Its look is the warm **"Hearth"**
palette: cream surfaces, near-black ink, and per-house accent colors. Build
on-brand screens by composing the components below and styling your own layout
glue with the design tokens — never hard-coded hex.

## Setup — no provider needed

There is **no React provider or theme wrapper**. The tokens are plain CSS custom
properties on `:root`, shipped in `styles.css` (already imported for you). Drop
components in directly:

```jsx
import { Card, ProgressBar, Button } from 'tend-design-system'

<Card accent="var(--house-maple)">
  <div className="serif" style={{ fontSize: 18 }}>Maple Run</div>
  <ProgressBar pct={60} color="var(--house-maple)" />
  <Button variant="accent" accentColor="var(--house-maple)" block>Start documenting →</Button>
</Card>
```

## Styling idiom — CSS custom properties, no utility classes

There is **no utility-class system** (no Tailwind). Components are styled
internally with inline styles that read these tokens; for your own layout, use
the same tokens via `var(--token)`:

| Token | Use |
|---|---|
| `--a-bg` / `--a-paper` | page + sunken backgrounds |
| `--a-card` | card / surface fill |
| `--a-ink` / `--a-ink2` / `--a-ink3` | primary / secondary / muted text |
| `--a-line` | hairline borders |
| `--a-sage` | primary green accent (success, focus) |
| `--a-clay` | terracotta accent (primary actions) |
| `--a-honey` `--a-plum` `--a-leaf` `--a-rose` | secondary accents |
| `--house-oak` `--house-willow` `--house-maple` `--house-ash` `--house-cedar` | per-house identity (gold / teal / red / blue / purple) |
| `--status-good-*` `--status-warn-*` `--status-bad-*` | status tint bg/text pairs |

**Theme to a house** by passing a `var(--house-*)` value to a component's color
prop: `accent` (Card), `accentColor` (Button), `color` (ProgressBar, Avatar),
`activeColor` (Pill), `actionColor` (SectionHeader). `Badge` and `Banner` take a
semantic `tone` instead — note the sets differ: `Badge` is
`neutral` / `good` / `warn` / `bad` / `solid`; `Banner` is
`good` / `warn` / `bad` / `info`.

**Typography**: body is **Geist**; headings/serif use **Newsreader** via the
`.serif` helper class; tabular numbers via `.tnum`.

## Where the truth lives

- `styles.css` — every token and the brand fonts. Read it before styling.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage + props.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract.

## Components

`Button`, `Card`, `Badge`, `Pill`, `ProgressBar`, `Stat`, `TextField`,
`Avatar`, `SectionHeader`, `Banner`. Compose these for screens; a typical Tend
screen is a stack of `SectionHeader` + `Card`s holding `Stat` rows, resident
lists (`Avatar` + `Badge`), and a primary `Button`.
