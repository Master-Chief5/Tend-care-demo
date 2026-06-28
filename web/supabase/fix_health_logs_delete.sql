-- Close the HealthLogs delete hole. The original policy let ANY org member delete
-- retained clinical records (seizures, vitals, BMs). The cycle-4 UI gate hides the
-- button, but deleteHealthLog() is still reachable — enforce the role at the DB.
--
-- Apply to production (project ztatmhxvvthlevddqqdl) once authorized.

drop policy if exists health_logs_delete on public.health_logs;
create policy health_logs_delete on public.health_logs
  for delete using (
    org_id = auth_org_id()
    and auth_staff_role() in ('supervisor', 'manager')
  );
