-- ============================================================================
-- Tend Care — ANNOUNCEMENTS / UPDATES feed  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql, add_timeoff_activity.sql.
--
-- Adds three tables backing a lightweight "Updates / Announcements" feed:
--   • announcements          — a post (org-wide or house-scoped) with optional
--                              role audience filter, optional poll, optional
--                              "require read" acknowledgement.
--   • announcement_reads     — per-staff read receipts (one per staff per post).
--   • announcement_poll_votes— per-staff poll votes (one per staff per post; a
--                              staff may change their vote).
--
-- RLS mirrors the house-scoping model already in use:
--   • supervisor → full org access
--   • manager / DSP → org-wide (house_id IS NULL) + own house, further narrowed
--     by audience_roles when set.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: tables use IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── announcements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- NULL = org-wide "All staff"
  author_staff_id  uuid REFERENCES staff(id) ON DELETE SET NULL,
  author_name      text,
  author_role      text,
  title            text,
  body             text NOT NULL,
  bg               text,                 -- background style key (sage | clay | blue | amber | plain)
  audience_roles   text[],               -- NULL/empty = everyone; else only these roles see it
  poll_question    text,
  poll_options     text[],               -- empty/NULL = no poll
  require_read     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_org_house_created_idx
  ON announcements (org_id, house_id, created_at);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON announcements;
DROP POLICY IF EXISTS "announcements_insert" ON announcements;
DROP POLICY IF EXISTS "announcements_update" ON announcements;
DROP POLICY IF EXISTS "announcements_delete" ON announcements;

CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (
  org_id = auth_org_id()
  AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
  AND (audience_roles IS NULL OR cardinality(audience_roles) = 0 OR auth_staff_role() = ANY(audience_roles))
);
-- Only managers/supervisors post.
CREATE POLICY "announcements_insert" ON announcements FOR INSERT WITH CHECK (
  org_id = auth_org_id()
  AND (author_staff_id = auth_staff_id() OR author_staff_id IS NULL)
  AND auth_staff_role() IN ('supervisor','manager')
);
CREATE POLICY "announcements_update" ON announcements FOR UPDATE USING (
  org_id = auth_org_id() AND (author_staff_id = auth_staff_id() OR auth_staff_role() = 'supervisor')
) WITH CHECK (
  org_id = auth_org_id() AND (author_staff_id = auth_staff_id() OR auth_staff_role() = 'supervisor')
);
CREATE POLICY "announcements_delete" ON announcements FOR DELETE USING (
  org_id = auth_org_id() AND (author_staff_id = auth_staff_id() OR auth_staff_role() = 'supervisor')
);

-- ── announcement_reads ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_reads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id  uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name       text,
  read_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, staff_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcement_reads_select" ON announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_insert" ON announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_delete" ON announcement_reads;

-- Authors/admins can see who read; org-scoped read is fine.
CREATE POLICY "announcement_reads_select" ON announcement_reads FOR SELECT USING (
  org_id = auth_org_id()
);
CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
CREATE POLICY "announcement_reads_delete" ON announcement_reads FOR DELETE USING (
  org_id = auth_org_id() AND staff_id = auth_staff_id()
);

-- ── announcement_poll_votes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_poll_votes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id  uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  choice           int NOT NULL,
  UNIQUE (announcement_id, staff_id)
);

ALTER TABLE announcement_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcement_poll_votes_select" ON announcement_poll_votes;
DROP POLICY IF EXISTS "announcement_poll_votes_insert" ON announcement_poll_votes;
DROP POLICY IF EXISTS "announcement_poll_votes_update" ON announcement_poll_votes;

CREATE POLICY "announcement_poll_votes_select" ON announcement_poll_votes FOR SELECT USING (
  org_id = auth_org_id()
);
CREATE POLICY "announcement_poll_votes_insert" ON announcement_poll_votes FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (staff_id = auth_staff_id() OR staff_id IS NULL)
);
-- Allow changing your vote.
CREATE POLICY "announcement_poll_votes_update" ON announcement_poll_votes FOR UPDATE USING (
  org_id = auth_org_id() AND staff_id = auth_staff_id()
) WITH CHECK (
  org_id = auth_org_id() AND staff_id = auth_staff_id()
);
