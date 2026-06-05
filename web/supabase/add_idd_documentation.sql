-- IDD group-home documentation suite (additive only). Applied live as migration
-- "add_idd_documentation". Three features:
--   1) ISP goals + daily goal data (habilitation goal tracking / data collection)
--   2) Resident health logs (BM, seizure, sleep, meals, fluids, weight, vitals, behavior/ABC)
--   3) Reportable-incident workflow (extra columns on incidents)
-- RLS mirrors every other table: org_id = auth_org_id().

-- 1) ISP goals (per resident) ------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete cascade,
  title text not null,
  description text,
  method text,        -- how staff should support / teach
  target text,        -- criteria / target
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy goals_select on public.goals for select using (org_id = auth_org_id());
create policy goals_insert on public.goals for insert with check (org_id = auth_org_id());
create policy goals_update on public.goals for update using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy goals_delete on public.goals for delete using (org_id = auth_org_id());
create index if not exists idx_goals_resident on public.goals (org_id, resident_id);

-- 2) Daily goal data ---------------------------------------------------------
create table if not exists public.goal_data (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete cascade,
  log_date date not null default current_date,
  result text,        -- independent | verbal | gesture | model | physical | refused | n/a
  value numeric,      -- optional trials/count
  note text,
  recorded_by text,
  recorded_at timestamptz not null default now()
);
alter table public.goal_data enable row level security;
create policy goal_data_select on public.goal_data for select using (org_id = auth_org_id());
create policy goal_data_insert on public.goal_data for insert with check (org_id = auth_org_id());
create policy goal_data_update on public.goal_data for update using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy goal_data_delete on public.goal_data for delete using (org_id = auth_org_id());
create index if not exists idx_goal_data_goal on public.goal_data (org_id, goal_id, log_date);

-- 3) Resident health logs ----------------------------------------------------
create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  house_id uuid references public.houses(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete cascade,
  kind text not null,           -- bm | seizure | sleep | meal | fluid | weight | vitals | behavior | mood
  amount numeric,               -- weight, ml, minutes, count…
  detail jsonb default '{}'::jsonb,  -- type-specific fields (abc, vitals…)
  note text,
  log_date date not null default current_date,
  occurred_at timestamptz not null default now(),
  recorded_by text,
  recorded_at timestamptz not null default now()
);
alter table public.health_logs enable row level security;
create policy health_logs_select on public.health_logs for select using (org_id = auth_org_id());
create policy health_logs_insert on public.health_logs for insert with check (org_id = auth_org_id());
create policy health_logs_update on public.health_logs for update using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy health_logs_delete on public.health_logs for delete using (org_id = auth_org_id());
create index if not exists idx_health_logs_resident on public.health_logs (org_id, resident_id, kind, log_date);

-- 4) Reportable-incident workflow --------------------------------------------
alter table public.incidents
  add column if not exists reportable boolean default false,
  add column if not exists notified_at timestamptz,
  add column if not exists corrective_action text,
  add column if not exists follow_up_due date;
