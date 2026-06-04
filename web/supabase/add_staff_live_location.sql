-- On-duty staff location sharing + supervisor team map.
-- Staff share their location only while "on duty" (an explicit, consent-based
-- toggle in My Day); supervisors see on-duty staff on a live map. Stored on the
-- staff row. Additive only. Applied live as migration "add_staff_live_location".
--
-- The existing staff RLS already lets an org member update staff rows in their
-- org (staff_update_manager: org_id = auth_org_id()), so a staff member can
-- write their own cur_lat/cur_lng — no new policies needed.
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS cur_lat double precision,
  ADD COLUMN IF NOT EXISTS cur_lng double precision,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_duty boolean NOT NULL DEFAULT false;
