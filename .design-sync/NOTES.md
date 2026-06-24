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
- **DONE (2026-06-23).** All 10 components uploaded to project **"Design System"**
  `66bd1bde-91ba-4002-8586-e508cb632498` (now pinned as `projectId` in config).
  58 files, render check clean, all 10 graded `good`, `_ds_sync.json` anchor
  written last. URL: https://claude.ai/design/p/66bd1bde-91ba-4002-8586-e508cb632498
  Future runs are normal re-syncs (atomic path, since projectId is now pinned).

## Windows build environment (this machine)
- **Node is now installed** via winget: `winget install OpenJS.NodeJS.LTS --source winget`
  (the `msstore` source fails a cert check — always pass `--source winget`). It
  lives under `…\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v24.*-win-x64\` and is
  NOT on the bash PATH — prepend that dir to `PATH` in each shell call.
- **npm TLS:** set `NODE_OPTIONS=--use-system-ca` for every npm/node command —
  the corporate root CA is only in the Windows cert store, so the default bundled
  CAs fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (same root cause as the git
  schannel issue). With `--use-system-ca` it just works.
- **Render check without a 200MB download:** system Chrome is installed at
  `C:\Program Files\Google\Chrome\Application\chrome.exe`. Install only the
  Playwright JS pkg (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright`) into
  `.ds-sync/`, then run validate/capture with
  `DS_CHROMIUM_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`.
- **esbuild:** npm's allow-scripts policy blocks its postinstall, but the
  `@esbuild/win32-x64` optional binary installs anyway and esbuild works — ignore
  the `allow-scripts` warning.
- **`DesignSync(finalize_plan)` `localDir` must be an ABSOLUTE path** here —
  a relative `./ds-bundle` double-resolved to `…\ds-bundle\ds-bundle` (ENOENT).
- design-system build: `cd design-system && npm install && npm install --no-save
  react@^18 react-dom@^18 && npm run build` (peers aren't auto-installed).

## Re-sync risks
- `design-system/` is hand-authored and small (10 primitives). Adding app
  components means adding them here too — they won't appear automatically.
- The Tend tokens are duplicated from `web/src/styles/globals.css` into
  `design-system/src/styles.css`. If the app's palette changes, update both.
- `ds-bundle/` and `.ds-sync/` are gitignored (regenerated). The durable inputs
  committed are: `.design-sync/config.json`, `conventions.md`, `NOTES.md`,
  `previews/`, plus the whole `design-system/` package.
