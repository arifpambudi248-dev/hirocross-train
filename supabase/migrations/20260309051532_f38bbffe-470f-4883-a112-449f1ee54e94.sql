
CREATE TABLE public.baseline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value numeric NOT NULL,
  new_value numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.baseline_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own baseline history"
ON public.baseline_history FOR SELECT
USING (auth.uid() = athlete_id);

CREATE POLICY "Users can insert their own baseline history"
ON public.baseline_history FOR INSERT
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view assigned athletes baseline history"
ON public.baseline_history FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) AND 
  EXISTS (
    SELECT 1 FROM coach_athletes 
    WHERE coach_athletes.coach_id = auth.uid() 
    AND coach_athletes.athlete_id = baseline_history.athlete_id 
    AND coach_athletes.status = 'accepted'
  )
);

CREATE POLICY "Coaches can insert baseline history for assigned athletes"
ON public.baseline_history FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) AND 
  EXISTS (
    SELECT 1 FROM coach_athletes 
    WHERE coach_athletes.coach_id = auth.uid() 
    AND coach_athletes.athlete_id = baseline_history.athlete_id 
    AND coach_athletes.status = 'accepted'
  )
);
