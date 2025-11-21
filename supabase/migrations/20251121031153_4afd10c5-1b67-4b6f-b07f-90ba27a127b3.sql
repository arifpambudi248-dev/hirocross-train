-- Update RLS policies to allow coaches to view all data

-- Profiles: Allow coaches to view all profiles
CREATE POLICY "Coaches can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

-- Training Sessions: Allow coaches to view and manage all sessions
CREATE POLICY "Coaches can view all training sessions"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can create training sessions for any athlete"
ON public.training_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can update all training sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can delete all training sessions"
ON public.training_sessions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

-- Physical Tests: Allow coaches to view and manage all tests
CREATE POLICY "Coaches can view all physical tests"
ON public.physical_tests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can create physical tests for any athlete"
ON public.physical_tests
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can update all physical tests"
ON public.physical_tests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can delete all physical tests"
ON public.physical_tests
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

-- Readiness Logs: Allow coaches to view and manage all readiness logs
CREATE POLICY "Coaches can view all readiness logs"
ON public.readiness_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can create readiness logs for any athlete"
ON public.readiness_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can update all readiness logs"
ON public.readiness_logs
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can delete all readiness logs"
ON public.readiness_logs
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

-- Athlete Goals: Allow coaches to view and manage all goals
CREATE POLICY "Coaches can view all athlete goals"
ON public.athlete_goals
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can create goals for any athlete"
ON public.athlete_goals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can update all athlete goals"
ON public.athlete_goals
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can delete all athlete goals"
ON public.athlete_goals
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

-- Annual Plans: Allow coaches to view and manage all annual plans
CREATE POLICY "Coaches can view all annual plans"
ON public.annual_plans
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can create annual plans for any athlete"
ON public.annual_plans
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can update all annual plans"
ON public.annual_plans
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);

CREATE POLICY "Coaches can delete all annual plans"
ON public.annual_plans
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
);