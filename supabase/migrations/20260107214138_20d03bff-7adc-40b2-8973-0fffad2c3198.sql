-- Add label column to weekly_training_focus for storing text like "Adaptasi Anatomi"
ALTER TABLE public.weekly_training_focus 
ADD COLUMN label TEXT;