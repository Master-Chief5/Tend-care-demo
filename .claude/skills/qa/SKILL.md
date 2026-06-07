---
name: qa
description: Headless QA sweep of the Tend web app — boots it in demo mode and clicks through every screen as supervisor, manager, and DSP, capturing runtime errors and screenshots. Use when asked to QA, smoke-test, sanity-check, or verify the app renders without errors.
---

# /qa — full app QA sweep

Drives the running app headlessly across all three roles and every screen,
captures console/page errors plus a screenshot of each screen, and reports.

## Steps

1. **Make sure the demo dev server is up** on http://127.0.0.1:5173:
   - `curl -sf http://127.0.0.1:5173 >/dev/null` — if it fails, start it:
     `cd web && VITE_DEMO_MODE=true npx vite --port 5173 --host 127.0.0.1 &` then wait ~4s.
   - Deps should already be installed by the SessionStart hook; if not, run
     `cd web && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install`.

2. **Run the sweep:** `node web/e2e/qa-sweep.mjs`
   - Honors `BASE_URL`, `OUT_DIR`, `CHROMIUM_PATH` (defaults: localhost:5173,
     /tmp/qa-sweep, the sandbox's pre-provisioned Chromium).
   - Exit 0 = clean · exit 1 = runtime errors found · exit 2 = server unreachable.

3. **Review** a representative sample of the screenshots in the output dir (read
   the images) and the printed error list.

4. **Report** per-role pass/fail, any runtime error with the screen it occurred
   on, and notable visual issues — then fix them or surface them to the user.

## Going deeper
For create-flow, edge-case, large-dataset, or desktop-viewport checks, adapt the
script (e.g. seed the demo store via `localStorage['tend-demo-store-v1']`, change
the viewport to ≥820px for the desktop layout, or build with `VITE_DEMO_MODE=true`
and run `web/e2e/smoke.test.mjs` the way CI does).
