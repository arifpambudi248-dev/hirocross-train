-- Add body_weight column to profiles table for baseline body weight
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS body_weight numeric DEFAULT NULL;

-- Add body_weight column to readiness_logs table for daily body weight tracking
ALTER TABLE public.readiness_logs ADD COLUMN IF NOT EXISTS body_weight numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.body_weight IS 'Baseline body weight in kg';
COMMENT ON COLUMN public.readiness_logs.body_weight IS 'Daily body weight in kg';