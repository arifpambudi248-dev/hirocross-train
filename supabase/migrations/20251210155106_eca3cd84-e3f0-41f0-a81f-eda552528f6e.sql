-- Allow coaches to update coach_athletes records where they are the coach
CREATE POLICY "Coaches can update their athlete relationships"
ON public.coach_athletes
FOR UPDATE
USING (auth.uid() = coach_id AND has_role(auth.uid(), 'coach'::app_role));