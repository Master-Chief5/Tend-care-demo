# Tend Design System

A small, **isolated** library of the reusable UI primitives behind the Tend
care-ops app, packaged so Claude Design (and engineers) can build on-brand
screens from real, shippable components.

> This package is **standalone** — it does not import from, or modify, the
> `web/` app. Adding or building it cannot affect the running app.

## What's inside

- **Tokens & fonts** (`src/styles.css`) — the warm "Hearth" palette as
  `--a-*` / `--house-*` CSS custom properties, plus the Geist / Newsreader
  brand fonts and the `.serif` / `.tnum` helpers.
- **Primitives** — `Button`, `Card`, `Badge`, `Pill`, `ProgressBar`, `Stat`,
  `TextField`, `Avatar`, `SectionHeader`, `Banner`.

## Usage

```jsx
import 'tend-design-system/styles.css'
import { Card, Button, ProgressBar } from 'tend-design-system'

function Example() {
  return (
    <Card accent="var(--house-maple)">
      <ProgressBar pct={60} color="var(--house-maple)" />
      <Button variant="accent" accentColor="var(--house-maple)" block>
        Start documenting →
      </Button>
    </Card>
  )
}
```

## Styling idiom

Components are styled with **inline styles that reference the CSS custom
properties** in `styles.css` — there are no utility classes. To theme a
component to a house, pass a `var(--house-*)` value to its color prop
(`accent`, `color`, `accentColor`, `activeColor`). For your own layout glue,
reference the same tokens (`var(--a-card)`, `var(--a-line)`, `var(--a-ink)`,
`var(--a-ink3)`, `var(--a-sage)`, `var(--a-clay)`).

## Build

```bash
npm install
npm run build   # tsc → dist/index.js + dist/*.d.ts
```
