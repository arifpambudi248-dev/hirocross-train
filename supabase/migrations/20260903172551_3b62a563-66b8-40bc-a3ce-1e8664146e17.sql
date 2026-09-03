ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS use_vbt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_velocity_min numeric,
  ADD COLUMN IF NOT EXISTS target_velocity_max numeric;

ALTER TABLE public.vbt_sets
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS session_exercise_id uuid REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS set_number integer,
  ADD COLUMN IF NOT EXISTS target_velocity_min numeric,
  ADD COLUMN IF NOT EXISTS target_velocity_max numeric;

CREATE INDEX IF NOT EXISTS idx_vbt_sets_session_exercise ON public.vbt_sets(session_exercise_id);
CREATE INDEX IF NOT EXISTS idx_vbt_sets_session ON public.vbt_sets(session_id);