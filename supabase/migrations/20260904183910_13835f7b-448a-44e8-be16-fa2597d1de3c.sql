ALTER TABLE public.vbt_sets
  ADD COLUMN IF NOT EXISTS rep_powers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mean_power numeric,
  ADD COLUMN IF NOT EXISTS peak_power numeric,
  ADD COLUMN IF NOT EXISTS avg_velocity numeric,
  ADD COLUMN IF NOT EXISTS rom_auto boolean NOT NULL DEFAULT false;