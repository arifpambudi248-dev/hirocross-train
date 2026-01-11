-- Fix 1: Improve payment-proofs storage bucket security
-- Drop ALL existing payment-proofs policies first
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view payment proofs" ON storage.objects;

-- Create secure policies for payment-proofs bucket
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their own payment proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage all payment proofs
CREATE POLICY "Admins can manage payment proofs"
ON storage.objects FOR ALL
USING (
  bucket_id = 'payment-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: Limit subscription plans visibility
DROP POLICY IF EXISTS "Authenticated users can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_active = true
);

-- Fix 3: Improve coach_athletes policies to prevent enumeration
DROP POLICY IF EXISTS "Athletes can view their coach relationships" ON public.coach_athletes;
DROP POLICY IF EXISTS "Athletes can view their own coach relationships" ON public.coach_athletes;
CREATE POLICY "Athletes can view their own coach relationships"
ON public.coach_athletes
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND athlete_id = auth.uid()
);

DROP POLICY IF EXISTS "Coaches can view their athlete relationships" ON public.coach_athletes;
DROP POLICY IF EXISTS "Coaches can view their own athlete relationships" ON public.coach_athletes;
CREATE POLICY "Coaches can view their own athlete relationships"
ON public.coach_athletes
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND coach_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can view all coach_athletes" ON public.coach_athletes;
CREATE POLICY "Admins can view all coach_athletes"
ON public.coach_athletes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));