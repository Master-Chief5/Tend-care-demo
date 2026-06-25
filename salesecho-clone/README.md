# SalesEcho — landing page clone

A faithful front-end clone of the [sales-echo.com](https://sales-echo.com)
marketing site (an AI real-time sales-call assistant), rebuilt from the mobile
screenshot. Self-contained: **Vite + React**, no backend, no API keys.

> ⚠️ Unofficial demo built for educational purposes. Not affiliated with SalesEcho.

## What's included

- **Pixel-faithful hero** — "Practice. Sell Live. Close more deals. 🚀", the
  before/during/after sub-headline, the dark "Close More Deals 🎯" and outlined
  "Enterprise 🏢" CTAs, "$1 trial", "Works with Meet/Zoom/Teams + More", and the
  "See how it works" scroll cue — matching the original screenshot.
- **Working interactive demo** — the centerpiece. A scripted live discovery call
  plays out in real time: the transcript types out and **AI coaching cards** pop
  into a private side panel (pre-call prep → live tips, objection handling, buying
  signals → post-call summary). This simulates the actual before/during/after
  product experience with zero backend.
- **Language toggle** (English / Español) that swaps the entire site copy.
- **Sign In modal**, **pricing** (monthly/yearly toggle, 3 tiers), **features**,
  **how-it-works**, **testimonials**, **FAQ accordion**, and **footer**.
- Fully responsive (mobile nav matches the source screenshot).

## What is *not* (and can't be) cloned

The real product joins live Google Meet / Zoom / Teams calls, streams them through
speech-to-text, and runs proprietary LLM coaching prompts — backed by paid
third-party integrations, marketplace OAuth apps, billing, and a database. None of
that source, those secrets, or those accounts are obtainable from a screenshot, so
the live-call backend is *simulated* here rather than reproduced. See the
interactive demo for a faithful re-creation of the experience.

## Run it

```bash
cd salesecho-clone
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve the production build
```

## Structure

```
src/
  App.jsx                  # page composition + all marketing sections
  content.js               # all copy (EN/ES) + the scripted demo call
  components/
    Nav.jsx                # logo, language toggle, Sign In
    Logo.jsx               # the audio-wave badge mark
    SignInModal.jsx        # demo-only auth modal
    InteractiveDemo.jsx    # the live-call coaching simulation
  styles.css               # all styling
```
