ALTER TABLE public.coach_athletes 
ADD COLUMN status text NOT NULL DEFAULT 'accepted',
ADD COLUMN invited_by text NOT NULL DEFAULT 'coach',
ADD COLUMN created_by uuid;

ALTER TABLE public.coach_athletes
ADD CONSTRAINT status_check CHECK (status IN ('pending', 'accepted', 'rejected')),
ADD CONSTRAINT invited_by_check CHECK (invited_by IN ('coach', 'athlete'));

CREATE INDEX idx_coach_athletes_status ON public.coach_athletes(status);