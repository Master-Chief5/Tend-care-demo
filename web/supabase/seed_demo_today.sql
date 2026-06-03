-- ============================================================
-- Tend Care — restore the "designed" demo look, anchored to TODAY
-- Run in: Supabase Dashboard → SQL Editor → New query  (safe to re-run)
--
-- Why: the demo data was authored for May 28–29. Date-scoped views
-- ("today" schedule, staff-on, drives-today) go empty once the clock
-- moves past those dates. This re-anchors the time-sensitive rows to
-- CURRENT_DATE and seeds the Shop / Med / Note alert content so the
-- Houses dashboard matches the original design screenshots.
--
-- Covers BOTH orgs:
--   • Tend Care Demo  (a1b2c3d4-0000-0000-0000-000000000001) — already
--     has Oak/Willow/Maple/Cedar + 13 shifts; just refresh + seed alerts.
--   • Demmo Care      (7a90dbc5-2ac6-48ac-819d-3b14127462d1) — rebuild
--     the 4 demo houses + shifts/trips/alerts, then remove junk houses.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PHASE 1 · Tend Care Demo — refresh to today + seed alerts
-- ─────────────────────────────────────────────────────────────
UPDATE shifts SET shift_date = CURRENT_DATE WHERE org_id = 'a1b2c3d4-0000-0000-0000-000000000001';
UPDATE trips  SET trip_date  = CURRENT_DATE WHERE org_id = 'a1b2c3d4-0000-0000-0000-000000000001';

INSERT INTO resources (org_id, house_id, name, qty, unit)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001'::uuid, h.id, v.name, v.qty, 'units'
FROM (VALUES
  ('oak','Oat milk',0::numeric), ('oak','Bananas',0), ('oak','Dish soap',0),
  ('willow','Paper towels',1),   ('willow','Chicken breast',1)
) AS v(slug, name, qty)
JOIN houses h ON h.org_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND h.slug = v.slug
WHERE NOT EXISTS (SELECT 1 FROM resources r WHERE r.house_id = h.id AND r.name = v.name);

INSERT INTO med_alerts (org_id, house_id, resident_name, text)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001'::uuid, h.id, 'R. Johnson', '2pm meds need second signoff'
FROM houses h WHERE h.org_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND h.slug = 'oak'
AND NOT EXISTS (SELECT 1 FROM med_alerts m WHERE m.house_id = h.id AND m.text = '2pm meds need second signoff');

INSERT INTO shift_notes (org_id, house_id, author_name, text, read)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001'::uuid, h.id, 'Devon', 'Counted morning meds — all good. Fridge light is out, maintenance flagged.', false
FROM houses h WHERE h.org_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND h.slug = 'willow'
AND NOT EXISTS (SELECT 1 FROM shift_notes n WHERE n.house_id = h.id AND n.author_name = 'Devon');

-- ─────────────────────────────────────────────────────────────
-- PHASE 2 · Demmo Care — rebuild the 4 demo houses + data, drop junk
-- ─────────────────────────────────────────────────────────────
-- 2a. Houses (create if missing)
INSERT INTO houses (org_id, slug, name, short, color, branch, manager_name, residents_count)
SELECT '7a90dbc5-2ac6-48ac-819d-3b14127462d1'::uuid, v.slug, v.name, v.short, v.color, v.branch, v.mgr, v.res
FROM (VALUES
  ('oak','Oak House','OAK','#d4a64a','North','Aisha M.',4),
  ('willow','Willow Run','WLW','#2f9489','North','Devon P.',4),
  ('maple','Maple Run','MPL','#cf4f3b','South','Saira K.',5),
  ('cedar','Cedar Ridge','CDR','#6e4d8f','South','Tomas R.',5)
) AS v(slug, name, short, color, branch, mgr, res)
WHERE NOT EXISTS (
  SELECT 1 FROM houses h WHERE h.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND h.slug = v.slug
);

-- 2b. Shifts for today (only if this org has none today yet)
INSERT INTO shifts (org_id, house_id, person_name, role, start_hour, end_hour, shift_date, status)
SELECT '7a90dbc5-2ac6-48ac-819d-3b14127462d1'::uuid, h.id, v.person, v.role, v.sh, v.eh, CURRENT_DATE, v.status
FROM (VALUES
  ('oak','Aisha M.','Lead',7,15,'here'),     ('oak','Jay B.','DSP',7,15,'here'),
  ('oak','Carmen V.','DSP',15,23,'scheduled'),('oak','Brian L.','Awake OT',23,31,'scheduled'),
  ('willow','Devon P.','Mgr',7,15,'here'),   ('willow','Theo W.','PT',9,13,'scheduled'),
  ('willow','OPEN','DSP',15,23,'open'),
  ('maple','Saira K.','Mgr',7,15,'here'),    ('maple','Marcus L.','DSP',7.2,15.2,'late'),
  ('maple','Reni T.','DSP',11,19,'scheduled'),('maple','Iris H.','DSP',19,27,'scheduled'),
  ('cedar','Tomas R.','Mgr',7,15,'here'),    ('cedar','Priya N.','DSP',15,23,'swap')
) AS v(slug, person, role, sh, eh, status)
JOIN houses h ON h.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND h.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM shifts s WHERE s.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND s.shift_date = CURRENT_DATE
);

-- 2c. Trips for today
INSERT INTO trips (org_id, house_id, driver_name, resident_name, destination, miles, purpose, trip_date)
SELECT '7a90dbc5-2ac6-48ac-819d-3b14127462d1'::uuid, h.id, v.driver, v.resident, v.dest, v.miles, v.purpose, CURRENT_DATE
FROM (VALUES
  ('willow','Devon P.','K. Adams','Walmart',3.8,'grocery'),
  ('maple','Saira K.','J. Cole','Day program',6.1,'activity'),
  ('oak','Aisha M.','M. Lee','Dr. Patel',4.2,'medical')
) AS v(slug, driver, resident, dest, miles, purpose)
JOIN houses h ON h.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND h.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM trips t WHERE t.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND t.trip_date = CURRENT_DATE
);

-- 2d. Shop / Med / Note alerts
INSERT INTO resources (org_id, house_id, name, qty, unit)
SELECT '7a90dbc5-2ac6-48ac-819d-3b14127462d1'::uuid, h.id, v.name, v.qty, 'units'
FROM (VALUES
  ('oak','Oat milk',0::numeric), ('oak','Bananas',0), ('oak','Dish soap',0),
  ('willow','Paper towels',1),   ('willow','Chicken breast',1)
) AS v(slug, name, qty)
JOIN houses h ON h.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND h.slug = v.slug
WHERE NOT EXISTS (SELECT 1 FROM resources r WHERE r.house_id = h.id AND r.name = v.name);

INSERT INTO med_alerts (org_id, house_id, resident_name, text)
SELECT '7a90dbc5-2ac6-48ac-819d-3b14127462d1'::uuid, h.id, 'R. Johnson', '2pm meds need second signoff'
FROM houses h WHERE h.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND h.slug = 'oak'
AND NOT EXISTS (SELECT 1 FROM med_alerts m WHERE m.house_id = h.id AND m.text = '2pm meds need second signoff');

INSERT INTO shift_notes (org_id, house_id, author_name, text, read)
SELECT '7a90dbc5-2ac6-48ac-819d-3b14127462d1'::uuid, h.id, 'Devon', 'Counted morning meds — all good. Fridge light is out, maintenance flagged.', false
FROM houses h WHERE h.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1' AND h.slug = 'willow'
AND NOT EXISTS (SELECT 1 FROM shift_notes n WHERE n.house_id = h.id AND n.author_name = 'Devon');

-- 2e. Remove junk test houses (only those with no dependent rows)
DELETE FROM houses h
WHERE h.org_id = '7a90dbc5-2ac6-48ac-819d-3b14127462d1'
  AND h.slug NOT IN ('oak','willow','maple','cedar')
  AND NOT EXISTS (SELECT 1 FROM shifts     s WHERE s.house_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM trips      t WHERE t.house_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM resources  r WHERE r.house_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM residents  d WHERE d.house_id = h.id)
  AND NOT EXISTS (SELECT 1 FROM vehicles   v WHERE v.house_id = h.id);

-- ── Verify ────────────────────────────────────────────────────
SELECT o.name AS org,
  (SELECT count(*) FROM houses      WHERE org_id=o.id) AS houses,
  (SELECT count(*) FROM shifts      WHERE org_id=o.id AND shift_date=CURRENT_DATE) AS shifts_today,
  (SELECT count(*) FROM trips       WHERE org_id=o.id AND trip_date=CURRENT_DATE)  AS trips_today,
  (SELECT count(*) FROM resources   WHERE org_id=o.id) AS resources,
  (SELECT count(*) FROM med_alerts  WHERE org_id=o.id) AS med_alerts,
  (SELECT count(*) FROM shift_notes WHERE org_id=o.id) AS shift_notes
FROM organizations o
WHERE o.id IN ('a1b2c3d4-0000-0000-0000-000000000001','7a90dbc5-2ac6-48ac-819d-3b14127462d1');
