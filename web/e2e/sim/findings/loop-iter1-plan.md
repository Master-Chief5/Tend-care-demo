# Tend — Next Fix/Build Batch (Loop Iter 1 Synthesized Plan)

Synthesis of 3 QA role-walkthroughs (DSP / Manager / Supervisor) + the competitor/regulatory gap list, de-duplicated and ranked. Already-fixed items from this cycle (clock-IN error surfacing, HousePicker on self-signup, AssignHouseScreen for house-less users, incident/daily-log save-error surfacing) are excluded except where the fix is incomplete.

Tags: Value/Effort = High/Med/Low.

---

## P0 — Safety / correctness / broken flows

### P0-1. Clock-OUT silently fakes success (mirror of the clock-IN fix they just shipped)
- **What:** `doClockOut` wraps `await clockOut(...)` in `try{}catch{/*ignore*/}` and calls `setPunch(null)` regardless. `clockOut` returns `null` on RLS/network failure instead of throwing, so the card shows "clocked out" while the punch stays OPEN in `time_punches` → payroll disputes / lingering open punches.
- **Fix:** Treat `null`/error from `clockOut` as failure; keep the punch open, surface a real error toast, do NOT clear `punch`. Match the asymmetry that was already closed on clock-in.
- **File:** `web/src/.../ClockCard.jsx` (`doClockOut`), `web/src/lib/db.js` (`clockOut`).
- **Value/Effort:** High/Low.

### P0-2. Email-confirmation drops the org + house pick
- **What:** `SignUpForm.handleSubmit` only calls `registerAsStaff(...selectedHouse)` when `data.session` exists. With Supabase email-confirm ON there is no session at signup, so the org/home picked in HousePicker is discarded; user lands in `NeedsSetupScreen` and must re-search org + re-pick home.
- **Fix:** Persist the org/house selection (pending-registration row keyed by user id, or localStorage + re-apply on first authenticated load) and replay `registerAsStaff` after email confirmation / first session. 
- **File:** `web/src/.../LoginScreen.jsx` (`SignUpForm`), registration path in `db.js`.
- **Value/Effort:** High/Med.

### P0-3. Desktop manager cannot approve/deny swaps
- **What:** Approve/deny swap UI exists ONLY in mobile `ScheduleDay.jsx` (~835-856, via `fetchSwapRequests`/`resolveSwapRequest`). Desktop `Schedule.jsx` (primary daily-ops surface) renders only a static "SWAP REQ" badge (~156) with no handler. Managers on desktop literally can't action swaps.
- **Fix:** Wire `fetchSwapRequests`/`resolveSwapRequest` into `Schedule.jsx`; add an approve/deny control (with deny reason — see P1-7).
- **File:** `web/src/.../Schedule.jsx`.
- **Value/Effort:** High/Med.

### P0-4. "SWAP REQ" badge is dead — request never flips shift status
- **What:** `createSwapRequest` (`db.js:181`) inserts a swap-request row but never sets the shift's `status='swap'`. The badge in `Schedule.jsx:156` and `WeekGrid.jsx:50` keys off shift status, so it never lights up from a real request. Manager gets no at-a-glance signal and must hunt the mobile list.
- **Fix:** On `createSwapRequest`, set originating shift `status='swap'` (and clear it on resolve/deny). Verify badge reads from that status.
- **File:** `web/src/lib/db.js` (`createSwapRequest`, `resolveSwapRequest`), `Schedule.jsx`, `WeekGrid.jsx`.
- **Value/Effort:** High/Low.

### P0-5. TeamChat eats keystrokes (input blurs every char)
- **What:** `Composer`, `Thread`, `ChannelChips` are declared INSIDE `TeamChat` and rendered as `<Composer/>` (`TeamChat.jsx:131,142,160`). Each keystroke updates parent `text` state → `TeamChat` re-renders → child components are new identities → remount → `<input>` blurs. Effectively one char at a time, mobile + desktop.
- **Fix:** Hoist `Composer`/`Thread`/`ChannelChips` out of `TeamChat` (module scope) and pass props; or memoize/keep them stable. Keep `text` local to Composer if possible.
- **File:** `web/src/.../TeamChat.jsx`.
- **Value/Effort:** High/Low.

### P0-6. Timesheet approval is fake (no persistence / audit)
- **What:** `PeriodGrid`/`StaffSheetCard` track approval in local React state (`setApproved`, ~241) with no backend write. Supervisor payroll sign-off vanishes on refresh/tab-switch; no audit trail.
- **Fix:** Persist approval (status + approver id + timestamp) to a `timesheet_approvals`/period-lock table; load on mount; show approved-by/when. Pairs with pay-period lock (P1-6) and audit log (P1-8).
- **File:** `web/src/.../Timesheets.jsx`, `db.js`.
- **Value/Effort:** High/Med.

### P0-7. False "manager has been notified" claim
- **What:** `Compliance.jsx` success screen says "Your manager has been notified," but `addIncident` (`db.js`) only inserts a row — no notify/digest path exists. Same class of false-success the cycle just fixed elsewhere.
- **Fix:** Either build a real notification (insert a notification row / chat post / digest) OR change copy to truthful ("Incident recorded — pending manager review"). Tie to P1-9 escalation when built.
- **File:** `web/src/.../Compliance.jsx`, `db.js` (`addIncident`).
- **Value/Effort:** Med/Low.

### P0-8. New org has no residents → resident dropdowns vanish, records can't name a person
- **What:** Incident and daily-log resident pickers gate on `residents.length > 0`; a freshly created org has no residents, so the dropdown disappears and a record can't name the individual.
- **Fix:** Add a first-run "Add resident/individual" path (onboarding nudge or inline "add individual" in the picker). Block silent unnamed records.
- **File:** resident-loading gates in `Compliance.jsx` / `DailyLog.jsx`, resident CRUD in `db.js`.
- **Value/Effort:** Med/Med.

### P0-9. Dead instruction in reportable banner
- **What:** Reportable-incident banner tells the filer to "tap Manage," but Manage is `isSup`-gated — a DSP can't see/tap it.
- **Fix:** Role-aware copy/CTA: for non-sup show the actual next step (or auto-route to supervisor); only show "tap Manage" to sups.
- **File:** `web/src/.../Compliance.jsx`.
- **Value/Effort:** Low/Low.

---

## P1 — High-value features (incl. CareSoft/Therap gaps)

### P1-1. EVV: GPS/location stamp at clock-in/out + state-aggregator export
- **What:** Federal Cures Act mandate; states move to hard claim edits in 2026 → non-EVV visits denied. Tend already clocks in/out — add geolocation capture at punch + an export/bridge (CSV first, then Sandata/HHAeXchange/Therap API).
- **File:** `ClockCard.jsx` (capture), `db.js` (`time_punches` schema + lat/long), new export module.
- **Value/Effort:** High/High.

### P1-2. Medicaid claim generation (837P / CSV) from documented services + payroll CSV export
- **What:** Billing/claims entirely absent (no EVV→claim, no service-unit capture, no claim export). Close the care→revenue loop: generate 837P or at minimum a billable-services CSV from punches + authorized service notes. Also ship the missing payroll CSV (`IconDownload` is currently unused).
- **File:** new billing/export module; consumes `time_punches`, service notes, authorizations.
- **Value/Effort:** High/High.

### P1-3. Link daily-log / service notes to ISP goals + authorized service units
- **What:** Auditors require notes to prove service necessity + ISP progress; unlinked notes fail audits. Add a goal-picker + unit counter on the daily log.
- **File:** `DailyLog.jsx` (goal picker + unit field), `db.js` (link note→goal→authorization), ISP goal source.
- **Value/Effort:** High/Med.

### P1-4. Cert/training tracking with expiry alerts + block scheduling of expired staff
- **What:** Lapsed CPR/First Aid/med-cert = survey citations + unbillable shifts (Therap TMS is a core sell). Cert dashboard already flags expiries but sends no reminders and doesn't block scheduling.
- **Fix:** Add expiry reminder/notification; in `ShiftModal` block/warn assigning staff with expired required certs (extends existing leave/overlap/cert checks).
- **File:** cert dashboard, `ShiftModal`, `db.js`.
- **Value/Effort:** High/Med.

### P1-5. Med-error / missed-dose workflow + PRN follow-up + controlled-substance counts
- **What:** eMAR's compliance value is catching errors. Add refusal/error reason codes, missed-dose capture, PRN effectiveness follow-up prompts, and a narcotic shift-count log.
- **File:** eMAR components, `db.js` (med events + count log).
- **Value/Effort:** High/Med.

### P1-6. Structured incident → state GER/EOR report + reportable-deadline timer + escalation/investigation
- **What:** Reportable incidents have mandated timelines + investigation/closure workflow (Therap GER benchmark). Today: flat form + "Mark reviewed," "Agency not yet notified" with no countdown (`Compliance.jsx:364`). Add severity routing, notify/reporting-deadline countdown clock, investigation + closure tracking, state-submission status. One-click state report export.
- **File:** `Compliance.jsx` / `PageComplianceDesktop`, `db.js`.
- **Value/Effort:** High/Med.

### P1-7. Coverage/swap signaling: open-shift fill alert + swap deny reason
- **What:** `dropMyShift` flips a shift to open silently — nothing posts to chat or pings the manager; gaps are eyeball-only on the Coverage bar. `countPendingSwaps` (`db.js:229`) is never imported, so no nav badge tells the manager swaps wait. Swap denial has no reason field.
- **Fix:** On drop-to-open, post to chat / create notification. Import `countPendingSwaps` into a nav/badge. Add deny-reason text on `resolveSwapRequest`.
- **File:** `db.js` (`dropMyShift`, `countPendingSwaps`, `resolveSwapRequest`), nav, `Schedule.jsx`/`ScheduleDay.jsx`.
- **Value/Effort:** High/Med.

### P1-8. Audit / immutable activity log + retention export
- **What:** All auditable records (MAR, incidents, ISP, timesheet approvals) must be promptly producible and retained; who-changed-what is a survey expectation. Add append-only audit trail + retention export. Underpins P0-6 (approval audit) and P1-6.
- **File:** new `audit_log` table + write hooks in `db.js`, export view.
- **Value/Effort:** High/Med.

### P1-9. Real notification/digest backbone
- **What:** Multiple "notified" claims are fake (P0-7) and several alerts are missing (P1-4 cert, P1-7 coverage, P0-3 swaps). Build one notification primitive (table + in-app inbox/badge, optional email digest) that all of these write to.
- **File:** new notifications table + `db.js` helpers + nav inbox.
- **Value/Effort:** High/Med.

### P1-10. Overtime/hours guard at assignment + richer OT rules
- **What:** `ShiftModal` warns on leave/overlap/cert but never on weekly OT when assigning. `overtimeFor(totalWorked)` is weekly-only — no daily OT, holiday, or differential rules many states require.
- **File:** `ShiftModal` (assignment-time weekly-hours warning), overtime calc module.
- **Value/Effort:** Med/Med.

### P1-11. Role management: promote to supervisor + real manager linkage
- **What:** `StaffFormModal.jsx` role `<select>` (76-79) only offers DSP / House Manager — can't promote to supervisor or create a co-admin. `HouseSetup.jsx` `managerName` is decorative free text not linked to a staff record → two sources of truth, House card shows stale manager after reassignment.
- **Fix:** Add Supervisor role option; make house manager a FK to a staff record (picker), derive House card manager from it.
- **File:** `StaffFormModal.jsx`, `HouseSetup.jsx`, `db.js`.
- **Value/Effort:** Med/Med.

### P1-12. Reports / exports: eMAR adherence %, ISP goal progress, census/occupancy, per-house compliance attestation, mileage reimbursement
- **What:** No audit-ready reports or per-house drill-down export from Today/Compliance dashboards. Drives show `$0.67/mi` (`Pages.jsx:200`) but no mileage-reimbursement report. Add a reports surface with CSV/PDF export.
- **File:** new reports module; `Pages.jsx` (mileage rollup), Compliance/Today dashboards.
- **Value/Effort:** Med/Med.

### P1-13. Document storage + ISP print/email + interventions library
- **What (CareSoft gaps):** Document/file storage (consents, policies, ISP PDFs); one-click ISP print/email; a reusable interventions/strategies library to attach to behavior plans.
- **File:** new document store (Supabase storage) + ISP export + interventions reference data.
- **Value/Effort:** Med/Med.

### P1-14. Service authorization tracking with overage/expiry alerts
- **What:** Validate documentation against authorization limits and flag billing issues BEFORE claim submission (prevents denials/clawbacks). Feeds P1-2/P1-3.
- **File:** new authorizations table + checks in daily-log/billing.
- **Value/Effort:** Med/Med.

### P1-15. Make daily log a first-class, findable task
- **What:** My Day (`Employee.jsx`) has a prominent "Report incident" button but no equivalent for the shift's core task — logging. Today: Care → house → scroll 10 section pills to "Log" (`HouseDetail.jsx`).
- **Fix:** Add a primary "Daily log" action on My Day next to Report incident; deep-link to the active house's Log section.
- **File:** `Employee.jsx`, `HouseDetail.jsx`.
- **Value/Effort:** Med/Low.

### P1-16. QuickBooks / payroll integration (CareSoft gap)
- **What:** Export approved timesheets/payroll to QuickBooks (IIF/CSV or API). Depends on P0-6 (real approval) + P1-2 payroll CSV.
- **File:** billing/export module.
- **Value/Effort:** Med/Med.

---

## P2 — Polish / nice-to-have

### P2-1. Break capture on clock-out
- `clockOut` already accepts `paidBreakMin/unpaidBreakMin` but `ClockCard` never asks → wage/hour gap. Add break entry on the clock-out flow. **File:** `ClockCard.jsx`. **Med/Low.**

### P2-2. Clock-out confirm guard
- No confirmation against a mis-tap clock-out. Add a quick confirm. **File:** `ClockCard.jsx`. **Low/Low.**

### P2-3. Offline / failed-save retry queue
- A dropped incident/daily-log must be retyped; group homes + community outings have weak connectivity (Therap records offline + syncs). Cache writes locally, sync on reconnect. **File:** `db.js` write layer + a queue. **Med/High.** (Bigger than P2 effort, but lower urgency than P0/P1.)

### P2-4. Chat DM / @mention
- No way to chase a specific staffer (e.g., to confirm a swap or coverage). Add DM/@mention to TeamChat (after P0-5 stabilizes the composer). **File:** `TeamChat.jsx`, `db.js`. **Med/Med.**

### P2-5. E-signature capture on MAR / notes / ISPs
- Many states require signed/attested documentation; e-sign is table-stakes for audit defensibility. **File:** MAR/notes/ISP components. **Med/Low.**

### P2-6. Family / guardian read-only portal + consents
- Person-centered care expectation + common RFP requirement; families see daily logs/goals and sign consents without staff phone calls. **File:** new portal surface + RLS. **Med/Med.**

### P2-7. BI/trend dashboards
- Incident trends, goal progress, med-pass compliance rollups by provider/program/individual for QA/survey prep (Therap + CareSoft both sell this). Builds on P1-12 reports. **File:** reports/BI module. **Med/Med.**

---

## Suggested execution order
1. **P0-1, P0-4, P0-5** (High/Low — fastest correctness wins).
2. **P0-3, P0-2, P0-6, P0-7, P0-8, P0-9** (finish the broken/dishonest flows).
3. **P1-9 notification backbone** first among P1s (unblocks P0-7, P1-4, P1-7, P0-3).
4. EVV/billing track (**P1-1 → P1-14 → P1-2 → P1-16**) and audit/compliance track (**P1-8, P1-6, P1-3, P1-5**) in parallel.
5. P2 polish as capacity allows.
