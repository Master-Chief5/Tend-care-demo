#!/bin/bash
# SessionStart hook — makes Claude Code on the web sessions immediately
# test-ready by installing the web app's dependencies (the app lives in /web).
# Runs only in the remote (web) environment so it doesn't slow local sessions.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}/web" || { echo "web/ directory not found; skipping setup"; exit 0; }

# A Chromium is pre-provisioned in the web sandbox (/opt/pw-browsers) and CI
# installs its own, so skip Playwright's large browser download here.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

echo "Installing web dependencies (npm install)…"
npm install --no-audit --no-fund || echo "npm install reported issues — continuing so the session still starts"

echo "Web app is ready to build/test."
exit 0
