-- Create physical_tests table
CREATE TABLE IF NOT EXISTS public.physical_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  test_date DATE NOT NULL,
  category TEXT NOT NULL,
  test_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.physical_tests ENABLE ROW LEVEL SECURITY;

-- Create policies for physical_tests
CREATE POLICY "Users can view their own physical tests"
ON public.physical_tests
FOR SELECT
USING (auth.uid() = athlete_id);

CREATE POLICY "Users can insert their own physical tests"
ON public.physical_tests
FOR INSERT
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Users can update their own physical tests"
ON public.physical_tests
FOR UPDATE
USING (auth.uid() = athlete_id);

CREATE POLICY "Users can delete their own physical tests"
ON public.physical_tests
FOR DELETE
USING (auth.uid() = athlete_id);

-- Create readiness_logs table
CREATE TABLE IF NOT EXISTS public.readiness_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  date DATE NOT NULL,
  rhr NUMERIC NOT NULL,
  vj NUMERIC NOT NULL,
  vj_score NUMERIC NOT NULL,
  rhr_score NUMERIC NOT NULL,
  readiness_score NUMERIC NOT NULL,
  readiness_zone TEXT NOT NULL CHECK (readiness_zone IN ('low', 'moderate', 'prime')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, date)
);

-- Enable RLS
ALTER TABLE public.readiness_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for readiness_logs
CREATE POLICY "Users can view their own readiness logs"
ON public.readiness_logs
FOR SELECT
USING (auth.uid() = athlete_id);

CREATE POLICY "Users can insert their own readiness logs"
ON public.readiness_logs
FOR INSERT
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Users can update their own readiness logs"
ON public.readiness_logs
FOR UPDATE
USING (auth.uid() = athlete_id);

CREATE POLICY "Users can delete their own readiness logs"
ON public.readiness_logs
FOR DELETE
USING (auth.uid() = athlete_id);

-- Add baseline columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS baseline_vj NUMERIC DEFAULT 40,
ADD COLUMN IF NOT EXISTS baseline_rhr NUMERIC DEFAULT 60;