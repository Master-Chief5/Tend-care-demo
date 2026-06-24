-- ============================================================================
-- Tend Care — RESIDENT PERSONAL FUNDS (PNI) LEDGER  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql, add_events.sql.
--
-- Adds one table backing a regulatory personal-needs-income (PNI) ledger:
--   • resident_funds — one row per deposit / withdrawal against a resident's
--                      personal funds, with an amount, category, and note. A
--                      running balance is computed by the app (sum of deposits
--                      minus withdrawals).
--
-- RLS mirrors the events / house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house can READ
--   • only managers/supervisors create / delete ledger entries (DSP read-only)
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_role(),
-- auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

CREATE TABLE IF NOT EXISTS resident_funds (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id          uuid REFERENCES houses(id) ON DELETE SET NULL,
  resident_id       uuid REFERENCES residents(id) ON DELETE CASCADE,
  resident_name     text,
  entry_date        date NOT NULL DEFAULT current_date,
  type              text NOT NULL,        -- deposit | withdrawal
  amount            numeric(10,2) NOT NULL DEFAULT 0,
  category          text,
  note              text,
  recorded_by_name  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resident_funds_org_house_idx
  ON resident_funds (org_id, house_id);
CREATE INDEX IF NOT EXISTS resident_funds_resident_idx
  ON resident_funds (resident_id, entry_date);

ALTER TABLE resident_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resident_funds_select" ON resident_funds;
DROP POLICY IF EXISTS "resident_funds_insert" ON resident_funds;
DROP POLICY IF EXISTS "resident_funds_delete" ON resident_funds;

-- DSP can read their house's ledger; supervisor sees all.
CREATE POLICY "resident_funds_select" ON resident_funds FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
-- Only managers/supervisors record / delete entries (regulatory: DSP read-only).
CREATE POLICY "resident_funds_insert" ON resident_funds FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
  AND (resident_id IS NULL OR resident_id IN (SELECT id FROM residents r WHERE r.org_id = auth_org_id() AND (auth_staff_role()='supervisor' OR r.house_id IS NULL OR r.house_id = auth_house_id())))
);
CREATE POLICY "resident_funds_delete" ON resident_funds FOR DELETE USING (
  org_id = auth_org_id() AND auth_staff_role() IN ('supervisor','manager')
);
