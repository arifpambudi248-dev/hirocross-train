
-- Drop the broad SELECT policy allowing listing of avatars
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;

-- Revoke EXECUTE on remaining SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_session_volumes() FROM anon, authenticated, public;
