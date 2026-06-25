-- Shift swap / cover requests so the feature works for real customers (not just
-- the demo store). House-scoped RLS mirrors the shifts table. Idempotent.
create table if not exists public.swap_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  house_id      uuid references public.houses(id) on delete cascade,
  shift_id      uuid not null references public.shifts(id) on delete cascade,
  from_staff_id uuid references public.staff(id) on delete set null,
  from_name     text,
  to_staff_id   uuid references public.staff(id) on delete set null,
  to_name       text,
  note          text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  resolved_by   text,
  resolved_at   timestamptz
);
create index if not exists swap_requests_house_status_idx on public.swap_requests(house_id, status);
create index if not exists swap_requests_org_idx on public.swap_requests(org_id);

alter table public.swap_requests enable row level security;

-- SELECT: org members see swaps in their house scope; supervisors org-wide.
drop policy if exists swap_select on public.swap_requests;
create policy swap_select on public.swap_requests for select
  using (org_id = auth_org_id() and (auth_staff_role() = 'supervisor' or house_id is null or house_id = auth_house_id()));

-- INSERT: a worker may only file a swap for THEMSELVES, within their house.
drop policy if exists swap_insert on public.swap_requests;
create policy swap_insert on public.swap_requests for insert
  with check (org_id = auth_org_id() and from_staff_id = auth_staff_id()
              and (auth_staff_role() = 'supervisor' or house_id is null or house_id = auth_house_id()));

-- UPDATE: managers/supervisors in scope resolve; the requester may cancel theirs.
drop policy if exists swap_update on public.swap_requests;
create policy swap_update on public.swap_requests for update
  using (org_id = auth_org_id() and (
           (auth_staff_role() in ('supervisor','manager') and (auth_staff_role() = 'supervisor' or house_id = auth_house_id()))
           or from_staff_id = auth_staff_id()))
  with check (org_id = auth_org_id());

-- DELETE: same actors as update.
drop policy if exists swap_delete on public.swap_requests;
create policy swap_delete on public.swap_requests for delete
  using (org_id = auth_org_id() and (
           (auth_staff_role() in ('supervisor','manager') and (auth_staff_role() = 'supervisor' or house_id = auth_house_id()))
           or from_staff_id = auth_staff_id()));
