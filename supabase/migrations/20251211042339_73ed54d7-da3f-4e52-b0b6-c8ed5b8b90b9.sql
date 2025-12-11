-- Drop the security definer view that was flagged by the linter
-- The secure function get_pending_athletes_for_coach() is sufficient
DROP VIEW IF EXISTS public.pending_athlete_names;