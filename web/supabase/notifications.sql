-- Notification backbone. One primitive that real events write to (incident
-- filed, swap requested, missed dose/appointment, cert expiring...) so the app
-- can stop *claiming* "manager notified" and actually notify. Recipients are
-- addressed either by a specific staff id OR by role (supervisor/manager) within
-- an org/house.
--
-- NOT yet applied to production (project ztatmhxvvthlevddqqdl) — apply once the
-- user authorizes the production DB change. The frontend degrades gracefully
-- (createNotification no-ops) until the table exists.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  recipient_staff_id uuid references public.staff(id) on delete cascade,  -- null = address by role
  recipient_role text,        -- 'supervisor' | 'manager' | null (used when recipient_staff_id is null)
  kind text not null,         -- 'incident' | 'swap_request' | 'missed_dose' | 'appointment' | ...
  title text not null,
  body text,
  link text,                  -- optional in-app deep link
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_org_created_idx on public.notifications (org_id, created_at desc);

alter table public.notifications enable row level security;

-- A recipient sees notifications addressed to them by id, OR to their role within
-- their scope (supervisors see org-wide; others see their house / unscoped).
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (
    org_id = auth_org_id() and (
      recipient_staff_id = auth_staff_id()
      or (recipient_staff_id is null
          and (recipient_role is null or recipient_role = auth_staff_role())
          and (auth_staff_role() = 'supervisor' or house_id is null or house_id = auth_house_id()))
    )
  );

-- Any authenticated org member can create a notification — the app raises them on
-- events (e.g. a DSP filing an incident notifies the managers).
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (org_id = auth_org_id());

-- A recipient marks their own (or their role's) notifications read.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (
    org_id = auth_org_id() and (
      recipient_staff_id = auth_staff_id()
      or (recipient_staff_id is null and (recipient_role is null or recipient_role = auth_staff_role()))
    )
  ) with check (org_id = auth_org_id());

grant select, insert, update on public.notifications to authenticated;
