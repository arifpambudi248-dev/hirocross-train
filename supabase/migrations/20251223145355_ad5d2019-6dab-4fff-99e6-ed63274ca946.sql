-- Add text columns for warmup, cooldown, and recovery notes to training_sessions
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS warmup_notes TEXT,
ADD COLUMN IF NOT EXISTS cooldown_notes TEXT,
ADD COLUMN IF NOT EXISTS recovery_notes TEXT;