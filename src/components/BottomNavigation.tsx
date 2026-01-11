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
  Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const BottomNavigation = () => {
  const [isCoach, setIsCoach] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  // Main navigation items for bottom bar (limited to 5 for mobile)
  const getNavItems = () => {
    if (isCoach) {
      return [
        { to: "/", icon: Home, label: "Home" },
        { to: "/annual-plan", icon: Calendar, label: "Plan" },
        { to: "/program-latihan", icon: ClipboardList, label: "Latihan" },
        { to: "/athlete-management", icon: Users, label: "Atlet" },
        { to: "/athlete-comparison", icon: TrendingUp, label: "Compare" },
      ];
    }

    if (isAdmin) {
      return [
        { to: "/", icon: Home, label: "Home" },
        { to: "/admin/dashboard", icon: Shield, label: "Admin" },
        { to: "/program-latihan", icon: ClipboardList, label: "Latihan" },
        { to: "/tes-fisik", icon: Target, label: "Tes" },
        { to: "/profile", icon: User, label: "Profil" },
      ];
    }

    // Default athlete navigation
    return [
      { to: "/", icon: Home, label: "Home" },
      { to: "/annual-plan", icon: Calendar, label: "Plan" },
      { to: "/program-latihan", icon: ClipboardList, label: "Latihan" },
      { to: "/readiness", icon: Activity, label: "Readiness" },
      { to: "/profile", icon: User, label: "Profil" },
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
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
