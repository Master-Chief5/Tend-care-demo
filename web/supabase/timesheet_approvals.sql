-- Persist payroll sign-off. Timesheet approval was local React state that
-- vanished on refresh/tab-switch — no persistence, no audit trail. This table
-- records who approved which staffer's pay period and when.
--
-- NOT yet applied to production (project ztatmhxvvthlevddqqdl) — apply once the
-- user authorizes the production DB change. The frontend degrades gracefully
-- until then (approve still works optimistically; it just doesn't persist).

create table if not exists public.timesheet_approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  approved_by text,
  approved_by_staff uuid references public.staff(id) on delete set null,
  approved_at timestamptz not null default now(),
  unique (org_id, staff_id, period_start, period_end)
);

alter table public.timesheet_approvals enable row level security;

drop policy if exists timesheet_approvals_select on public.timesheet_approvals;
create policy timesheet_approvals_select on public.timesheet_approvals
  for select using (
    org_id = auth_org_id()
    and (auth_staff_role() = any (array['supervisor','manager']) or staff_id = auth_staff_id())
  );

drop policy if exists timesheet_approvals_insert on public.timesheet_approvals;
create policy timesheet_approvals_insert on public.timesheet_approvals
  for insert with check (
    org_id = auth_org_id()
    and (auth_staff_role() = 'supervisor'
         or (auth_staff_role() = 'manager' and (house_id is null or house_id = auth_house_id())))
  );

drop policy if exists timesheet_approvals_update on public.timesheet_approvals;
create policy timesheet_approvals_update on public.timesheet_approvals
  for update using (
    org_id = auth_org_id()
    and (auth_staff_role() = 'supervisor'
         or (auth_staff_role() = 'manager' and (house_id is null or house_id = auth_house_id())))
  ) with check (
    org_id = auth_org_id()
    and (auth_staff_role() = 'supervisor'
         or (auth_staff_role() = 'manager' and (house_id is null or house_id = auth_house_id())))
  );

drop policy if exists timesheet_approvals_delete on public.timesheet_approvals;
create policy timesheet_approvals_delete on public.timesheet_approvals
  for delete using (
    org_id = auth_org_id()
    and (auth_staff_role() = 'supervisor'
         or (auth_staff_role() = 'manager' and (house_id is null or house_id = auth_house_id())))
  );

grant select, insert, update, delete on public.timesheet_approvals to authenticated;
