-- Per-house geofence: a location pin + alert radius, so on-duty staff who leave
-- the perimeter can be flagged to the supervisor. Additive. Applied live as
-- migration "add_house_geofence".
alter table public.houses
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geofence_m integer not null default 200;
