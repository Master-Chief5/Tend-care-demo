-- ============================================================
-- Tend Care — Houses "Needs attention" data
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- Adds two org-scoped tables that power the real (non-demo) alert rows
-- on the Houses dashboard cards:
--   • med_alerts  — medication / MAR items needing attention
--   • shift_notes — notes left between shifts (unread = needs attention)
--
-- The existing `resources` table powers the "Shop" rows and `trips`
-- powers the "Drive" rows, so no extra tables are needed for those.
-- ============================================================

CREATE TABLE IF NOT EXISTS med_alerts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      UUID        REFERENCES houses(id) ON DELETE CASCADE,
  resident_name TEXT,
  text          TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  due_at        TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id    UUID        REFERENCES houses(id) ON DELETE CASCADE,
  author_name TEXT,
  text        TEXT        NOT NULL,
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS med_alerts_org_house_idx  ON med_alerts (org_id, house_id);
CREATE INDEX IF NOT EXISTS shift_notes_org_house_idx ON shift_notes (org_id, house_id);

ALTER TABLE med_alerts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "med_alerts_select"  ON med_alerts;
DROP POLICY IF EXISTS "med_alerts_insert"  ON med_alerts;
DROP POLICY IF EXISTS "med_alerts_update"  ON med_alerts;
DROP POLICY IF EXISTS "med_alerts_delete"  ON med_alerts;
DROP POLICY IF EXISTS "shift_notes_select" ON shift_notes;
DROP POLICY IF EXISTS "shift_notes_insert" ON shift_notes;
DROP POLICY IF EXISTS "shift_notes_update" ON shift_notes;
DROP POLICY IF EXISTS "shift_notes_delete" ON shift_notes;

CREATE POLICY "med_alerts_select" ON med_alerts FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "med_alerts_insert" ON med_alerts FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "med_alerts_update" ON med_alerts FOR UPDATE USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());
CREATE POLICY "med_alerts_delete" ON med_alerts FOR DELETE USING (org_id = auth_org_id());

CREATE POLICY "shift_notes_select" ON shift_notes FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "shift_notes_insert" ON shift_notes FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "shift_notes_update" ON shift_notes FOR UPDATE USING (org_id = auth_org_id()) WITH CHECK (org_id = auth_org_id());
CREATE POLICY "shift_notes_delete" ON shift_notes FOR DELETE USING (org_id = auth_org_id());
