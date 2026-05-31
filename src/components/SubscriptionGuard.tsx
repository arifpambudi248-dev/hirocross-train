import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Pages that don't require active subscription
const FREE_PAGES = ['/', '/profile', '/subscription', '/auth'];

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, [location.pathname]);

  const checkAccess = async () => {
    // Always allow free pages
    if (FREE_PAGES.includes(location.pathname)) {
      setIsAllowed(true);
      setLoading(false);
      return;
    }

    // Also allow admin pages
    if (location.pathname.startsWith('/admin')) {
      setIsAllowed(true);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        setIsAllowed(false);
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roleData) {
        setIsAllowed(true);
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

      if (subData) {
        setIsAllowed(true);
      } else {
        toast.error('Anda perlu berlangganan aktif untuk mengakses fitur ini');
        navigate('/subscription');
        setIsAllowed(false);
      }
    } catch (error) {
      // No active subscription found
      toast.error('Anda perlu berlangganan aktif untuk mengakses fitur ini');
      navigate('/subscription');
      setIsAllowed(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
};
