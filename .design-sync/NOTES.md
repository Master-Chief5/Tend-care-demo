# Tend design-sync notes

## Repo shape
- This repo is the Tend **app** (`web/` is a Vite app). It is NOT a component
  library, so design-sync targets a **separate, isolated** library at
  `design-system/` — built independently and never imported by `web/`, so the
  running app cannot be affected by anything here.
- Shape: `package`. Entry: `design-system/dist/index.js` (built by
  `cd design-system && npm run build`, i.e. `tsc`). Types come from the same
  `tsc` run (`dist/*.d.ts`).

## Converter invocation (from repo root)
```
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./design-system/node_modules \
  --entry ./design-system/dist/index.js --out ./ds-bundle
DS_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  node .ds-sync/package-validate.mjs ./ds-bundle
```
- `react`/`react-dom` are installed into `design-system/node_modules` (peer deps)
  so the bundle + previews resolve them.
- Render check: playwright is symlinked from `web/node_modules` into
  `.ds-sync/node_modules` (`playwright`, `playwright-core`), and the pinned
  chromium build 1194 is used via `DS_CHROMIUM_PATH`. Re-create the symlinks on
  a fresh clone.

## Known render warns (triaged, not real)
- The validator flags any preview cell whose text **starts with `⚠`** as a
  harness "caught-error" marker (package-validate.mjs ~L535). A Banner with
  `icon="⚠️"` therefore reads as a false-positive error. The component is fine;
  the **preview** uses `icon="🚨"` for the reportable/Warning story to avoid the
  collision. Keep preview text from starting with `⚠`.
- `[FONT_REMOTE]` for Newsreader / Geist / Geist Mono is expected — fonts load
  via a Google Fonts `@import` in `styles.css` (no local woff2 shipped). If you
  want them bundled instead, download the woff2 and wire `cfg.extraFonts`.

## Upload status
- Upload to claude.ai/design was BLOCKED in the build session: design auth
  isn't available in claude.ai/code web (`/design-login` needs a terminal).
  The validated bundle lives at `ds-bundle/` (gitignored). To finish: run from a
  design-authed environment (terminal `/design-login`, or Claude Design
  "Send to Claude Code Web"), then `list_projects` → create project → finalize
  plan → upload `ds-bundle/` per the skill's §5. `projectId` is NOT yet recorded
  in config because nothing was uploaded.

## Re-sync risks
- `design-system/` is hand-authored and small (10 primitives). Adding app
  components means adding them here too — they won't appear automatically.
- The Tend tokens are duplicated from `web/src/styles/globals.css` into
  `design-system/src/styles.css`. If the app's palette changes, update both.
- `ds-bundle/` and `.ds-sync/` are gitignored (regenerated). The durable inputs
  committed are: `.design-sync/config.json`, `conventions.md`, `NOTES.md`,
  `previews/`, plus the whole `design-system/` package.
