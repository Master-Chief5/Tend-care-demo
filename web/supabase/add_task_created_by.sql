-- Track who assigned a task (so a DSP can see when it came from a supervisor/
-- manager). Additive. Applied live as migration "add_task_created_by".
alter table public.tasks
  add column if not exists created_by_name text,
  add column if not exists created_by_role text;
