# Tend Redesign — Phase 1 Implementation Plan

Approved cohesive "Hearth" redesign. Keep the warm look (cream surfaces, Newsreader
serif, per-house accents). This is NOT a Connecteam reskin. The plan below is
sequenced in dependency order; every step is independently shippable and must leave
the app **building and passing a multi-role QA sweep** (supervisor / manager / staff,
mobile + desktop, demo + Supabase). After each step: `cd web && npm run build`, then
run the `qa` skill (boots demo mode, clicks every screen as all three roles).

Guiding constraints (do not violate):
- Tokens live ONLY in `web/src/styles/globals.css :root`. No second `:root`.
- The dual backend (demo store + Supabase) routes through `web/src/lib/db.js`. Read
  data via existing `db.js` exports only — never query Supabase or the demo store
  directly from a screen.
- All ~24 nav modules must remain reachable after every step.
- Role source of truth: `user.role ?? user.id`. Personas in `data/constants.js`.

---

## Step 0 — Baseline (no code change)
Run `cd web && npm run build` and the `qa` skill once on the current branch to capture
a green baseline + screenshots. Every later step is diffed against this.

---

## Step 1 — TOKENS (port shell.css refinements into globals.css)

**Files:** `web/src/styles/globals.css` (only).

**Changes — all inside the single `:root` (lines 5–26):**
1. **CHANGE** `--a-ink3: #807766` → `#6b6253` (WCAG AA fix for muted/caption/label
   text). This is the only *visual* change in this step; it darkens muted text app-wide.
2. **ADD** (purely additive — nothing reads them yet, so zero risk):
   - `--a-clay-text: #9c4222` (AA-safe clay text shade).
   - `--house-ash: #4a6cc7;` and `--house: var(--a-sage);` (themeable per-container accent).
   - Status tint pairs: `--status-good-bg #dee6df / -tc #3f604d / -bd #9fc0ab`;
     `--status-warn-bg #f5e9d6 / -tc #8a5e0f / -bd #e6c98f`;
     `--status-bad-bg #fadcd7 / -tc #a93a25 / -bd #e0b4ab`;
     `--status-info-bg #ebe2cf / -tc #4a4438`.
   - Font vars: `--font-sans`, `--font-serif`, `--font-mono` (match the hardcoded
     inline families already in use; token-izing call sites is OPTIONAL and deferred).
   - Type scale `--fs-12 … --fs-34`; line-heights `--lh-tight/snug/body`; `--ls-caps 0.08em`.
   - Spacing `--sp-2 … --sp-32`; radii `--r-badge/input/btn/card/pill`;
     borders `--bd-hair`, `--bd-accent-w`; shadows `--sh-none/soft/pop/nav`; `--focus`.

   The Google Fonts `@import` (globals.css:3) already matches shell.css — no change.

**Do NOT** in this step: rename `.tab-bar`/`.web-tab-bar`, touch `.phone-screen`,
or change any existing rule body. Tokens only.

**Verify:** build; QA sweep with screenshot diff focused on muted text legibility
(captions, `.row-sub`, nav labels, inactive tabs, the clay error text at App.jsx:107/116).
Confirm no contrast regressions and nothing turned invisible. **Low risk** (one hex
change + additive vars).

---

## Step 2 — APP SHELL + SHARED SCREEN TEMPLATE (scaffolding only)

There is no shared per-screen wrapper today (each screen draws its own header). We do
NOT retrofit 24 screens now. Instead create the shared primitives the later steps need.

**New files:**
- `web/src/components/ui/ScreenHeader.jsx` — presentational appbar matching shell.css
  `.appbar` (`.appbar-title` fs-17/600, `.appbar-sub` fs-12/ink3, `.appbar-actions`).
  Props: `title, sub, actions`. Reserves right pad via `--chip-clear` (the live
  PREVIEW AS chip). Opt-in — existing screens keep their own headers untouched.
- `web/src/components/ui/SectionHeader.jsx` — `.section-header` + `.section-label`
  (fs-12/600/uppercase/ls-caps/ink3) + optional `.section-action` (clay-text).
- Add the shell.css component CSS classes (`.appbar*`, `.section-*`, `.glance*`,
  `.prio*`, `.house-row/.house-dot`, `.qa*`, `.nav-group*`, `.nav-item`, `.mod*`,
  `.area-row`, `.kv`, `.tab-bar` 5-tab variant) into `globals.css` AFTER the existing
  rules, scoped enough not to collide. **Reconcile the `.tab-bar` collision now**
  (research flags it): the legacy `.tab-bar` (globals.css:91–104) is already hidden in
  both shells; replace its body with the shell.css absolute 5-col floating bar OR keep
  it hidden and introduce the redesign bar under a new class used only by the new mobile
  shell in Step 3. Recommended: keep `.web-tab-bar` as the live class, restyle it to the
  shell.css `.tab` look (sage active, fs-12, icon 24) — avoids the absolute-positioning
  + `padding-bottom:84px` rework on `.phone-screen`.

**Verify:** build; the new components are imported nowhere yet, so QA must be byte-identical
to Step 1. **Low risk** (additive). If CSS additions leak into existing screens, the QA
screenshot diff will catch it.

---

## Step 3 — MOBILE NAV 10 → 5 (Home · Schedule · Care · Time · More)

**File:** `web/src/components/layout/MobileShell.jsx` (tab arrays :203–225, `MoreMenu`
:90–125, `pickScreen` :43–87, tab render :256–263).

**New 5-tab arrays (replace both 10-tab arrays):**

| Tab | Label | Icon | supervisor/manager `tab` id | staff `tab` id |
|-----|-------|------|------------------------------|----------------|
| 1 | Home | IconHome | `home` | `home` |
| 2 | Schedule | IconCal | `sched` | `sched` |
| 3 | Care | IconHeart | `care` (new hub, Step 6) → until then `home`-Houses or `house` | `house` |
| 4 | Time | IconClock | `time` | `time` |
| 5 | More | IconDots | `more` | `more` |

**Mapping every current module into 5 + More overflow** (nothing lost):

*supervisor/manager* — previously top-level: Houses, Schedule, Time, Activity, Updates,
Team, Transport, Supplies, More, Me.
- Home → dashboard (Step 4). Schedule → `sched`. Care → hub (Step 6). Time → `time`.
- Move into More: Activity, Updates, Team chat, Transport, Supplies, Me, **plus** the
  existing 7 (Handbook, Events, Forms, Surveys, Tasks, Directory, Help Desk). Also
  surface Houses, House setup (supervisor), Staff (supervisor), Activity, Compliance via More.

*staff* — previously: My Day, Care, Schedule, Time, Updates, Team, Transport, Supplies,
More, Me.
- Home → My Day (`ScreenA_MyDay`). Schedule → `sched`. Care → `house`
  (`ScreenA_HouseDetail` for `user.houseSlug`). Time → `time`.
- Move into More: Updates, Team, Transport, Supplies, Me, + existing 7.

**Edit `MoreMenu`** (:90–99): expand `items[]` to include every demoted module
(Activity/Updates/Team/Transport/Supplies/Me + role-gated Houses/Staff/Setup/Compliance),
each with its icon and `onNavigate(id)`. Keep role-gating: build `items` from `role`.
`pickScreen` already handles all these `tab` ids — only `care`/dashboard need new arms
(Steps 4 & 6). Until Step 6 lands, point Care: staff→`house`, supervisor/manager→Houses
list (temporary) so the tab is never dead.

**Tab render (:256–263):** drop the inline `gridTemplateColumns: repeat(tabs.length)`
override so it's a fixed 5-col bar (or set `repeat(5,1fr)`). Add `aria-current="page"`
on the active tab and `aria-label` per button.

**Verify:** build; QA all three roles — confirm **every** old module is reachable (5 tabs
+ More), active-tab highlighting works, role switch (`handleRoleChange`) resets to Home.
**MEDIUM risk** — this is reachability-critical. The QA checklist must explicitly open
each More item per role.

---

## Step 4 — MOBILE HOME DASHBOARD (supervisor/manager)

Replace the raw Houses-list landing with the `01-home.html` dashboard. Staff Home stays
`ScreenA_MyDay` (unchanged).

**New file:** `web/src/screens/Home.jsx` exporting `ScreenA_Home`.

**Wire to real data via `db.js` only** (no direct store access):
- Greeting: `user.name`; date from `new Date()`.
- Houses + counts: `houses` prop (already normalized in shell) + `fetchHouseAlerts(orgId)`
  for per-house status (good / needs-you), `fetchResidents` counts.
- At-a-glance 2×2: open shifts `countOpenShifts(orgId)`; residents needing attention
  (derive from `fetchHouseAlerts` / `fetchMedAlerts`); incidents `fetchIncidents` (count
  unreviewed); staff on today `fetchClockedInNow(orgId)` + `countOpenShifts`.
- Today's care priorities: compose from `countOpenShifts`, `fetchIncidents` (needs review),
  `fetchShiftDocProgress` / `fetchMedPass` (med pass), `fetchDrills` (drill due).
- Quick actions: Fill shift → `switchTab('sched')`; Log incident → incidents flow;
  Message → `switchTab('team')`; Post update → `switchTab('updates')`.

Use `ScreenHeader`/`SectionHeader` + the `.glance*`/`.prio*`/`.house-row`/`.qa*` classes
from Step 2. Theme each house row via inline `--house` (seeded hexes: Maple #4a6b56,
Oak #b05c3c, Birch #5a7a9a). Loading state: skeleton/empty until async resolves —
never crash on empty arrays. Reuse the shell's `effUser` for orgId/houseSlug.

**Edit:** `MobileShell.jsx pickScreen` supervisor/manager `case 'home'` (:66) →
`<ScreenA_Home … />` (pass `houses`, `switchTab`, `onHouseClick`). Keep `onHouseClick`
wired so house rows still open `ScreenA_HouseDetail`.

**Verify:** build; QA supervisor + manager Home renders with live demo numbers, every
priority/house/quick-action navigates correctly, no console errors on first paint
(async race). Staff Home unchanged. **MEDIUM risk** — new async data composition; guard
all `db.js` calls with empty-array/undefined fallbacks.

---

## Step 5 — GROUPED DESKTOP SIDEBAR (Overview / Care / Org)

**File:** `web/src/components/layout/DesktopShell.jsx` (`ALL_TABS` :43–66, `DesktopRail`
:94–150, `DesktopPage` switch :68–92, badge counts :226).

**Restructure `DesktopRail` flat list → 3 labelled `.nav-group`s** (keep badges, keep
branches footer + sign-out user card). Group definitions (role-filtered):
- **Overview:** Home (`today`/`myday`), Schedule (`schedule`, badge openShifts), Time (`timeclock`).
- **Care:** Residents (`houses` → or new `care` hub Step 6), Meds, Health, Incidents
  (badge), Documents. NOTE these IA labels (Residents/Meds/Health/Incidents/Documents)
  don't all map 1:1 to current `ALL_TABS`. **Phase 1 minimum:** relabel/regroup existing
  tabs (`houses`→Residents, `compliance`/incidents surfaced, `knowledge`/forms→Documents)
  WITHOUT inventing new screens. New dedicated Meds/Health/Incidents pages are **Phase 2**.
- **Org:** Staff (`staff`), Houses (`houses` or `setup`), Settings (`setup`/role admin).
  Demote Activity, Updates, Events, Surveys, Tasks, Directory, Help Desk, Transport,
  Resources, Team, Orientation into the appropriate group or an "Org/More" tail — none
  may disappear from the rail for a role that currently sees them.

Implement as `NAV_GROUPS = [{ label, items: [tabIds] }]`, filter each item by role,
hide a group if it ends up empty for the role. Active item: shell.css `.nav-item.is-active`
(inset 3px sage rail + ink + 600 + sage icon). Keep `counts` plumbing from :226.

**Do NOT** change `DesktopPage` routing targets in this step (same screens, new grouping/
labels only) — keeps it low-risk and reversible.

**Verify:** build; QA all three desktop roles — every module a role previously had in the
flat rail is still clickable and lands on the same screen; badges still show; branches
footer + sign-out intact. **MEDIUM risk** — easy to drop a role's module during regrouping.
QA must diff "modules visible per role" before/after.

---

## Step 6 — CARE HUB (promote Care to a top-level destination)

**New files:**
- `web/src/screens/CareHub.jsx` exporting `ScreenA_CareHub` (`03-care-hub` frame 1):
  appbar, Today's Care Priorities, "Go to" module grid (Meds/Goals/Health/Incidents/
  Notes/Documents — these `.mod` cards deep-link into EXISTING screens/panels, e.g.
  HealthLogs, Goals, MedPass, Incidents, ShiftDocPanel/Notes, Knowledge/Documents),
  and a Residents list (`fetchResidents` across houses, house-colored avatars + care-area
  status dots).
- `web/src/screens/ResidentProfile.jsx` exporting `ScreenA_ResidentProfile` (frame 2):
  identity header themed via `--house`, flag pills, section chip-row, open-priority banner,
  Key Info `<dl class="kv">` (from `fetchResidents` + behavior plans/allergies), Care Areas
  rows (deep-link to existing panels), `.btn--house` "Document this shift" → ShiftDocPanel.

**Wire (db.js only):** `fetchResidents`, `fetchHouseAlerts`, `fetchIncidents`,
`fetchMedAlerts`, `fetchBehaviorPlans`, `fetchGoals`, `fetchHealthLogs`,
`fetchShiftDocProgress`. Care-area status dots derive from those.

**Edit shells:**
- `MobileShell.jsx`: `pickScreen` `case 'care'` (and staff path) → `<ScreenA_CareHub … />`;
  resident tap → `ScreenA_ResidentProfile` (route via local state like `houseDetail`,
  e.g. add a `residentDetail` state, mirroring :238–240). Care tab now points to the hub
  (replaces the Step 3 temporary mapping).
- `DesktopShell.jsx`: Care group "Residents" → CareHub page; keep deep-links working.

**Verify:** build; QA Care hub as all roles, open a resident profile, confirm every "Go to"
module and Care-area row lands on its existing screen (no dead links), back navigation
returns to the hub, staff sees only their house's residents. **HIGHEST risk after Step 3** —
new screens + new nav state + many deep-links into legacy panels that expect specific props.
QA must click every module tile and every care-area row per role.

---

## Step 7 — EMOJI → LINE-ICONS + MODAL A11Y

Two cross-cutting passes. Can be folded incrementally into earlier steps or shipped last;
recommended last so it sweeps the new Step 4/6 screens too.

**7a — Add missing icons:** in `web/src/components/icons/index.jsx` add `IconX` (close),
`IconPrinter`, `IconDownload`, `IconAlert` (warning triangle), `IconPin`. Existing
IconEye/IconCheck/IconStar/IconUp/IconDown/IconChev cover the rest.

**7b — Functional glyph sweep** (load-bearing only; decorative hero/empty-state emoji
deferred): close buttons `×`/`✕` → `IconX` + `aria-label="Close"` across
StaffFormModal, Events, Directory, Knowledge, Updates, Forms, Tasks, Surveys (×2),
HouseDetail; print/export 🖨/⬇ → IconPrinter/IconDownload (ProgressPanel, ShiftDocPanel);
status ✓ → IconCheck; 👁 → IconEye; live ● → small SVG/IconActivity; ★/🥇🥈🥉 →
IconStar/numbered badges; functional ⚠ → IconAlert/IconFlag; 📍 → IconPin; ⏱ → IconClock.
Leave decorative empty-state emoji and data-driven category emoji (HealthLogs, Activity
map) for a later polish pass.

**7c — Shared Modal primitive:** create `web/src/components/ui/Modal.jsx` (and/or `Sheet`)
based on the StaffFormModal shape (has the `centered` variant). Provides: `role="dialog"`,
`aria-modal="true"`, `aria-labelledby` (title id), Escape-to-close, focus trap + initial
focus, focus-return to trigger on close, body scroll lock, overlay click-to-close,
`aria-label="Close"` on the X. Mount/escape-wire at the shell level (`MobileShell.jsx` /
`DesktopShell.jsx`) since there's no shared screen wrapper. Then retrofit the ~17 hand-rolled
modals (StaffFormModal, ResidentModal, ShiftModal mobile+desktop, ClaimSheet, TripModal,
VehicleModal, AddTaskModal, AddItemModal, FollowUpSheet, LogSheet, BoughtSheet, MedPass ×2,
Behavior, Goals, MapPicker) to use it — one at a time, each its own commit + QA.

**Verify:** build; QA + manual keyboard pass (Tab/Shift-Tab trapped, Esc closes, focus
returns) on each retrofitted modal. **Risk: LOW per glyph, MEDIUM for the Modal retrofit**
(behavior change to 17 call sites) — that's why each modal is converted individually.

---

## Riskiest step
**Step 6 (Care Hub + Resident Profile)** is the single riskiest item: it adds two brand-new
screens, introduces new mobile nav state (resident drill-in), and deep-links into ~6 legacy
panels that each expect specific props and a house/resident context — the highest surface
area for broken links, prop mismatches, and role-scoping bugs (staff must see only their
house). **Step 3 (10→5 nav)** is the runner-up because a single mapping miss silently hides
a whole module. Both demand an explicit "click every entry per role" QA pass, not just a
render check.

---

## Phase 2 (explicitly out of scope for Phase 1)
- Full Connecteam-style **week-grid scheduler** (the redesign's week calendar). Phase 1
  keeps the existing day/schedule screens.
- Dedicated **Meds / Health / Incidents** standalone pages for the desktop Care group
  (Phase 1 regroups/relabels existing screens; new screens are Phase 2).
- Token-izing every hardcoded inline font/color/spacing call site to the new scale vars.
- Decorative emoji removal (hero empty-states, data-driven category emoji).
- Migrating the absolute floating `.tab-bar` + `.phone-screen padding-bottom:84px` layout
  if Step 2 chose to keep the in-flow `.web-tab-bar`.
