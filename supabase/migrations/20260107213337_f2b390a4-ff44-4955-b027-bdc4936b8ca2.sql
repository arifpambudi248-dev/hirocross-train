-- Table for storing weekly training focus data
CREATE TABLE public.weekly_training_focus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.annual_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  focus_type TEXT NOT NULL, -- 'kekuatan', 'kecepatan', 'daya_tahan', 'fleksibilitas', 'mental'
  intensity_level INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, week_number, focus_type)
);

-- Table for storing weekly tests
CREATE TABLE public.weekly_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.annual_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  test_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_training_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_training_focus
CREATE POLICY "Coaches can manage training focus for their plans"
ON public.weekly_training_focus
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_id AND ap.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_id AND ap.user_id = auth.uid()
  )
);

CREATE POLICY "Athletes can view training focus for their plans"
ON public.weekly_training_focus
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_id AND ap.athlete_id = auth.uid()
  )
);

-- RLS policies for weekly_tests
CREATE POLICY "Coaches can manage tests for their plans"
ON public.weekly_tests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_id AND ap.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_id AND ap.user_id = auth.uid()
  )
);

CREATE POLICY "Athletes can view tests for their plans"
ON public.weekly_tests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.annual_plans ap
    WHERE ap.id = plan_id AND ap.athlete_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_weekly_training_focus_updated_at
BEFORE UPDATE ON public.weekly_training_focus
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_tests_updated_at
BEFORE UPDATE ON public.weekly_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();