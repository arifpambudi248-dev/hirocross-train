CREATE TABLE public.vbt_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  exercise TEXT NOT NULL,
  load_kg NUMERIC,
  method TEXT NOT NULL DEFAULT 'camera',
  reps INTEGER NOT NULL DEFAULT 0,
  rep_velocities JSONB NOT NULL DEFAULT '[]'::jsonb,
  mean_velocity NUMERIC,
  peak_velocity NUMERIC,
  best_velocity NUMERIC,
  velocity_loss_pct NUMERIC,
  zone TEXT,
  est_1rm NUMERIC,
  rom_cm NUMERIC,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vbt_sets TO authenticated;
GRANT ALL ON public.vbt_sets TO service_role;

ALTER TABLE public.vbt_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage their own VBT sets"
ON public.vbt_sets FOR ALL TO authenticated
USING (auth.uid() = athlete_id)
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view their athletes VBT sets"
ON public.vbt_sets FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.coach_athletes ca
  WHERE ca.coach_id = auth.uid()
    AND ca.athlete_id = vbt_sets.athlete_id
    AND ca.status = 'accepted'
));

CREATE INDEX idx_vbt_sets_athlete_date ON public.vbt_sets (athlete_id, date DESC);