-- Create coach_athletes table to manage coach-athlete relationships
CREATE TABLE IF NOT EXISTS public.coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coach_id, athlete_id)
);

-- Enable RLS
ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;

-- Coaches can view their assigned athletes
CREATE POLICY "Coaches can view their assigned athletes"
ON public.coach_athletes
FOR SELECT
TO authenticated
USING (
  auth.uid() = coach_id
  AND has_role(auth.uid(), 'coach'::app_role)
);

-- Coaches can assign athletes to themselves
CREATE POLICY "Coaches can assign athletes"
ON public.coach_athletes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = coach_id
  AND has_role(auth.uid(), 'coach'::app_role)
);

-- Coaches can remove athlete assignments
CREATE POLICY "Coaches can remove assignments"
ON public.coach_athletes
FOR DELETE
TO authenticated
USING (
  auth.uid() = coach_id
  AND has_role(auth.uid(), 'coach'::app_role)
);

-- Create index for performance
CREATE INDEX idx_coach_athletes_coach_id ON public.coach_athletes(coach_id);
CREATE INDEX idx_coach_athletes_athlete_id ON public.coach_athletes(athlete_id);