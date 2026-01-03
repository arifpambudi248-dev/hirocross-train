-- Create a new table for competitions within an annual plan
CREATE TABLE public.plan_competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.annual_plans(id) ON DELETE CASCADE,
  competition_name TEXT NOT NULL,
  competition_date DATE NOT NULL,
  priority INTEGER DEFAULT 1, -- 1 = primary, 2 = secondary, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_competitions ENABLE ROW LEVEL SECURITY;

-- Coaches can manage competitions for their plans
CREATE POLICY "Coaches can manage plan competitions"
ON public.plan_competitions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_competitions.plan_id
    AND ap.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_competitions.plan_id
    AND ap.user_id = auth.uid()
  )
);

-- Athletes can view competitions in their plans
CREATE POLICY "Athletes can view plan competitions"
ON public.plan_competitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_competitions.plan_id
    AND ap.athlete_id = auth.uid()
  )
);

-- Create table for weekly volume/intensity data
CREATE TABLE public.weekly_plan_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.annual_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  planned_volume INTEGER DEFAULT 50,
  planned_intensity INTEGER DEFAULT 50,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, week_number)
);

-- Enable RLS
ALTER TABLE public.weekly_plan_data ENABLE ROW LEVEL SECURITY;

-- Coaches can manage weekly data for their plans
CREATE POLICY "Coaches can manage weekly plan data"
ON public.weekly_plan_data
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = weekly_plan_data.plan_id
    AND ap.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = weekly_plan_data.plan_id
    AND ap.user_id = auth.uid()
  )
);

-- Athletes can view weekly data in their plans
CREATE POLICY "Athletes can view weekly plan data"
ON public.weekly_plan_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = weekly_plan_data.plan_id
    AND ap.athlete_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_weekly_plan_data_updated_at
BEFORE UPDATE ON public.weekly_plan_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();