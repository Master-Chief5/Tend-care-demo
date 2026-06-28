# Tend UI Practicality & Usability — Consolidated Problem List

Synthesis of a 5-loop audit (IA/findability, redundancy, role usability, consistency, critic+verify). Duplicates merged; L5 corrections applied (disproven items dropped or narrowed). Every item cites real code traced under `web/src`.

---

## Top priorities (the 12 that matter most)

1. **[USELESS]** Care tab → "Today's care priorities" is entirely hardcoded — `CareHub.jsx:222` (`{4} open`), `:225-228` (four `PriorityCard`s), `:241` (Incidents tile `count={1}`). Every label/badge is a string literal, identical for every house every day, while real alert data already exists and is wired on `Home.jsx`. — The loudest block on the Care landing cries wolf; once users notice it never changes they distrust every count in the app. — Drive from the same alert/incident data `Home.jsx` uses, or remove the block until it's real. — Severity: High

2. **[USELESS]** Care hub module tiles + priority cards are dead clicks on desktop — `DesktopShell.jsx:94` renders `<ScreenA_CareHub … onOpenResident={…}/>` with no `onOpenHouseSection`; `CareHub.jsx:128` `goToSection` early-returns when that prop is falsy. Every "Go to" tile and clickable priority does nothing on the platform where managers do most clinical oversight. — Reads as a broken app; same tiles work on mobile. — Pass `onOpenHouseSection` (mapped to `setHouseDetail`) in `DesktopShell` exactly as `MobileShell.jsx:79` does. — Severity: High

3. **[USELESS/FINDABILITY]** Mobile Home "Log incident" quick action (`Home.jsx:427`) and "Incidents & alerts" glance tile (`:373`) both `onNavigate('activity')`, but `Activity.jsx:5` is an explicitly "Calm, read-only activity feed" with no incident form. — The most obvious "Log incident" affordance dead-ends; the real form is buried at HouseDetail → Compliance. — Point both at the house Compliance section with the report auto-opened, like the DSP path (`MobileShell.jsx:56`). — Severity: High

4. **[UI PRACTICALITY/SAFETY]** Care → Meds → tapping the already-selected status silently reverts the dose to "due" — `MedPass.jsx:109` `d.status === status ? 'due' : status`. A nurse double-tapping "Given" to be sure erases a recorded med pass with no warning. — Clinical/audit hazard. — Make a recorded status sticky; require an explicit "change/undo" action with confirmation. — Severity: High

5. **[CONFIRM]** Care → House → resident sheet → "Remove resident" (`HouseDetail.jsx:113` `remove` → `deleteResident`, button `:142`) deletes a resident and all linked clinical data with **no confirmation** — yet deleting a mere supply item or note does prompt. — One fat-finger permanently destroys a person's chart. — Add a confirm (reuse the inline two-step pattern from `HouseSetup.jsx:77-87`). — Severity: High

6. **[DUPLICATE]** Two task systems both surfaced as "tasks": My Day via `fetchTasks`/`addTask` (`Employee.jsx:109,45`) vs the Tasks module via `fetchQuickTasks`/`createQuickTask` (`Tasks.jsx:3`). Different backends; the My Day overdue banner even counts the *other* store and says "see Tasks" (`Employee.jsx:118,191`). — A DSP can't reconcile what they added on Home with what "Tasks" shows; overdue counts don't match the visible list. — Unify on one store, or relabel ("my shift to-dos" vs "assigned tasks") and write both to the same queue. — Severity: High

7. **[DUPLICATE]** House manager is two sources of truth: free-text `managerName` (`HouseSetup.jsx:15,35`, surfaced as `house.manager` → "mgr X" in `HouseDetail.jsx:311` and `Pages.jsx:295`) vs the actual staff record with a House-mgr role + house assignment. They drift instantly; schedule/scoping follow the staff record while dashboards show the typed string. — The org silently disagrees with itself. — Drop the free-text field; derive the label from the assigned manager staff row (or make it a staff picker). — Severity: High

8. **[DUPLICATE]** The same resident opens two different detail screens: HouseDetail resident row → `ResidentModal` edit sheet (`HouseDetail.jsx:395`, name/room/flags only) vs Care → `ResidentProfile` full clinical workspace (`CareHub.jsx:265` → meds/goals/health/behavior/progress/incidents/notes). — A DSP tapping the same person in two places gets either an editable card or the full chart, with no signal the profile exists or why they differ. — Route the HouseDetail row to `ResidentProfile`; keep edit as an action inside it. — Severity: High

9. **[LABEL/FINDABILITY]** Desktop rail item "Residents" (`DesktopShell.jsx:62`) opens `PageHousesDesktop`, which is titled "Houses", shows house cards, has an "Add house" CTA and "No houses yet" empty state (`Pages.jsx:347-355`); the same screen is "Houses" on mobile (`MobileShell.jsx:124`). Actual residents live under Care hub. — A user hunting for a person clicks the wrong thing; one word means two things across shells. — Rename the tab "Houses". — Severity: High

10. **[USELESS]** Org → Orientation (`Pages.jsx:598` `PageOrientationDesktop`; mirrored on mobile via `MobileShell.jsx:98,131`) is a permanent placeholder: hardcoded "No one is onboarding right now", a static "Roots plan", "Add hire" just routes to Staff (`:604`), and the data-bearing `NewHireCard` (`:549`) is never rendered. — A top-level supervisor nav slot that can never populate erodes trust in the whole app. — Wire to real new-hire data (hire with <30d tenure) or remove the nav entry. — Severity: High

11. **[CONSISTENCY]** DSP schedule self-service is mobile-only: `ScheduleDay.jsx` has `claimShift`/`createSwapRequest` + `ClaimSheet` + "Give up to open list" (`:7,559,647,718,756`); desktop `Schedule.jsx` imports neither and only offers manager add/edit/delete + a swap-*approval* banner (`:646`). — A DSP on a laptop sees open/own shifts but cannot claim or give one up — the core workforce self-service is phone-only. — Add claim/give-up/swap to the desktop schedule (or route staff to the same component). — Severity: High

12. **[CONTROLS/LAYOUT]** The whole clinical workspace (`HouseDetail`: MedPass/Goals/DailyLog + 10 horizontally-scrolling pills) is the unchanged phone screen stuffed into a fixed ~420px modal on desktop (`DesktopShell.jsx:297-309`); `CareHub`/`Driving`/`Resources` likewise render `.phone-screen` in a narrow column, while siblings (Schedule, Today, Compliance) have real wide layouts. — The app's most data-heavy daily work is the least desktop-usable surface, with side-scrolling pills and wasted gray space. — Give HouseDetail/Care a true wide desktop layout (pills as a left sub-rail or full-width tabs, two-column content). — Severity: High

---

## A. Findability / feature location

- **[FINDABILITY]** Appointments has no pill and no Care tile — rendered only nested under the Health section (`HouseDetail.jsx:420-423`); `HOUSE_SECTIONS` (`:19-30`) has no `appt` entry, and it's absent from `ResidentProfile` tabs too. — A DSP/manager looking for "the dentist run" would never open "Health"; a daily-driver feature is invisible behind the wrong label. — Give Appointments its own pill + Care tile + ResidentProfile tab. — Severity: Med

- **[FINDABILITY/LABEL]** The incident-filing section is named three ways: pill "Compliance" (`HouseDetail.jsx:29`, last of 10), Care tile "Incidents" (`CareHub.jsx:241`), shift-doc step "Incident check" (`ShiftDocPanel.jsx:13`) — all route to the same section, and "Compliance" is the least-discoverable label for "file an incident". — A new hire scanning pills to report a fall won't read "Compliance" as the place. — Standardize on "Incidents" (or "Incidents & safety") everywhere and promote it left. — Severity: Med

- **[PRACTICALITY]** Section pill order leads with Overview/Shift docs and pushes the every-shift "Log" to 8th (off-screen behind horizontal scroll) while rarely-touched "Funds" sits 7th (`HOUSE_SECTIONS`, `HouseDetail.jsx:19-30`; pills scroll horizontally at `:319-326` with a right-edge fade). — High-frequency care is buried behind low-frequency finance/admin. — Reorder so Log/Meds/Health lead and Funds/Progress/Compliance trail; also hoist incidents nearer the front or surface an "open incidents" count on Overview. — Severity: Med

- **[PRACTICALITY]** A DSP's own house ("My house") is demoted into the More overflow (`MobileShell.jsx:115-117`), reachable only via More → "My house," while Care (a cross-house concept) gets a primary tab. — The single context a DSP works every shift takes extra taps for every log/shift-doc action. — For staff, point the Care tab at their house or surface "My house" as a primary tab/Home shortcut. — Severity: Med

- **[FINDABILITY/GLOBAL SEARCH]** There is no global search; search is siloed and inconsistent — Care reveals a resident/house search via a toggled icon (`CareHub.jsx:207-217`), Staff shows an always-visible search pill (`People.jsx:221-230`), and Schedule/Tasks/Updates/Directory/Compliance have none. — "Find everything about resident Reni" or "find staffer Devon" requires already knowing which module owns the answer and which of two search affordances it uses. — Add one global search in the persistent top-right zone spanning residents/staff/houses/incidents; at minimum standardize the per-screen pattern. — Severity: Med

- **[FINDABILITY]** Profile/Sign out ("Me") is the last item in the More overflow (`MobileShell.jsx:141`) with no header affordance — sign-out is More → scroll past ~13 items → Me. — The most basic account action (critical on a shared house device) is 2 taps plus a scroll. — Promote to a top-right avatar tap (the NotificationBell already sits there) or pin Me to the top of More. — Severity: Low

- **[FINDABILITY]** The "Activity" More tile sub-label says "Live map & on-shift status" (`MobileShell.jsx:125`) but opens a day-grouped read-only feed (`Activity.jsx:5`). — Users expect a staff-location map (which exists on desktop) and get a text feed; the promised feature appears missing. — Relabel to "Activity log — recent clock-ins & changes," or actually surface on-shift status. — Severity: Low

## B. Duplicate / redundant features

- **[DUPLICATE]** Two differently-stocked nav grids for the same ~10 care sections: Care-hub tiles (7: `CareHub.jsx:238-244`) vs HouseDetail pills (10: `HouseDetail.jsx:19-30`). Care has no tile for Shift docs or Progress, yet the "Shift documentation incomplete" priority deep-links to `shift` (`:227`), which has no tile. — Users learn one grid, then hit a second inconsistent one; "where do I do shift docs?" has no consistent answer. — Mirror the tile set 1:1 with the pills (canonical list), and make Care tiles open the resident picker rather than the redundant house pill. — Severity: Med

- **[DUPLICATE]** Incidents reachable three ways and shown twice on one Care screen: the "Incident needs review" priority card (`CareHub.jsx:225`) and the "Incidents" tile (`:241`) both `goToSection('compliance')`; plus the org Compliance tab (`Pages.jsx:766`) and the per-house Compliance pill (`HouseDetail.jsx:427`). — Two identical-nav controls on one screen; "Compliance" means org certs in one place and per-house incidents in another, so users learn no consistent location. — Show incidents once on Care; keep "Compliance" as the org rollup and "Incidents" as the per-house log with distinct labels. — Severity: Med

- **[DUPLICATE]** Desktop "Today" (`Pages.jsx:119`) and "Residents/Houses" (`:325`) both call `useHouseSnapshot` and render near-identical house cards (on-shift / residents-in / drives / needs-attention). — Two top-level destinations show the same roster; users can't tell which is canonical. Mobile compounds it with house-card entry points in Home, More → "Houses," and HouseDetail. — Fold Houses into Today (or make it a real per-house drill-down), and collapse the redundant mobile entry points. — Severity: Med

- **[DUPLICATE]** Supplies live in two places: `HouseItems` `supply` kind in HouseDetail Overview (`components/HouseItems.jsx`, mounted `HouseDetail.jsx:414`) vs the dedicated Resources/Supplies screen (`Resources.jsx`). — Restock signals ("out of paper towels") fragment across two lists. — Merge supply flags into one surface. — Severity: Med

- **[DUPLICATE]** Live attendance appears in three places: Today's "Shift coverage"/cards (`Pages.jsx:198`), Time clock → "Who's in" (`Timesheets.jsx:101` `WhoseIn`), and the Activity clock-in/out feed (`Activity.jsx`). — To answer "is everyone clocked in right now?" a supervisor must know which of three surfaces is authoritative. — Make "Who's in" the single live source; Today/Activity link to it rather than re-deriving. — Severity: Low

- **[DUPLICATE]** Per-resident `guardian`/`physician` free-text (`HouseDetail.jsx:88-89`, ResidentModal) overlaps the Directory's physician/guardian/case-manager contacts (`Directory.jsx:19-26`). — A DSP needing the guardian's number doesn't know whether it's on the resident card or in Directory, and the two can disagree. — Make the resident card the source and have Directory surface it, or drop one. — Severity: Low

- **[DUPLICATE/UI]** "Shift documentation" banner on House Overview (`HouseDetail.jsx:339-350`) only does `setSection('shift')` — i.e. jumps to the "Shift docs" pill one row above. — Two controls a row apart do the same thing; implies they differ. — Keep the banner OR the pill emphasis, not both. — Severity: Low

- **[DUPLICATE/PRODUCT-SCOPE]** Four overlapping "what must I complete" surfaces: Tasks (`Tasks.jsx`), the house to-do log (`HouseItems.jsx`), Forms checklists (`Forms.jsx`, e.g. "Morning shift checklist"), and `ShiftDocPanel` guided docs. — A DSP has no single source of truth for "my work today," the core daily question. — Consolidate (house to-do log + Tasks); delete Forms-as-checklists and route shift docs from there. — Severity: Med (product-scope judgment)

## C. Useless / vestigial features

- **[DEAD CODE]** `TabBar.jsx` is rendered in 9 sites (`Employee.jsx:251,318`, `Driving.jsx:583`, `Houses.jsx:326`, `People.jsx:143,249`, `ScheduleDay.jsx:275,358,919`) but globally hidden (`globals.css:112-113` sets `display:none` for both `.web-desktop`/`.web-mobile`), carries a stale 5-tab nav (Houses/Schedule/Team/Driving/Me) that no longer matches the real bar, and is wired with no `onTabChange`. — Pure dead scaffolding; a maintenance trap that would render a wrong, inert bar if the CSS guard were ever touched. — Delete the component and its render sites. — Severity: Med

- **[DUPLICATE/DEAD]** A dead second copy of the app at repo root (`screens-a-people.jsx`, `screens-a-schedule-day.jsx`, `screens-a-onboard-chat.jsx`, `tend-web-desktop-pages.jsx`, `tend-web-desktop-schedule.jsx`) re-declares `ScreenA_*` plus its own `STAFF_LIST`/`CHAT_DATA`/`TODAY_SHIFTS`, attached via `Object.assign(window, …)`, all of which also exist under `web/src`. — Greps hit two definitions; someone edits the wrong one. — Delete the root-level legacy `.jsx` files (`web/src` is canonical). — Severity: Med

- **[DEAD CODE]** `STAFF_LIST` + `TODAY_SHIFTS` (`constants.js:22,70`) are exported but imported by no live screen; `CHAT_DATA` (`:34`) feeds only the orphaned `ChannelRow`/`Msg` helpers (`Pages.jsx:370-404`), which are unreachable because `PageTeamDesktop` (`:406`) delegates to `<TeamChat>`. `STAFF_LIST` carries fabricated gamification data ("score 96", "On track for promo") that renders nowhere and even contradicts the seeded roster. — Misleading maintenance traps that imply a scoring feature exists; the `HOUSES` import at `Schedule.jsx:2` is likewise unused. — Delete the unused constants and the `ChannelRow`/`Msg`/`NewHireCard` helpers. — Severity: Low

- **[USELESS]** Hardcoded schedule status text: `LATE · 12m` always (`Schedule.jsx:155`), and the day summary prints literal `· 1 late` / `· 1 swap` (`:328-329`) regardless of true lateness or count. — A manager scanning for how late someone is, or how many swaps need attention, gets a fixed lie. — Compute minutes-late from clock-in and count actual late/swap shifts. — Severity: Low

- **[DEAD/FEEDBACK]** Houses card "Message" fallback `onTeamChat ? … : showToast('Team messaging coming soon')` (`Houses.jsx:157`) is unreachable — the sole caller always passes `onTeamChat` (`MobileShell.jsx:80`). — Vestigial "coming soon" copy shipped in a live app. — Remove the fallback branch. — Severity: Low

- **[USELESS]** "Me" screen secondary nav rows duplicate existing nav (My schedule → Schedule tab, My trips → Transport, Messages → Team) (`Employee.jsx:275-279`); the `opacity:0.45` + "SOON" branch (`:302-305`) is **unreachable dead code** (`active = !!tab && !!onNavigate` is always true since every row hardcodes a `tab` and `onNavigate` is always passed). — A third redundant path to the same screens, plus dead "coming soon" UI. — Drop the rows and the dead branch; keep Me to profile + sign-out. — Severity: Low

> **PRODUCT-SCOPE (over-build for a ~9-staff / 4-house agency — "remove the module" is a judgment call, not a defect):** Help Desk ticketing (`HelpDesk.jsx`, ~394 lines), Surveys platform (`Surveys.jsx`, ~620), Training/Courses LMS (`Courses.jsx`, ~735), Staff Ranking leaderboard (`StaffRanking.jsx`, reached `Pages.jsx:455-463`), Events RSVP/capacity (`Events.jsx`), and the geofence/duty-location stack (`HouseDetail.jsx:195` `GeofenceCard`, `useDutyTracking`, TeamMap). Events also overlaps Updates + Schedule, and Orientation overlaps Courses onboarding. Each module is the same copy-pasted ~400-700-line "header + chips + card list + builder"; consolidating removes thousands of lines. Flagged Low–Med.

## D. Usability friction (by role where relevant)

**DSP / staff**

- **[UI PRACTICALITY]** Care priority "Incident needs review" deep-links a DSP into the incident list, but Manage/Mark-reviewed/Delete are all gated behind `isSup` (`Compliance.jsx:371-373`; `isSup` excludes staff). — The DSP is told to act on an item they have no control to act on — a dead-end. — Hide review-oriented priorities for staff or show DSP-appropriate actions. — Severity: Med

- **[UI PRACTICALITY]** Daily log has no edit/delete — `DailyLog.jsx` renders no per-entry controls; `deleteDailyLog` is imported (`:2`) but unused. — Caregivers typing fast on a phone can't fix a wrong resident/category, pushing under-documentation. — Add author-own, time-boxed edit/delete and drop the dead import. — Severity: Med

- **[UI PRACTICALITY]** Med Refused/Held records instantly with no reason field (`MedPass.jsx:141-144`; only the PRN path captures a reason, `:175`). — Refusals/holds usually require a documented reason for compliance; the fast path loses the most important context. — Prompt for a brief reason on Refused/Held. — Severity: Med

- **[PRACTICALITY/FINDABILITY]** End-of-shift has no path: clock-out lives on My Day (ClockCard) but the shift-doc wizard lives at Care → house → "Shift documentation," with nothing connecting them. — A new hire clocks out from the obvious place and is never prompted to finish the daily note / med pass / incident check. — Add an end-of-shift prompt on ClockCard linking to ShiftDocPanel, or surface shift-doc completion on My Day. — Severity: Med

- **[DUPLICATE/UI]** My Day stacks two near-identical green toggles: the ClockCard and the "On duty · sharing location" OnDutyCard (`Employee.jsx:194-195`; `ClockCard.jsx:91-94`; `OnDutyCard.jsx`). Clocking in already calls `setMyDuty(true)`, so the second card flips on by itself; toggling On-duty off while clocked in desyncs payroll from location state. — A low-tech hire conflates "am I clocked in?" with "am I sharing location?" and may toggle the wrong one. — Fold location-sharing into the clock card, or clearly label them as distinct with explicit coupling. — Severity: Med

- **[LABEL]** Sign-up role picker offers only "Supervisor / I run the organization" vs "Staff / DSP" (`LoginScreen.jsx` SignUpForm). — A newly hired house *manager* has no matching option; reading "Supervisor = I run the organization" they may pick Supervisor and spin up a duplicate org via `createOrgAndSupervisor`, creating an orphan org that's hard to undo. — Add a "Manager" choice that registers as staff pending promotion, or reword so managers sign up as Staff. — Severity: Low

**Supervisor / manager**

- **[DUPLICATE/SAFETY]** Desktop Compliance tab "Mark reviewed" (`Pages.jsx:804`) vs the per-house follow-up lifecycle (`Compliance.jsx:209` `FollowUpSheet`) — the org tab can close a `reportable && !notified_at` incident visually *without recording the legally-required agency notification*, which only the per-house FollowUpSheet captures. — The convenient surface is the unsafe one; a manager can close a state-reportable incident having skipped the required notification. — Make "Mark reviewed" on a reportable, not-yet-notified incident route into the follow-up sheet, or add "Manage" to the tab rows. — Severity: High

- **[UI PRACTICALITY]** Timesheet approval is optimistic with no toast and no undo: `doApprove` (`Timesheets.jsx:184`) flips the row to "Approved" permanently with no un-approve path. — A mis-tapped approval on the wrong person's hours can't be reversed — dangerous for payroll sign-off. — Add a confirmation/toast and an "Undo"/re-open action. — Severity: Med

- **[BULK ACTIONS]** Time clock approval is one staffer at a time — no "approve all for this period" or multi-select (`Timesheets.jsx:184-269`). — Closing payroll for a 9-person, 4-house org means tapping Approve on every card every period; tedious and easy to skip someone. — Add a period-level "Approve all" (with confirm) and/or row checkboxes. — Severity: Low

- **[PRACTICALITY]** Payroll dead-ends at on-screen approval: `PeriodGrid`/`StaffSheetCard` (`Timesheets.jsx:282,533`) let a supervisor page periods and approve, but there is no export/print/CSV anywhere. — "Run payroll" is a stated top task, yet the data can't reach an actual payroll system. — Add a per-period CSV/PDF export of worked/scheduled/OT by staff. — Severity: Med

- **[PRACTICALITY]** Scheduling is free-text name based: `ShiftModal` saves `personName` from a `SuggestInput` (`Schedule.jsx:565,513-517`) and `candidateStaffId` may be null yet the shift still saves (`canSubmit` only needs name+house, `:534`). — You can schedule "Jane Doe" who isn't on staff; the shift never links to the roster, so coverage/timesheet matching silently misses them — a third source of "who works here." — Require selecting a real staff record (or "add as staff") before saving. — Severity: Med

- **[UI PRACTICALITY]** Deleting a house (`HouseSetup.jsx:147` `handleDelete`) only does an inline "Confirm delete" with no warning about assigned staff, scheduled shifts, or residents. — A supervisor doing cleanup can orphan staff `house_id`s and shifts with no heads-up, irreversibly. — Warn with dependent counts ("3 staff, 12 upcoming shifts reference this house") before deleting. — Severity: Med

- **[CONFIRM]** Staff → detail → "Remove staff member" (`People.jsx:138`, `handleRemove` `:172`) removes a staff member with no confirmation (only a toast after). — Destructive, easy to mis-tap from a detail screen, inconsistent with the house-delete confirm. — Add a confirmation step. — Severity: Med

- **[CONFIRM]** Care → House → Goals → goal "×" (`Goals.jsx:134` `del` → `deleteGoal`) deletes a regulated ISP/habilitation goal with no confirmation and no success feedback. — An accidental tap silently erases a clinical target with no undo. — Add a confirm dialog and a toast. — Severity: High

- **[UI PRACTICALITY]** Swap handling: a "SWAP REQ" badge (`Schedule.jsx:156`) on a shift block routes to the generic Edit-shift modal (`:752`), which has no approve/deny; the real control is the disconnected `SwapRequestsBanner` pinned at page top (`:646-686`). — The obvious target for "handle this swap" is the wrong one. — Make clicking a swap-flagged block open approve/deny (or scroll to/highlight its banner card). — Severity: Med

- **[PRACTICALITY]** "New shift" CTA on the Today dashboard only calls `onNavigate('schedule')` (`Pages.jsx:194`) — it doesn't open the add-shift dialog, so the user clicks "New shift" again on the Schedule page (whose button *does* open the modal, `Schedule.jsx:744`). Same pattern on Houses/Orientation. — A primary action that doesn't do what it says costs a step and erodes button trust. — Deep-link into Schedule with the modal already open, or relabel "Open schedule." — Severity: Med

**Layout / hierarchy (cross-role)**

- **[LAYOUT]** Schedule → Day view always renders a full midnight–midnight column (`ScheduleDay.jsx:33-34` `HOUR_PX=56`, `DAY_START=0`, `DAY_END=24`, ~1,344px) and opens scrolled to 00:00, so the "Now" line (~10am) and virtually all real shifts sit below the fold. — Users scroll past 7–8 empty overnight hours every open to reach today's content. — Auto-scroll to `nowFrac` or clamp the grid to ~6am–11pm (handle overnight shifts separately). — Severity: Med

- **[LAYOUT]** Schedule → above the grid (DSP view, `ScheduleDay.jsx:835-913`) can stack a swap-requests block, "Your next" card, a publish banner, prev/today/next nav, the 7-day strip, house-filter chips, and a "Now" legend before the grid the user came for. — On a phone the grid is pushed far down; banners alone consume the first viewport. — Collapse the persistent banners into one compact line and prioritize the grid into view. — Severity: Med

- **[CONTROLS]** Schedule header "add shift" (manager) is a 32×32 icon-only black circle wedged beside the day/week/month `ViewToggle`, no label (`ScheduleDay.jsx:826-830`). — Building the schedule is the core reason a manager opens this screen, yet the create control is the smallest, least-labeled thing and competes with the view switcher. — Make it a labeled "+ Add shift" primary button, separated from the view toggle. — Severity: Med

- **[VISUAL HIERARCHY]** Care resident rows render three status dots but only the first is computed: `dotColor(tone)`, then hardcoded `dotColor('good')` (always sage) and `dotColor()` (always line color) (`CareHub.jsx:278-280`). — Reads as a meaningful 3-part clinical indicator; two dots carry zero information — a false signal on a clinical screen. — Render only the dot you compute, or drive all three from real per-resident state. — Severity: Med

- **[CONTROLS]** House → Overview → Residents header "+ Add resident" is a tiny borderless text+icon button tucked into an uppercase section subheader in the house accent color (`HouseDetail.jsx:380-384`). — Setting up residents is a primary onboarding action but the control looks like a caption, easy to miss. — Promote to a clear secondary button consistent with other add actions. — Severity: Low

**App-wide robustness / accessibility**

- **[ERROR RECOVERY]** No React error boundary anywhere — `main.jsx:6-10` and `App.jsx` have none. — Any uncaught render error in one panel (a malformed resident/med record blowing up MedPass or HouseDetail) white-screens the entire installed PWA with no recovery; a DSP mid-shift loses clock-in, logs, and meds at once. — Wrap the shell (and ideally each major screen) in an error boundary with a "something went wrong — reload / go Home" fallback that logs the error. — Severity: High

- **[ERROR RECOVERY/ONBOARDING]** Login (`LoginScreen.jsx:113-131`) has only Email/Password/"Create account" — no "Forgot password?" link, and `lib/db.js` exposes no `resetPasswordForEmail` helper. — A DSP/manager who forgets their password is permanently locked out with no self-service path (the app also has no re-invite UI). — Add a "Forgot password?" link calling `supabase.auth.resetPasswordForEmail` plus a reset-confirmation screen. — Severity: High

- **[NOTIFICATIONS UX]** Tapping a notification only calls `markNotificationRead` (`NotificationBell.jsx:58-60`); items carry `title`/`body` but no type/target, so the tap never navigates. — A "swap request needs approval" or "incident filed at Maple" alert is a dead-end; the user must hunt through Schedule/Compliance to act on it, defeating the point of an actionable alert. — Give notifications a target (entity + id) and deep-link the tap using the existing Care/Schedule deep-link handlers. — Severity: High

- **[SETTINGS/PROFILE]** Mobile "Me" (`Employee.jsx:260-321`) is the only profile surface and is entirely read-only — no edit-own-name, change-password, or notification-prefs; only sign-out and nav shortcuts (desktop has no Me at all). — A staffer whose name was mistyped at signup, or who wants to change a password or mute notifications, cannot — every personal field is locked behind a supervisor editing the People record. — Add an editable profile (name/avatar/password) and a minimal settings panel reachable from Me. — Severity: Med

- **[ACCESSIBILITY]** Interactive non-button elements are plain `div onClick` with no `role`/`tabIndex`/key handling (e.g. "Me" nav rows `Employee.jsx:301-302`; `role="button"` appears only in `globals.css`, never in JSX), and Escape-to-close exists for only some modals (ResidentModal `HouseDetail.jsx:96`, desktop Schedule) but not `StaffFormModal`/`HouseSetup`. — Keyboard-only and screen-reader users (a real ADA concern for a regulated care employer) can't reach/activate controls, and modal dismissal is unpredictable. — Use real `<button>`s (or `role="button"` + `tabIndex` + Enter/Space) for clickable rows; standardize Escape/focus-trap on every modal. — Severity: Med

- **[NOTIFICATIONS/PARITY]** Team chat channel list (`TeamChat.jsx:35-53`) renders channel buttons with no per-channel unread badge or dot — it polls messages but tracks no last-read marker. — A manager in "All staff" plus a house channel gets zero signal a new message arrived elsewhere; time-sensitive shift messages get missed. — Track last-read per channel, show an unread dot/count per row, and feed it into NotificationBell. — Severity: Med

## E. Consistency (mobile ↔ desktop, labels, feedback)

- **[PARITY]** Desktop has no profile/"me" destination and the **manager** OnDutyCard is unreachable: `ALL_TABS` has no `me`, the rail footer only logs out (`DesktopShell.jsx:181-188`); the manager OnDutyCard lives only on `ScreenA_Me` (`Employee.jsx:295`). (Note: desktop *staff* DO get an OnDutyCard via `ScreenA_MyDay` at `Employee.jsx:195` — this is narrowed to managers/profile.) — A desktop manager can't view a profile or toggle on-duty; `useDutyTracking` runs with no control. — Add a `me`/profile destination (footer avatar) hosting the manager OnDutyCard. — Severity: Med

- **[PARITY]** Desktop staff My Day gets no Report-incident shortcut: `DesktopShell.jsx:93` renders `<ScreenA_MyDay user={user}/>` without `onReportIncident`, unlike mobile (`MobileShell.jsx:56`). — Desktop staff lose the one-tap path to the most time-sensitive action. — Thread `onReportIncident` (open the house-section modal). — Severity: Med

- **[PARITY]** Mobile tabs carry no count badges; desktop does — `DesktopShell.jsx:293` feeds `counts` for Schedule open-shifts / Time pending / Updates unread, rendered at `:148`; mobile (`MobileShell.jsx:338-348`) shows only the shared NotificationBell. — The primary mobile audience gets no at-a-glance signal of open shifts / pending approvals / unread announcements. — Mirror the counts onto the mobile Schedule/Time/More tabs. — Severity: Med

- **[PARITY]** Desktop staff have no "My house" rail entry (`ALL_TABS` gives staff only `care`; `houses`/`compliance` are supervisor/manager-only, `DesktopShell.jsx:62-63`), whereas mobile injects one for staff because the screen is otherwise unreachable (`MobileShell.jsx:115-117`). — A desktop DSP can only reach their own HouseDetail indirectly via a resident drill-in (and those section tiles are themselves dead on desktop per item #2). — Add a "My house" rail item for desktop staff. — Severity: Med

- **[MOBILE PARITY]** Manager Care hub isn't house-scoped: `MobileShell.jsx:79` (`case 'care'`) passes no `scopeHouseId`, unlike staff (`:57`), so a one-house manager sees the cross-house picker and every org resident — while their Home *is* scoped (`Home.jsx:203`). — Inconsistent scoping for the same role between Home and Care. — Pass the manager's `houseId` as `scopeHouseId`. — Severity: Med

- **[PARITY/UI]** Mobile Compliance and Orientation just wrap the desktop dashboards in a `phone-screen` div (`MobileShell.jsx:97-98` → `PageComplianceDesktop`/`PageOrientationDesktop`), which use 4-column `DStat` grids and wide tables (`Pages.jsx:813,616`). — A supervisor checking incidents/certs on a phone gets a cramped, horizontally-overflowing desktop layout. — Give these real mobile layouts (stacked stats, single-column rows). — Severity: Med

- **[PARITY]** Four primary screens are entirely separate per-platform implementations, inviting drift: Today/Home (`PageTodayDesktop` vs `ScreenA_Home`), Houses/Residents (`PageHousesDesktop` vs `ScreenA_Houses`), Team (`PageTeamDesktop` vs `ScreenA_Chat`), Staff (`PageStaffDesktop` vs `ScreenA_Staff`) — unlike Updates/Tasks/Timesheets which share one component switching on a `desktop` prop. — A new card or staff field lands on one platform and silently misses the other. — Converge on the shared single-component + `desktop`-prop pattern. — Severity: Med

- **[PARITY/UI]** Mobile More is a flat ~17-item list (`MobileShell.jsx:112-167`) with no grouping, while desktop groups the same modules into Overview/Care/Org (`DesktopShell.jsx:85-89`); desktop's own 16-item "Org" group is itself a flat, evenly-weighted scan (`:65-81`) mixing HR/admin, comms, knowledge, and workforce ops. High-traffic items (Updates, Team, Tasks) sit visually equal to rarely-used ones (Surveys, Courses, Help Desk). — Finding anything is a linear scan of look-alike rows; mobile gets a worse structure than desktop for the same content. — Group More with the existing headers; split Org into sub-groups (People & HR / Comms / Knowledge & Forms / Workforce), co-locating scheduling/timeclock/staff/tasks. — Severity: Med

- **[CONSISTENCY]** Same destination, different label/icon across shells: Resources is "Supplies"+IconCart on mobile (`MobileShell.jsx:121`) vs "Resources"+IconCart desktop (`DesktopShell.jsx:79`); the house overview is "Houses"+IconHome mobile (`:124`) vs "Residents"+IconBox desktop (`:62`); plus Care/Care hub, Team/Team chat, and the timekeeping triple (mobile "Time" / desktop "Time clock" / file "Timesheets"). — A user who learns one name can't find it under the other; "Residents" vs "Houses" is actively misleading. — One label + icon per destination from a shared nav source. — Severity: Med

- **[CONSISTENCY]** Inconsistent labels for identical features between the two clinical surfaces: HouseDetail "Log" (`HouseDetail.jsx:27`) vs ResidentProfile "Notes" (`ResidentProfile.jsx:47,147`) for the same `DailyLog`; HouseDetail "Compliance" vs ResidentProfile "Incidents"; and section order differs (House: Behavior-before-Health; Profile: Health-before-Behavior, `ResidentProfile.jsx:138-147`). — The same DSP moving between house and resident views sees the same data under different names and order. — Standardize labels ("Notes"/"Incidents" everywhere) and align ordering. — Severity: Low

- **[UI]** Duplicate rail icons: Compliance and Tasks both `IconCheck` (`DesktopShell.jsx:63,74`); Handbook and Orientation both `IconBook` (`:70,80`). — Defeats icon-based scanning; two items look identical at a glance. — Give each nav item a distinct icon. — Severity: Low

- **[LABEL]** Vocabulary drift: login/onboarding says "home" ("I work at a group home", DSP tab sub "Your assigned home" `MobileShell.jsx:116`) while the rest of the app says "house"; nav "Updates" (`DesktopShell.jsx:68`) vs subtitle/handlers "Announcements"/`announcement` (`Updates.jsx:322`, megaphone icon); "Directory" invites mis-clicks vs the Staff roster. Loading copy is also mixed ("Loading…" vs "Loading homes…/residents…/today's priorities…"). — Mixed terms hurt findability and cross-device help/training. — Pick one term per concept (house; Updates; "Contacts" for Directory) and fix "homes"→"houses". — Severity: Low

- **[EMPTY STATE]** Updates empty state repeats the same sentence: title "No updates yet." and sub-line "No updates yet — post the first one." (`Updates.jsx:343-344`). — Looks like a copy/paste bug; wastes the one chance to give a useful next step. — Title "No updates yet" + sub "Post the first one." — Severity: Low

- **[FEEDBACK]** Events → "Archive" silently removes the card with no toast/confirm, and `onArchive`/`onDelete` both map to the same `removeRow` (`Events.jsx:78-81,195`), with no archived view to recover from. — A user can't tell whether they hid or destroyed the event, and can't get it back. — Add a toast and an archived list, or drop the archive/delete distinction. — Severity: Low

- **[CONSISTENCY]** "Preview as" role switcher is mobile-only (`RoleSwitcher`, `MobileShell.jsx:332`); `DesktopShell` has none. — In demo/sales use, whoever opens the desktop build can't switch personas, undercutting the demo. — Add the same `isDemoMode` role chip to the desktop shell. — Severity: Low

## F. Bugs / errors surfaced

- **[BUG/SAFETY]** Care → Meds: tapping the already-selected status reverts the dose to "due" (`MedPass.jsx:109`, `d.status === status ? 'due' : status`) — un-records a med pass with no feedback. (Also a Top-priority item.) — Clinical/audit hazard; double-tapping "Given" erases the record. — Make recorded status sticky with explicit change/undo. — Severity: High

- **[BUG]** Care resident rows show two non-functional status dots: the 2nd is hardcoded `dotColor('good')` and the 3rd `dotColor()` (`CareHub.jsx:278-280`), so a 3-dot clinical indicator carries one real signal. — False signal users will try to interpret. — Render only computed dots. — Severity: Med

- **[BUG]** Hardcoded `LATE · 12m` and `· 1 late`/`· 1 swap` in the schedule (`Schedule.jsx:155,328-329`) display fixed values regardless of real lateness/counts. — A manager scanning lateness/volume gets fabricated numbers. — Compute from clock-in and actual shift state. — Severity: Low

- **[BUG/DEAD]** `goToSection` early-returns when `targetHouse` is null but the 7 module tiles still render fully tappable with no disabled state (`CareHub.jsx:127-130,238-244`). For a multi-house supervisor, tapping "Meds"/"Goals"/"Incidents" does nothing; the only hint is a small "Pick a house first" caption far off in the header. (Note: the four `PriorityCard`s were corrected to pass `onClick={targetHouse ? … : undefined}` and degrade to non-interactive divs — so this is scoped to the **tiles**, not the priority cards.) — Looks like broken buttons. — Disable/grey the tiles until a house is chosen, or make a tap open the house picker. — Severity: Med

- **[ERROR RECOVERY]** No error boundary, no forgot-password, dead-end notification taps — see Section D "App-wide robustness." All three are functional gaps that present as the app being broken/locked. — Severity: High (boundary, password), High (notifications)

---

## Corrections applied from the verification pass (disproven / narrowed)

- "Me screen rows render greyed/'SOON'/broken for DSPs" — **DISPROVED as breakage.** `active = !!tab && !!onNavigate` is always true; the rows navigate. The "SOON"/opacity branch is unreachable dead code (kept as a Low cleanup, Section C).
- "Desktop DSP/manager has no way to toggle on/off duty" — **Narrowed.** Desktop *staff* get the OnDutyCard via `ScreenA_MyDay`; only the **manager** OnDutyCard + a profile screen are unreachable (Section E parity item).
- "Hardcoded `HOUSES` constant leaks Oak/Willow names into a real org's Orientation/chat cards" — **Impact disproved.** `HOUSES` feeds only `ChannelRow`/`NewHireCard`, which are never rendered. Remains a dead-code trap only (Section C).
- "Care-hub priority cards render fully enabled as dead buttons for multi-house supervisors" — **Partly wrong.** Priority cards now degrade to non-interactive divs; the real offenders are the 7 module tiles (Section F bug item).
