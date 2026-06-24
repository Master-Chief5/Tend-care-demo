-- ============================================================================
-- Tend Care — EVENTS (trainings / meetings / appointments)  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql, add_announcements.sql.
--
-- Adds two tables backing a lightweight "Events" sign-up feature:
--   • events        — a scheduled event (org-wide or house-scoped) with a kind,
--                     time, optional location, optional capacity, and a status.
--   • event_rsvps   — per-staff RSVPs (one per staff per event; a staff may
--                     change their RSVP between 'going' and 'declined').
--
-- RLS mirrors the announcements / house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house
--   • only managers/supervisors create / edit / delete events
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: tables use IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  title            text NOT NULL,
  kind             text,                 -- training | meeting | appointment | social
  event_at         timestamptz,
  location         text,
  capacity         int,                  -- NULL = no limit
  created_by_name  text,
  status           text NOT NULL DEFAULT 'active',   -- active | archived
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_org_house_at_idx
  ON events (org_id, house_id, event_at);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "events_insert" ON events;
DROP POLICY IF EXISTS "events_update" ON events;
DROP POLICY IF EXISTS "events_delete" ON events;

CREATE POLICY "events_select" ON events FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors create / edit / delete.
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "events_update" ON events FOR UPDATE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
) WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "events_delete" ON events FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);

-- ── event_rsvps ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_rsvps (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name       text,
  status           text NOT NULL,        -- going | declined
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, staff_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_rsvps_select" ON event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_insert" ON event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_update" ON event_rsvps;

-- Org-scoped read so attendance counts are visible.
CREATE POLICY "event_rsvps_select" ON event_rsvps FOR SELECT USING (
  org_id = auth_org_id()
);
CREATE POLICY "event_rsvps_insert" ON event_rsvps FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
-- Allow changing your RSVP.
CREATE POLICY "event_rsvps_update" ON event_rsvps FOR UPDATE USING (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
) WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
