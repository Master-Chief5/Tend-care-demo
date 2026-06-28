# Tend — Next Fix Batch (Loop Iter 3 Synthesized Plan)

Synthesis of this cycle's two inputs: (1) an adversarial correctness review of `fad11a6` — the cycle-4 care fixes + the new notification backbone — traced against the RLS helpers, the demo store, and the real-vs-demo code paths; (2) a QA sim of *untouched* surfaces (Driving/mileage, vehicles, houses, people, updates) plus the standing CareSoft feature gaps.

Prior plan: `loop-iter2-plan.md`.

**Shipped in cycle 4:** iter2 **P0-A** (HealthLogs delete UI gate), **P0-D** (Funds overdraw guard), **P0-E** (Tasks due-today end-of-day), **P0-F** (TimeOff end≥start), and the **notification backbone data layer** (`notifications.sql` + `db.js`/`demoStore.js` wiring — the iter-1 P1-9 primitive). The inbox UI and the production `notifications` table are **still pending**.

Critical theme this cycle: **cycle-4 fixes are half-landed.** Three of the four "shipped" P0s were patched at the UI layer only while the data layer still allows the bad state, and the notification backbone — the marquee feature — *never fires in demo mode*, which is the deployed surface. These review regressions outrank net-new work.

Tags: Value/Effort = High/Med/Low. **[NEW]** = surfaced this cycle. **[CARRY]** = still-open from iter2 (not addressed in cycle 4). **[REGRESSION]** = a hole inside a cycle-4 "fix."

---

## P0 — Safety / correctness / parity

### P0-1. HealthLogs delete is still DB-open — DSP can destroy clinical records **[NEW][REGRESSION]** — HIGH
- **What:** Cycle-4 P0-A only hid the button (`canEdit` in `HealthLogs.jsx`). The enforcement is missing: `add_idd_documentation.sql:68` is `health_logs_delete ... using (org_id = auth_org_id())` — **any** org member passes. `deleteHealthLog(id)` is unchanged and reachable, so a DSP can still permanently delete a seizure/vitals/BM record (reportable, retained data). The P0-A hole is open at the layer that matters.
- **Fix:** Add the role check to the delete policy: `... using (org_id = auth_org_id() and auth_staff_role() in ('supervisor','manager'))`. Keep the UI gate. Consider soft-delete for regulatory rows. Requires a prod migration (see P0-9).
- **File:** `web/supabase/add_idd_documentation.sql:68`; `web/src/components/HealthLogs.jsx`; `web/src/lib/db.js` (`deleteHealthLog`).
- **Value/Effort:** High/Low.

### P0-2. Notifications never fire in demo mode — the deployed site still lies **[NEW][REGRESSION]** — HIGH
- **What:** Both event wirings sit *after* the demo early-return. `db.js:182` `createSwapRequest` → `if (isDemoMode) return demo.demoCreateSwapRequest(req)` returns before the `createNotification` at :195. `db.js:1319` `addIncident` → demo return before the `createNotification` at :1334. So `demoCreateNotification` is dead code, `store.notifications` is never populated, and since the live site runs in demo mode (MEMORY), "manager notified" is still false *exactly where it's demoed* and the upcoming inbox will be permanently empty.
- **Fix:** Raise the notification *inside* the demo paths too — either call `demoCreateNotification` from `demoCreateSwapRequest`/`demoAddIncident`, or restructure so `createNotification` runs before/independent of the demo branch. This is the gate on the inbox UI (P1-1) being demoable at all.
- **File:** `web/src/lib/db.js` (181-200, 1318-1340); `web/src/lib/demoStore.js` (`demoCreateSwapRequest`, `demoAddIncident`, `demoCreateNotification`).
- **Value/Effort:** High/Low.

### P0-3. Notifications INSERT policy is spoofable by any DSP **[NEW]** — MED/HIGH
- **What:** `notifications.sql:44` — `notifications_insert ... with check (org_id = auth_org_id())`. Only `org_id` is bound. Any authenticated org member (a DSP) can insert a notification with arbitrary `recipient_staff_id`, `recipient_role`, `kind`, `title`, `body` — fabricate "Incident reported · reportable," a fake "Swap approved," or a message targeting a specific manager. No binding between inserter and event/recipient. (Answer to the backbone's design question: yes, anyone can spoof.)
- **Fix:** Tighten the check. Minimum: forbid a DSP from inserting `recipient_role in ('supervisor','manager')` unless they are that role / the event owner; ideally move notification creation server-side (SECURITY DEFINER RPC or trigger on `incidents`/`swap_requests`) so the client can't author arbitrary rows. Re-applies to prod with P0-9.
- **File:** `web/supabase/notifications.sql:43-45`.
- **Value/Effort:** High/Med.

### P0-4. Overdue badge vs. list now disagree — only one definition was fixed **[NEW][REGRESSION]** — MED
- **What:** Cycle-4 P0-E fixed `Tasks.jsx` `isOverdue` to end-of-day, but the badge counter was not updated. `db.js` `countOverdueQuickTasks` (`.lt('due_at', new Date().toISOString())`) and `demoStore.js` `demoCountOverdueQuickTasks` (`new Date(t.due_at).getTime() < nowMs`) still use raw `due_at < now`. A task due *today* is counted in the "Overdue" chip badge but is absent from the Overdue tab and unstyled in the row — number won't match the list.
- **Fix:** Apply the same end-of-day boundary in both count functions so badge and list share one definition. Best: extract a single `isOverdue(dueAt)` helper used by row, tab filter, and both counters.
- **File:** `web/src/screens/Tasks.jsx`; `web/src/lib/db.js` (`countOverdueQuickTasks`); `web/src/lib/demoStore.js` (`demoCountOverdueQuickTasks`).
- **Value/Effort:** Med/Low.

### P0-5. Notifications UPDATE policy drops house scoping → cross-house read tampering **[NEW]** — MED
- **What:** SELECT gates role-addressed rows by house (`auth_staff_role()='supervisor' or house_id is null or house_id = auth_house_id()`). The UPDATE `using` role branch (`notifications.sql:53`) omits the house clause entirely. So a DSP in house B can mark-read role-null rows scoped to house A they can't even SELECT. Worse, `markAllNotificationsRead` does `.eq('org_id', orgId).is('read_at', null)` with no house filter — one DSP marking-all-read clears unread state org-wide for every house.
- **Fix:** Mirror the SELECT house clause into the UPDATE `using`; scope `markAllNotificationsRead`/`markAllNotificationsRead` query to the caller's recipient set (own id, own role + house), not all-org. Mirror the same scoping into the demo path (P0-6).
- **File:** `web/supabase/notifications.sql:48-55`; `web/src/lib/db.js` (`markAllNotificationsRead`).
- **Value/Effort:** Med/Low.

### P0-6. Demo notification reads have zero recipient scoping **[NEW]** — MED/HIGH (parity)
- **What:** `demoStore.js` `demoFetchNotifications()` returns the first 30 of *all* org notifications; `demoCountUnreadNotifications()` counts *all* unread — neither takes the current user/role (there's no current-user param). Real RLS scopes by `recipient_staff_id`/`recipient_role`/house. So when the inbox lands in demo mode, every DSP sees manager-only `swap_request` notifications and can mark them read. No parity.
- **Fix:** Thread the current user/role into the demo notification reads and replicate the SELECT predicate (own id, or role-addressed within house / supervisor org-wide). Needed before the inbox UI (P1-1) demos correctly.
- **File:** `web/src/lib/demoStore.js` (`demoFetchNotifications`, `demoCountUnreadNotifications`, `demoMarkAllNotificationsRead`); callers in `db.js` to pass user context.
- **Value/Effort:** Med/Med.

### P0-7. Live trips log 0 miles — core mileage feature is broken **[NEW]** — HIGH
- **What:** `Driving.jsx:443` `endTrip(trip.id, {})` — start/end GPS are captured but distance is never computed; `miles` defaults to 0 (`db.js:674,714`). Every "Start trip" run contributes 0 to `PayPeriodCard` and reimbursement; only manually "Log past" trips have miles. The headline mileage/reimbursement feature silently produces zeros.
- **Fix:** Compute distance from the captured start/end (and ping) coords on `endTrip` (haversine over the breadcrumb trail, or at minimum straight-line start→end), write it to `miles`; let the user adjust before save. Mirror in `demoEndTrip`.
- **File:** `web/src/screens/Driving.jsx:443`; `web/src/lib/db.js` (`endTrip` ~711, `startTrip`/`pingTrip`); `web/src/lib/demoStore.js` (`demoEndTrip`).
- **Value/Effort:** High/Med.

### P0-8. Supervisor-created vehicle is orphaned (forced null house) **[NEW]** — MED
- **What:** `VehicleForm` has no house picker; `addVehicle` forces `user.houseId` (`Driving.jsx:480`), which is `null` for supervisors → the vehicle is created unassigned to any house and won't appear in any house-scoped fetch. Supervisors literally can't add a usable vehicle.
- **Fix:** Add a house picker to `VehicleForm` (default to the user's house when set, required for supervisors); pass the chosen `houseId` to `addVehicle`.
- **File:** `web/src/screens/Driving.jsx:480` (`VehicleForm`, `addVehicle`); `web/src/lib/db.js` (`addVehicle`).
- **Value/Effort:** Med/Low.

### P0-9. Apply the notification + health-logs migrations to production — MED
- **What:** `notifications.sql` is **not yet applied to prod** (its own header, project `ztatmhxvvthlevddqqdl`); `createNotification` no-ops on `relation does not exist`. The P0-1/P0-3/P0-5 RLS fixes also need a prod migration. Until applied, real-mode notifications are entirely inert — only demo mode (P0-2) shows anything.
- **Fix:** After P0-1/3/5 land in SQL, apply the migrations to prod (user authorization required per the file header). Bundle the health_logs delete-policy change so clinical-delete enforcement is live, not just authored.
- **File:** `web/supabase/notifications.sql`, `web/supabase/add_idd_documentation.sql`; prod project `ztatmhxvvthlevddqqdl`.
- **Value/Effort:** Med/Low (mostly authorization + apply).

### P0-10. Destructive actions lack confirms / orphan their children **[NEW]** — MED
- **What:** (a) **House delete** orphans residents/staff/vehicles in one tap with no count warning (`HouseSetup.jsx:147`, `db.js:948`). (b) **Remove staff** has no confirm (`People.jsx:172`). (c) Duplicate-email invites accepted with no uniqueness check (`inviteStaff`). Each is a one-tap data-loss or data-integrity foot-gun.
- **Fix:** Add `window.confirm` with a dependent-count summary to house delete and to remove-staff (match the Funds/Appointments confirm pattern); reject/warn on duplicate-email invite. Consider blocking house delete while it has assigned residents/staff.
- **File:** `web/src/screens/HouseSetup.jsx:147`; `web/src/screens/People.jsx:172`; `web/src/lib/db.js` (`deleteHouse` ~948, `inviteStaff`).
- **Value/Effort:** Med/Low.

### P0-11. Swap/incident notification recipient scoping is too narrow / too broad **[NEW]** — LOW/MED
- **What:** (a) `createSwapRequest` addresses `recipientRole:'manager'` + `houseId`; the SELECT house clause exempts only `'supervisor'` from the house match — an org-level/unassigned manager (`auth_house_id()` null) misses a house-scoped swap, and **supervisors never see swap-approval notifications at all** (likely wrong if supervisors also approve). (b) `addIncident` raises `recipientRole:null` + `houseId`, so *every* DSP in the house gets the reportable-incident notice — broader than need-to-know.
- **Fix:** Decide intended audiences: route swap approvals to supervisor+manager of the house; scope reportable incidents to leads (or confirm "house team" is intended and document it).
- **File:** `web/src/lib/db.js` (`createSwapRequest` ~195, `addIncident` ~1334); `web/supabase/notifications.sql` (SELECT predicate).
- **Value/Effort:** Low-Med/Low.

### P0-12. Carried-forward open correctness from iter2 (not addressed in cycle 4) **[CARRY]**
Still real, not shipped — fold into this batch:
- **P0-B — org-create race:** `applyPendingRegistration` inside `enrichUser` can fire `createOrgAndSupervisor` twice on the email-confirm load (`App.jsx` getSession + onAuthStateChange both run enrich; `seqRef` only gates `setUser`). Duplicate org / unique-slug strand. **High/Med.**
- **P0-C — supervisor timesheet approvals invisible to managers:** supervisor approval writes `house_id=null`; `fetchTimesheetApprovals` filters `if (houseId) .eq('house_id', houseId)` and drops it. Read by `org+staff+period` instead. **Med/Low.**
- **P0-G — swap badge/deny never fires in demo:** `demoCreateSwapRequest`/`demoResolveSwapRequest` don't set/clear shift `status:'swap'`. (Same demo-divergence class as P0-2.) **Med/Low.**
- **P0-H — desktop SwapRequestsBanner passes `houseSlug` to a uuid column** → Postgres rejects, manager sees zero swaps. Drop the slug fallback. **Low/Low.**
- **P0-I — LoginScreen stash missing `|| 'org-<rand>'` slug fallback** on the confirm-replay path. **Low/Low.**
- **P0-J — `timesheet_approvals` RLS `house_id=null` branch lets a manager write any org staff's approval.** Defense-in-depth. **Low-Med/Low.**
- **P0-K — build guardrail** (creds-less prod build = MisconfiguredScreen; not a bug, add CI warn). **Low/Low.**

### P0-13. Lower-severity review notes (fast cleanups) **[NEW]** — LOW
- **ResidentFunds overdraw is client-only** (`add()` doesn't re-validate; no DB check constraint) — the cycle-4 P0-D guard holds only through the UI. Add a server-side `balance >= 0` enforcement or check constraint. **Low/Low.**
- **`isOverdue` end-of-day is timezone-fragile:** `setHours(23,59,59,999)` is correct only when viewer TZ == creator TZ; cross-TZ viewing is off-by-a-day. Acceptable single-region; note the limit. **Low/Low.**
- **Vehicle "In use"/"serviced" status never fires:** status is odometer-only (`Driving.jsx:573`, `>50000 ? 'due'`), permanently "Service due," no link to active trips, no mark-serviced. **Low/Med.**
- **Reimbursement rate hardcoded** $0.67/mi (`Driving.jsx:269`) — not per-org/year configurable. **Low/Low.** (Pairs with P0-7 / P1-7.)
- **"Remind non-readers" is a silent no-op** (`Updates.jsx:129`) — button does nothing; wire to the notification primitive once P0-2/P0-9 land. **Low/Low.**
- **House `managerName` is free text** divorced from staff/manager records — two sources of truth (`HouseSetup`). Bind to a staff picker. **Low/Med.**

---

## P1 — High-value features

### P1-1. Notification inbox UI **[NEW]** — HIGH
- **What:** The backbone primitive exists (`fetch/count/markRead/markAll`) but there is no surface — no bell, no inbox, no unread badge. Without it the whole cycle-4 feature is invisible. **Gated on P0-2 (demo fires) and P0-6 (demo scoping) to be demoable, and P0-9 to be live in real mode.**
- **Fix:** Header bell with unread count (`countUnreadNotifications`), dropdown/inbox list (`fetchNotifications`) with per-item `markRead` and a scoped mark-all, deep-link via `notification.link`. Wire the existing producers (incident, swap) and the Updates "remind" no-op.
- **File:** new inbox component + header; `web/src/lib/db.js` (existing notification fns); `web/src/lib/demoStore.js`.
- **Value/Effort:** High/Med.

### P1-2. Mileage report / export (CSV + PDF) **[NEW]** — HIGH
- **What:** No export anywhere for mileage. Agencies need a per-DSP / per-period mileage + reimbursement report for payroll and audit. Cheapest, highest-leverage of the export gaps and a direct CareSoft parity item. **Depends on P0-7** (otherwise it exports zeros).
- **Fix:** Per-period mileage report from `trips` (date, staff, vehicle, start/end, miles, rate, reimbursement) with CSV download; PDF later.
- **File:** `web/src/screens/Driving.jsx` / new report view; `web/src/lib/db.js` (trips aggregate); shared CSV util.
- **Value/Effort:** High/Med.

### P1-3. Document storage (file upload) **[NEW]** — HIGH
- **What:** No file storage anywhere: certs are name+date only (no file), no resident face-sheets/ISP, no vehicle insurance/registration. A core CareSoft capability and an audit/compliance blocker.
- **Fix:** Supabase Storage bucket + `documents` table (owner type/id, kind, file ref, expiry); upload/preview on Staff certs, Resident profile, Vehicle. RLS-scope by org/house.
- **File:** new `documents.sql` + storage bucket; `People.jsx` (certs), resident profile, `Driving.jsx` (vehicle); `db.js` storage helpers.
- **Value/Effort:** High/High.

### P1-4. One-click state / EVV reports **[NEW]** — HIGH
- **What:** No one-click state or EVV report export. Medicaid/state billing requires EVV (electronic visit verification) and standardized state reports; their absence blocks real billing.
- **Fix:** EVV capture is largely present (clock punches + GPS geofence); add an EVV report/export (visit verification per shift: who/where/when, geofence pass) and a state-report template. CSV/PDF.
- **File:** new reports module; `db.js` (punch + geofence aggregate); ties to P1-2 export util.
- **Value/Effort:** High/High.

### P1-5. Billing / QuickBooks integration **[NEW]** — HIGH/HIGH
- **What:** No billing or accounting integration. Needed to turn shifts/visits into invoices and sync to QuickBooks — a top CareSoft differentiator but the largest effort.
- **Fix:** Phase it: (1) billable-hours report from approved timesheets (CSV) → (2) invoice model → (3) QuickBooks API sync. Land (1) on the P1-2/P1-4 export rail first.
- **File:** new billing module; `db.js`; QuickBooks OAuth (later phase).
- **Value/Effort:** High/High. (Largest item — sequence last.)

### P1-6. Appointment transport → trip generation **[NEW]** — MED
- **What:** An appointment's `transport_needed` doesn't generate a trip — the DSP must manually re-enter it in Driving, two sources of truth.
- **Fix:** When `transport_needed`, offer/auto-create a linked trip (resident, destination from appointment, date); back-link them.
- **File:** `web/src/components/Appointments.jsx`; `web/src/screens/Driving.jsx`; `db.js`.
- **Value/Effort:** Med/Low.

### P1-7. Broaden exports + configurable reimbursement rate **[NEW]** — MED
- **What:** Beyond mileage (P1-2), no CSV/PDF for timesheets or resident spend; reimbursement rate is hardcoded (P0-13). Generalize the export rail and surface an org/year rate setting.
- **Fix:** Reuse the P1-2 CSV util for Timesheets and ResidentFunds; add a per-org reimbursement-rate setting consumed by Driving + the mileage report.
- **File:** `Timesheets.jsx`, `ResidentFunds.jsx`, org settings; shared CSV util; `Driving.jsx:269`.
- **Value/Effort:** Med/Med.

### P1-8. Carried-forward care features from iter2 **[CARRY]**
Not shipped in cycle 4; still queued behind the above:
- **P1-A — approved time-off → schedule** (block/warn double-booking off DSPs in `ShiftModal`). **High/Med.**
- **P1-B — MedPass late/overdue dose cue.** **Med/Low.**
- **P1-C — PRN log view/undo + max-frequency guard.** **Med/Med.**
- **P1-D — Appointments missed/overdue state.** **Med/Low.**
- **P1-E — missed-dose/appointment reminders + escalation** — now unblocked by the notification backbone; depends on P0-2/P0-6/P0-9 and P1-B/P1-D computing "missed." **High/Med.**

---

## Suggested execution order
1. **Stop the half-landed bleed first:** P0-1 (clinical delete RLS), P0-2 (demo notifications fire), P0-4 (overdue badge), P0-7 (mileage = 0). Highest harm, mostly Low effort.
2. **Harden the new backbone:** P0-3 (spoofable insert), P0-5 (cross-house mark-read), P0-6 (demo scoping), then P0-9 (apply to prod). This unblocks a *trustworthy* inbox.
3. **Sweep cheap correctness:** P0-8 (orphaned vehicle), P0-10 (confirms/orphans), P0-11 (recipient scoping), P0-13 cleanups, and the iter2 carry-forwards P0-12 (P0-B org-race is High/Med — do early; the rest are one-liners).
4. **Feature rail — land the export/inbox spine:** P1-1 inbox UI (gated on step 2), then P1-2 mileage report (gated on P0-7), reusing one CSV util.
5. **Compliance + integrations:** P1-4 EVV/state reports, P1-3 document storage, P1-6 transport→trip, P1-7 broader exports, then P1-5 billing/QuickBooks last (largest).
6. **Care backlog:** P1-8 carry-forwards, finishing with P1-E missed-dose/appointment escalation once the backbone is live and "missed" states exist.
