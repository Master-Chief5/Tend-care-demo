# Claude Code tooling for this repo

Helpers that make Claude more effective at building/debugging this app.

## SessionStart hook (`.claude/hooks/session-start.sh`)
Runs automatically at the start of every **Claude Code on the web** session:
`cd web && npm install` (Playwright browser download skipped — a Chromium is
pre-provisioned in the sandbox). So a fresh cloud session is build/test-ready
immediately instead of needing manual setup. Registered in `settings.json`.
Runs only when `CLAUDE_CODE_REMOTE=true` (skips local terminal sessions).

## `/qa` skill (`.claude/skills/qa/`)
One command to QA the app: boots it in demo mode and clicks through every screen
as supervisor, manager, and DSP, capturing runtime errors + screenshots. Backed
by `web/e2e/qa-sweep.mjs`. Just say `/qa`.

## CI (`.github/workflows/`)
- `ci.yml` — builds the app + runs `web/e2e/smoke.test.mjs` on every PR.
- `codeql.yml` — security scanning.
- Dependabot (`.github/dependabot.yml`) — weekly dependency update PRs.

## Browser MCP (optional — terminal/desktop Claude Code only)
For real-time browser control when using the **desktop/terminal** app (it can't
run in web sessions — no local browser), add Playwright MCP once:

```bash
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

Then ask things like: "use playwright to open localhost:5173, log in, and report
any console errors." Not committed to the repo on purpose, so it doesn't throw
connection errors in web sessions.
