-- Fix coach data isolation: Update RLS policies to check coach_athletes relationship

-- Drop existing overly permissive coach policies

-- training_sessions
DROP POLICY IF EXISTS "Coaches can view all training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Coaches can update all training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Coaches can delete all training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Coaches can create training sessions for any athlete" ON public.training_sessions;

-- physical_tests
DROP POLICY IF EXISTS "Coaches can view all physical tests" ON public.physical_tests;
DROP POLICY IF EXISTS "Coaches can update all physical tests" ON public.physical_tests;
DROP POLICY IF EXISTS "Coaches can delete all physical tests" ON public.physical_tests;
DROP POLICY IF EXISTS "Coaches can create physical tests for any athlete" ON public.physical_tests;

-- readiness_logs
DROP POLICY IF EXISTS "Coaches can view all readiness logs" ON public.readiness_logs;
DROP POLICY IF EXISTS "Coaches can update all readiness logs" ON public.readiness_logs;
DROP POLICY IF EXISTS "Coaches can delete all readiness logs" ON public.readiness_logs;
DROP POLICY IF EXISTS "Coaches can create readiness logs for any athlete" ON public.readiness_logs;

-- annual_plans
DROP POLICY IF EXISTS "Coaches can view all annual plans" ON public.annual_plans;
DROP POLICY IF EXISTS "Coaches can update all annual plans" ON public.annual_plans;
DROP POLICY IF EXISTS "Coaches can delete all annual plans" ON public.annual_plans;
DROP POLICY IF EXISTS "Coaches can create annual plans for any athlete" ON public.annual_plans;

-- athlete_goals
DROP POLICY IF EXISTS "Coaches can view all athlete goals" ON public.athlete_goals;
DROP POLICY IF EXISTS "Coaches can update all athlete goals" ON public.athlete_goals;
DROP POLICY IF EXISTS "Coaches can delete all athlete goals" ON public.athlete_goals;
DROP POLICY IF EXISTS "Coaches can create goals for any athlete" ON public.athlete_goals;

-- session_exercises (linked to training_sessions)
DROP POLICY IF EXISTS "Coaches can view all session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Coaches can update all session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Coaches can delete all session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Coaches can create exercises for any session" ON public.session_exercises;

-- training_templates
DROP POLICY IF EXISTS "Coaches can view all templates" ON public.training_templates;
DROP POLICY IF EXISTS "Coaches can update all templates" ON public.training_templates;
DROP POLICY IF EXISTS "Coaches can delete all templates" ON public.training_templates;
DROP POLICY IF EXISTS "Coaches can create templates for any user" ON public.training_templates;

-- Create new coach policies with relationship check

-- training_sessions (uses user_id as athlete identifier)
CREATE POLICY "Coaches can view assigned athletes training sessions"
ON public.training_sessions FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = training_sessions.user_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can create training sessions for assigned athletes"
ON public.training_sessions FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = training_sessions.user_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can update assigned athletes training sessions"
ON public.training_sessions FOR UPDATE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = training_sessions.user_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes training sessions"
ON public.training_sessions FOR DELETE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = training_sessions.user_id 
    AND status = 'accepted'
  )
);

-- physical_tests (uses athlete_id)
CREATE POLICY "Coaches can view assigned athletes physical tests"
ON public.physical_tests FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = physical_tests.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can create physical tests for assigned athletes"
ON public.physical_tests FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = physical_tests.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can update assigned athletes physical tests"
ON public.physical_tests FOR UPDATE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = physical_tests.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes physical tests"
ON public.physical_tests FOR DELETE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = physical_tests.athlete_id 
    AND status = 'accepted'
  )
);

-- readiness_logs (uses athlete_id)
CREATE POLICY "Coaches can view assigned athletes readiness logs"
ON public.readiness_logs FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = readiness_logs.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can create readiness logs for assigned athletes"
ON public.readiness_logs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = readiness_logs.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can update assigned athletes readiness logs"
ON public.readiness_logs FOR UPDATE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = readiness_logs.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes readiness logs"
ON public.readiness_logs FOR DELETE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = readiness_logs.athlete_id 
    AND status = 'accepted'
  )
);

-- annual_plans (uses athlete_id)
CREATE POLICY "Coaches can view assigned athletes annual plans"
ON public.annual_plans FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = annual_plans.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can create annual plans for assigned athletes"
ON public.annual_plans FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = annual_plans.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can update assigned athletes annual plans"
ON public.annual_plans FOR UPDATE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = annual_plans.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes annual plans"
ON public.annual_plans FOR DELETE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = annual_plans.athlete_id 
    AND status = 'accepted'
  )
);

-- athlete_goals (uses athlete_id)
CREATE POLICY "Coaches can view assigned athletes goals"
ON public.athlete_goals FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = athlete_goals.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can create goals for assigned athletes"
ON public.athlete_goals FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = athlete_goals.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can update assigned athletes goals"
ON public.athlete_goals FOR UPDATE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = athlete_goals.athlete_id 
    AND status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes goals"
ON public.athlete_goals FOR DELETE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.coach_athletes 
    WHERE coach_id = auth.uid() 
    AND athlete_id = athlete_goals.athlete_id 
    AND status = 'accepted'
  )
);

-- session_exercises (linked via training_sessions)
CREATE POLICY "Coaches can view assigned athletes session exercises"
ON public.session_exercises FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.training_sessions ts
    JOIN public.coach_athletes ca ON ca.athlete_id = ts.user_id
    WHERE ts.id = session_exercises.session_id 
    AND ca.coach_id = auth.uid() 
    AND ca.status = 'accepted'
  )
);

CREATE POLICY "Coaches can create exercises for assigned athletes sessions"
ON public.session_exercises FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.training_sessions ts
    JOIN public.coach_athletes ca ON ca.athlete_id = ts.user_id
    WHERE ts.id = session_exercises.session_id 
    AND ca.coach_id = auth.uid() 
    AND ca.status = 'accepted'
  )
);

CREATE POLICY "Coaches can update assigned athletes session exercises"
ON public.session_exercises FOR UPDATE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.training_sessions ts
    JOIN public.coach_athletes ca ON ca.athlete_id = ts.user_id
    WHERE ts.id = session_exercises.session_id 
    AND ca.coach_id = auth.uid() 
    AND ca.status = 'accepted'
  )
);

CREATE POLICY "Coaches can delete assigned athletes session exercises"
ON public.session_exercises FOR DELETE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.training_sessions ts
    JOIN public.coach_athletes ca ON ca.athlete_id = ts.user_id
    WHERE ts.id = session_exercises.session_id 
    AND ca.coach_id = auth.uid() 
    AND ca.status = 'accepted'
  )
);

-- training_templates (uses user_id - coaches can only manage their own templates)
CREATE POLICY "Coaches can view their own templates"
ON public.training_templates FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND user_id = auth.uid()
);

CREATE POLICY "Coaches can create their own templates"
ON public.training_templates FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role) 
  AND user_id = auth.uid()
);

CREATE POLICY "Coaches can update their own templates"
ON public.training_templates FOR UPDATE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND user_id = auth.uid()
);

CREATE POLICY "Coaches can delete their own templates"
ON public.training_templates FOR DELETE
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND user_id = auth.uid()
);

-- profiles - coaches can only view profiles of assigned athletes (keep existing policy for viewing all coach profiles)
DROP POLICY IF EXISTS "Coaches can view all profiles" ON public.profiles;

CREATE POLICY "Coaches can view assigned athletes profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND (
    -- Can view own profile
    id = auth.uid()
    -- Can view assigned athletes
    OR EXISTS (
      SELECT 1 FROM public.coach_athletes 
      WHERE coach_id = auth.uid() 
      AND athlete_id = profiles.id 
      AND status = 'accepted'
    )
    -- Can view pending athletes (for invitation management)
    OR EXISTS (
      SELECT 1 FROM public.coach_athletes 
      WHERE coach_id = auth.uid() 
      AND athlete_id = profiles.id 
      AND status = 'pending'
    )
  )
);