-- Add athlete_id to annual_plans table
-- This separates the creator (coach) from the athlete the plan is for
ALTER TABLE public.annual_plans 
ADD COLUMN athlete_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing plans to set athlete_id same as user_id (for backward compatibility)
UPDATE public.annual_plans 
SET athlete_id = user_id 
WHERE athlete_id IS NULL;

-- Make athlete_id NOT NULL after backfilling
ALTER TABLE public.annual_plans 
ALTER COLUMN athlete_id SET NOT NULL;

-- Update RLS policies for annual_plans
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own annual plans" ON public.annual_plans;
DROP POLICY IF EXISTS "Users can create their own annual plans" ON public.annual_plans;
DROP POLICY IF EXISTS "Users can update their own annual plans" ON public.annual_plans;
DROP POLICY IF EXISTS "Users can delete their own annual plans" ON public.annual_plans;

-- New policies for coach-athlete relationship
-- Athletes can view plans created FOR them
CREATE POLICY "Athletes can view their annual plans" 
ON public.annual_plans 
FOR SELECT 
USING (auth.uid() = athlete_id);

-- Athletes CANNOT create plans (only coaches can)
-- (no INSERT policy for regular users)

-- Athletes CANNOT update plans
-- (no UPDATE policy for regular users)

-- Athletes CANNOT delete plans
-- (no DELETE policy for regular users)

-- Keep coach policies as they were
-- Coaches already have full access via existing policies

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_annual_plans_athlete_id ON public.annual_plans(athlete_id);