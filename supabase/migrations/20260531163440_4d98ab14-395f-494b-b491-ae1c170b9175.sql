
-- 1. Fix coach_athletes athlete UPDATE policy (prevent coach_id tampering)
DROP POLICY IF EXISTS "Athletes can update their invitation status" ON public.coach_athletes;
CREATE POLICY "Athletes can update their invitation status"
ON public.coach_athletes
FOR UPDATE
USING (auth.uid() = athlete_id)
WITH CHECK (
  auth.uid() = athlete_id
  AND coach_id = (SELECT ca.coach_id FROM public.coach_athletes ca WHERE ca.id = coach_athletes.id)
  AND invited_by = (SELECT ca.invited_by FROM public.coach_athletes ca WHERE ca.id = coach_athletes.id)
);

-- 2. Explicit deny on user_roles self-insert (privilege escalation)
DROP POLICY IF EXISTS "Block self role assignment" ON public.user_roles;
CREATE POLICY "Block self role assignment"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Revoke EXECUTE on SECURITY DEFINER helpers from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_pending_athletes_for_coach(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_athletes_for_coach(uuid) TO authenticated, service_role;

-- 4. Restrict storage.objects SELECT on avatars bucket to prevent listing
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
-- Keep public read by file path only (no listing). Public buckets still serve files via getPublicUrl
-- without needing a SELECT policy because they're proxied by Supabase Storage public endpoint.
-- We intentionally do not create a broad SELECT policy.
