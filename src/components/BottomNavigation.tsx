import { useEffect, useState } from "react";
import { NavLink } from "./NavLink";
import { 
  Calendar, 
  ClipboardList, 
  Target, 
  Activity, 
  User, 
  Users, 
  TrendingUp, 
  Shield,
  Home,
  Gem
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const BottomNavigation = () => {
  const [isCoach, setIsCoach] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    checkRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        checkRole();
      } else {
        setIsCoach(false);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = roleData?.map(r => r.role) || [];
      setIsCoach(roles.includes("coach"));
      setIsAdmin(roles.includes("admin"));

      const today = new Date().toISOString().split("T")[0];
      const { data: subData } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("end_date", today)
        .limit(1)
        .maybeSingle();
      setHasSubscription(!!subData || roles.includes("admin"));
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  // Main navigation items for bottom bar (limited to 5 for mobile)
  const getNavItems = () => {
    if (isCoach) {
      return [
        { to: "/", icon: Home, label: "Home", requiresSubscription: false },
        { to: "/annual-plan", icon: Calendar, label: "Plan", requiresSubscription: true },
        { to: "/program-latihan", icon: ClipboardList, label: "Latihan", requiresSubscription: true },
        { to: "/athlete-management", icon: Users, label: "Atlet", requiresSubscription: true },
        { to: "/athlete-comparison", icon: TrendingUp, label: "Compare", requiresSubscription: true },
      ];
    }

    if (isAdmin) {
      return [
        { to: "/", icon: Home, label: "Home", requiresSubscription: false },
        { to: "/admin/dashboard", icon: Shield, label: "Admin", requiresSubscription: false },
        { to: "/program-latihan", icon: ClipboardList, label: "Latihan", requiresSubscription: true },
        { to: "/tes-fisik", icon: Target, label: "Tes", requiresSubscription: true },
        { to: "/profile", icon: User, label: "Profil", requiresSubscription: false },
      ];
    }

    // Default athlete navigation
    return [
      { to: "/", icon: Home, label: "Home", requiresSubscription: false },
      { to: "/annual-plan", icon: Calendar, label: "Plan", requiresSubscription: true },
      { to: "/program-latihan", icon: ClipboardList, label: "Latihan", requiresSubscription: true },
      { to: "/readiness", icon: Activity, label: "Readiness", requiresSubscription: true },
      { to: "/profile", icon: User, label: "Profil", requiresSubscription: false },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border sm:hidden">
      <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors min-w-[56px]"
            activeClassName="text-primary bg-primary/10"
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.requiresSubscription && (
                <Gem className="absolute -top-1 -right-2 h-2.5 w-2.5 text-amber-400" />
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
