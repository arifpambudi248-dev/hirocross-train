-- Allow athletes to create, update, and delete their own annual plans
CREATE POLICY "Athletes can create their own annual plans"
ON public.annual_plans
FOR INSERT
WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update their own annual plans"
ON public.annual_plans
FOR UPDATE
USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can delete their own annual plans"
ON public.annual_plans
FOR DELETE
USING (auth.uid() = athlete_id);