
-- Add RLS policy to allow coaches to view basic info of all athletes for search/discovery
-- This is needed so coaches can search and find registered athletes to assign

CREATE POLICY "Coaches can view athlete basic profiles for search" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach'::app_role) 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'athlete'
  )
);

-- Also allow athletes to view basic info of all coaches for search/discovery
CREATE POLICY "Athletes can view coach basic profiles for search" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'athlete'::app_role) 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'coach'
  )
);
