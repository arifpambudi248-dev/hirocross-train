-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_months integer NOT NULL,
  price numeric NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Only admin can manage plans
CREATE POLICY "Admin can manage subscription plans"
ON public.subscription_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default plans
INSERT INTO public.subscription_plans (name, duration_months, price, description) VALUES
('Paket 1 Bulan', 1, 50000, 'Akses penuh selama 1 bulan'),
('Paket 3 Bulan', 3, 125000, 'Akses penuh selama 3 bulan - Hemat 17%'),
('Paket 6 Bulan', 6, 225000, 'Akses penuh selama 6 bulan - Hemat 25%'),
('Paket 12 Bulan', 12, 400000, 'Akses penuh selama 12 bulan - Hemat 33%');

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'pending_approval', 'active', 'expired', 'rejected')),
  payment_proof_url text,
  payment_notes text,
  rejection_reason text,
  start_date date,
  end_date date,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own subscriptions
CREATE POLICY "Users can create their own subscriptions"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending subscriptions (upload payment proof)
CREATE POLICY "Users can update pending subscriptions"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id AND status IN ('pending_payment', 'rejected'));

-- Admin can view all subscriptions
CREATE POLICY "Admin can view all subscriptions"
ON public.user_subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update all subscriptions (approve/reject)
CREATE POLICY "Admin can update all subscriptions"
ON public.user_subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete subscriptions
CREATE POLICY "Admin can delete subscriptions"
ON public.user_subscriptions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment proofs
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin can view all payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND end_date >= CURRENT_DATE
  )
$$;