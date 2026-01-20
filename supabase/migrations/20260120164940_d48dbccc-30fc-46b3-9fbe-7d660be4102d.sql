-- Add biomotor_config column to annual_plans table
ALTER TABLE public.annual_plans 
ADD COLUMN IF NOT EXISTS biomotor_config jsonb DEFAULT '{"kekuatan": 10000, "kecepatan": 800, "dayaTahan": 20, "teknik": 500, "taktik": 200}'::jsonb;

-- Create table for tracking actual biomotor values per week
CREATE TABLE public.weekly_biomotor_actuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.annual_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  kekuatan NUMERIC DEFAULT 0,
  kecepatan NUMERIC DEFAULT 0,
  daya_tahan NUMERIC DEFAULT 0,
  teknik NUMERIC DEFAULT 0,
  taktik NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, week_number)
);

-- Enable RLS
ALTER TABLE public.weekly_biomotor_actuals ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own biomotor actuals
CREATE POLICY "Athletes can view their biomotor actuals"
ON public.weekly_biomotor_actuals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM annual_plans ap
    WHERE ap.id = weekly_biomotor_actuals.plan_id
    AND ap.athlete_id = auth.uid()
  )
);

-- Athletes can manage their own biomotor actuals
CREATE POLICY "Athletes can manage their biomotor actuals"
ON public.weekly_biomotor_actuals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM annual_plans ap
    WHERE ap.id = weekly_biomotor_actuals.plan_id
    AND ap.athlete_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM annual_plans ap
    WHERE ap.id = weekly_biomotor_actuals.plan_id
    AND ap.athlete_id = auth.uid()
  )
);

-- Coaches can view biomotor actuals for their athletes' plans
CREATE POLICY "Coaches can view athletes biomotor actuals"
ON public.weekly_biomotor_actuals
FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) AND
  EXISTS (
    SELECT 1 FROM annual_plans ap
    WHERE ap.id = weekly_biomotor_actuals.plan_id
    AND ap.user_id = auth.uid()
  )
);

-- Coaches can manage biomotor actuals for their athletes' plans
CREATE POLICY "Coaches can manage athletes biomotor actuals"
ON public.weekly_biomotor_actuals
FOR ALL
USING (
  has_role(auth.uid(), 'coach'::app_role) AND
  EXISTS (
    SELECT 1 FROM annual_plans ap
    WHERE ap.id = weekly_biomotor_actuals.plan_id
    AND ap.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) AND
  EXISTS (
    SELECT 1 FROM annual_plans ap
    WHERE ap.id = weekly_biomotor_actuals.plan_id
    AND ap.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_weekly_biomotor_actuals_updated_at
BEFORE UPDATE ON public.weekly_biomotor_actuals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();