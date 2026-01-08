import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Pages that don't require active subscription
const FREE_PAGES = ['/', '/profile', '/subscription'];

export const useSubscriptionGuard = () => {
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is admin (admins bypass subscription check)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roleData) {
        setIsAdmin(true);
        setHasActiveSubscription(true);
        setLoading(false);
        return;
      }

      // Check for active subscription
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('status, end_date')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .limit(1)
        .single();

      setHasActiveSubscription(!!subData);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  const guardRoute = (currentPath: string) => {
    if (loading) return true; // Still loading, allow access temporarily
    
    // Allow free pages
    if (FREE_PAGES.includes(currentPath)) return true;
    
    // Admins have full access
    if (isAdmin) return true;
    
    // Check subscription
    if (!hasActiveSubscription) {
      toast.error('Anda perlu berlangganan untuk mengakses fitur ini');
      navigate('/subscription');
      return false;
    }
    
    return true;
  };

  return { hasActiveSubscription, isAdmin, loading, guardRoute, checkSubscription };
};
