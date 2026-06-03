-- Optional free-text note per shift (e.g. "Med pass at 8, cover lunch").
-- Applied live as migration add_shift_note.
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS note text;
