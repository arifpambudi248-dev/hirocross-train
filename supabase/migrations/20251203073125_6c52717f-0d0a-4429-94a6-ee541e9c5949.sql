-- Add RLS policy for athletes to view their invitations
CREATE POLICY "Athletes can view their pending invitations" 
ON public.coach_athletes 
FOR SELECT 
USING (auth.uid() = athlete_id);

-- Add RLS policy for athletes to update invitation status (accept/reject)
CREATE POLICY "Athletes can update their invitation status" 
ON public.coach_athletes 
FOR UPDATE 
USING (auth.uid() = athlete_id);

-- Add RLS policy for athletes to send join requests to coaches
CREATE POLICY "Athletes can send join requests" 
ON public.coach_athletes 
FOR INSERT 
WITH CHECK (auth.uid() = athlete_id AND invited_by = 'athlete' AND status = 'pending');

-- Add RLS policy for athletes to cancel their own requests
CREATE POLICY "Athletes can cancel their own requests" 
ON public.coach_athletes 
FOR DELETE 
USING (auth.uid() = athlete_id AND invited_by = 'athlete');