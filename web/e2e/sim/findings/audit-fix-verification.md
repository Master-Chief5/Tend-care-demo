# VERIFICATION RESULT — audit-fix batch `c0942a7`

Synthesis of 3 independent verification passes, reconciled against the real code
(diff + surrounding wiring in shells, `db.js`, `demoStore.js`, HouseDetail sections).
All three reports converge; disagreements were resolved by reading the code directly.

---

## Regressions/bugs introduced (must-fix, ranked, with file:line)

1. **[HIGH] Appointment/Transport care priorities deep-link to a section that no
   longer contains appointments.**
   `web/src/screens/CareHub.jsx:246` — appt/drive priority cards do
   `onClick: open(h.id, 'health')`. But the same commit split Appointments out of
   Health: `web/src/screens/HouseDetail.jsx:428-429` now renders `section==='health'`
   → `<HealthLogs>` only, and `section==='appts'` → `<Appointments>`. Tapping
   "Upcoming appointment" / "Transport scheduled" lands on Vitals/Logs with no
   appointment on screen. Two agents edited sibling files and didn't reconcile.
   Affects **mobile and desktop** Care hub. **Fix:** `open(h.id, 'appts')` for
   `kind==='appt'`; `'drive'` has no matching house-section (arguably drop its
   deep-link or point at `appts` too). Confirmed by all 3 reports; clearest
   regression the batch introduced.

2. **[MEDIUM] Home "Incidents & alerts" glance tile fires the blank new-incident
   form instead of the review list it advertises.**
   `web/src/screens/Home.jsx:374` — the tile whose sub-label reads
   `"N needs review"` now has `onClick={reportIncident}`, which routes (via
   `MobileShell.jsx:78` → `openHouseSection(slug,'compliance',true)` →
   `Compliance.jsx:304`) to an **empty report editor**. A tile labeled "N need
   review" should open the incidents list (old behavior `onNavigate('activity')`),
   not a new-report form. The separate "Log incident" quick-action (Home.jsx:~430)
   correctly maps here; only the glance tile is mismatched. Intent regression.

3. **[MEDIUM] Desktop schedule LATE badge is now dead code — can never render.**
   `web/src/screens/desktop/Schedule.jsx:135-136` gates the chip on
   `shift.clockInHour ?? shift.arrivedHour`. Grep confirms **neither field is set
   anywhere** in the codebase (only read at these two lines). So `lateMin` is always
   `null` and the block-level LATE badge is permanently invisible, while the day
   header still counts `status==='late'` shifts ("· N late"). Header can say "2 late"
   with zero blocks marked. The old hardcoded `LATE · 12m` was fake; this replacement
   is inert. (Note: no path in `db.js`/`demoStore.js` ever writes `status:'late'`
   either, except a static `constants.js` seed row — "late" is near-phantom
   end-to-end.)

4. **[MEDIUM] Manager Care hub is scoped on mobile but not desktop.**
   `MobileShell.jsx:80` passes `scopeHouseId={role==='manager' ? staffHouseUuid : undefined}`;
   `DesktopShell.jsx:96` renders `<ScreenA_CareHub …>` with **no `scopeHouseId`**.
   A manager sees only their house on phone but all houses on desktop.

5. **[LOW] Supervisor's mobile "Log incident" silently targets the first house.**
   `web/src/components/layout/MobileShell.jsx:78` — `onReportIncident` uses
   `staffHouseSlug || houses[0]?.id`. A supervisor has no `houseSlug`, so it always
   opens `houses[0]`'s compliance report with no house chooser — files an incident
   against an arbitrary house.

6. **[LOW/MEDIUM] `initialSection` honored only on first mount; re-deep-linking an
   already-open HouseDetail keeps the stale section.**
   `web/src/screens/HouseDetail.jsx:289-291` sets `section` via a `useState`
   initializer with no syncing effect; both shells render HouseDetail with **no
   `key`** (`DesktopShell.jsx:359`, `MobileShell.jsx:359`). Open a CareHub priority
   (mounts at e.g. `meds`), then without closing tap a NotificationBell "compliance"
   deep-link → the object updates but `section` stays frozen at `meds`. Same when
   switching houses while open. Fresh opens (common path) work. **Fix:** sync via
   effect, or key the modal by `id+section`.

---

## Half-fixes to finish

- **Overdue-task count resolves to 0 in real (non-demo) mode.**
  `CareHub.jsx:163` computes `houseScope = houses.find(h => h._uuid === scopeHouseId)?.id`
  (a **slug**) and passes it to `countOverdueQuickTasks(orgId,{houseId})`, whose real
  branch filters `house_id.eq.<slug>` against a uuid column (`db.js:~2768`). Mismatch
  → 0 for any scoped manager/DSP. Inherited convention (mirrors `Home.jsx:213`), now
  duplicated into CareHub priorities. Confirm whether `createQuickTask` stores slug or
  uuid and standardize.

- **Desktop dashboard "Log incident" not wired.** The `onReportIncident` fix lives in
  `ScreenA_Home` (mobile). `DesktopShell.jsx:93` renders `PageTodayDesktop` with **no
  `onReportIncident`** prop, so the desktop affordance still doesn't reach the report
  form. Audit item only half-covered.

- **Swap-flagged shift with no live request = silent dead-click.** Desktop
  `Schedule.jsx onShiftClick` routes `status==='swap'` to the approve card instead of
  the edit modal, but `SwapRequestsBanner` returns `null` when `swaps.length===0`. If
  a shift stays flagged `swap` after its request is resolved (data drift), the click
  opens neither card nor edit modal. Same class on mobile `ScheduleDay.jsx`
  `ScheduleStatusBar` (chip hidden when `swaps=[]`). Guarded against crash; just inert.

- **ErrorBoundary is app-level only.** `main.jsx` wraps `<App/>`; the finding also
  asked for per-screen boundaries so one screen's crash doesn't blank the whole app.
  Partial.

- **Priorities badge vs. list cap.** `priorities.length` drives the "N open" badge but
  the list is `slice(0,6)` with no "show more" — badge can read "9 open" while 6 cards
  render (`CareHub.jsx`).

- **Label/order standardization is one-sided.** HouseDetail got the Appointments pill,
  "Compliance"→"Incidents" rename, and pill reorder, but ResidentProfile still uses
  the old labels/order — cross-surface consistency item remains open.

---

## Confirmed working

- **NotificationBell deep-links.** `onOpen(it)` fires on tap; both shells read
  `n.link`. Only two producers exist in `db.js` (`link:'schedule'` L199,
  `link:'compliance'` L1376) and both shells handle exactly those — no orphan values.
- **Mobile Home "Log incident" quick-action** → `openHouseSection(slug,'compliance',true)`
  → `Compliance.jsx:304` auto-opens the report; not role-gated, so DSPs can file.
- **CareHub priorities** derived from real `fetchHouseAlerts` + `countOverdueQuickTasks`
  (incident → med → overdue → appt/drive), with loading/empty ("All caught up") states;
  incident tile badge from real `incidentCount`. Hardcoded 4-card block removed.
- **Desktop Care tiles now live** — `DesktopShell` passes `onOpenHouseSection`
  (`:94/:347`); unscoped tiles greyed + focus the house-picker.
- **MedPass** sticky record (`if (d.status===status) return`) + "Change ▾" per-status
  menu and Undo; backdrop closes. Double-tap no longer silently un-records.
- **HouseDetail resident actions** in `⋯` overflow with two-step remove confirm; old
  one-tap Remove deleted.
- **DailyLog** per-row edit/delete dropdown; **Goals** delete confirm + toast
  (role-gated `canEdit`); dropdown outside-click/teardown correct in DailyLog, Goals,
  desktop account menu.
- **Desktop swap block → approve routing** (`onShiftClick` intercepts `status==='swap'`;
  `cardRefs` keyed by `sw.shiftId` = `shift_id` = `s.id`) — join key verified.
- **Compliance role-awareness** — DSPs see a status line instead of ungated
  supervisor buttons (no dead-end).
- **Forgot-password** (`resetPassword` → `resetPasswordForEmail`) and **manager signup**
  (`staffRole` → `user_metadata.role` through the same `registerAsStaff` path).
- **Grouped "More", desktop account dropdown, "Residents"→"Houses" rail label, distinct
  icons** (`IconFlag/IconLeaf/IconChev/IconKey`), **ErrorBoundary + main.jsx wiring** —
  all present and correct.

---

## Remaining audit backlog (not attempted this round)

- **[HIGH] Desktop Compliance "Mark reviewed" can close a reportable/not-notified
  incident without the required agency notification** — `Pages.jsx PageComplianceDesktop`
  untouched; only the per-house DSP display in `Compliance.jsx` changed.
- **Two task systems** surfaced as "tasks" (`Employee.jsx` / `Tasks.jsx`) — untouched.
- **House-manager two sources of truth** (`managerName` vs staff record,
  `HouseSetup.jsx` / `Pages.jsx`) — untouched.
- **Resident opens two different screens** (ResidentModal vs ResidentProfile) — routing
  unchanged; only the modal's action menu changed.
- **Org → Orientation permanent placeholder** (`PageOrientationDesktop`) — icon-only
  touch; still a placeholder.
- **DSP schedule self-service** (claim / give-up / swap) — only *manager* swap-approve
  routing added on desktop; DSP `claimShift`/`createSwapRequest`/give-up path still
  phone-only.
- **HouseDetail/Care lack a wide desktop layout** — still rendered in a 420px modal
  with horizontally-scrolling pills (`DesktopShell.jsx:359`).
- **Broader Med/Low backlog:** ResidentProfile label/order parity, global search, dead
  code (`TabBar` / legacy root files), timesheet approve/undo, CSV export, and the
  remaining Sections A–F items.

---

### Recommended fix order
1. CareHub appt/drive → `appts` (Bug 1) — one-line, load-bearing, hits both platforms.
2. Home glance tile → incidents list, not blank report (Bug 2).
3. Desktop CareHub `scopeHouseId` parity (Bug 4) + desktop `onReportIncident` half-fix.
4. Kill or feed the dead LATE chip (Bug 3).
5. Overdue-count slug/uuid mismatch (also fixes the pre-existing Home instance).
6. Supervisor incident house-picker (Bug 5) + `initialSection` re-sync (Bug 6).
