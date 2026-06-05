-- Per-org monthly supply budget (isolated table so members can write settings
-- without an update policy on organizations). Applied live as migration
-- "add_org_settings_budget".
create table if not exists public.org_settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  supply_budget numeric,
  updated_at timestamptz not null default now()
);
alter table public.org_settings enable row level security;
create policy org_settings_select on public.org_settings for select using (org_id = auth_org_id());
create policy org_settings_insert on public.org_settings for insert with check (org_id = auth_org_id());
create policy org_settings_update on public.org_settings for update using (org_id = auth_org_id()) with check (org_id = auth_org_id());
