import { useEffect, useState } from "react";
import { NavLink } from "./NavLink";
import { Activity, Calendar, ClipboardList, TrendingUp, Target, LogOut, User, History, Users, Bell, CreditCard, Shield, UserCog, Dumbbell, Gem } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/hirocross-logo.png";
import { ThemeToggle } from "./ThemeToggle";
import { ScrollArea } from "./ui/scroll-area";

export const SidebarNavigation = () => {
  const navigate = useNavigate();
  const [athleteName, setAthleteName] = useState<string>("");
  const [isCoach, setIsCoach] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProfile();
    checkRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchProfile();
        checkRole();
      } else {
        setAthleteName("");
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

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("profiles")
        .select("athlete_name")
        .eq("id", session.user.id)
        .single();
      if (data) setAthleteName(data.athlete_name);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal logout: " + error.message);
    } else {
      toast.success("Berhasil logout");
      navigate("/auth");
    }
  };

  const baseNavItems = [
    { to: "/", icon: Calendar, label: "Setup", requiresSubscription: false },
    { to: "/annual-plan", icon: Calendar, label: "Annual Plan", requiresSubscription: true },
    { to: "/program-latihan", icon: ClipboardList, label: "Bulanan", requiresSubscription: true },
    { to: "/tes-fisik", icon: Target, label: "Tes & Pengukuran", requiresSubscription: true },
    { to: "/body-map", icon: Dumbbell, label: "Body Map", requiresSubscription: true },
  ];

  const premiumNavItems = [
    { to: "/athlete-management", icon: Users, label: "Monitoring Atlet", requiresSubscription: true },
    { to: "/laporan", icon: TrendingUp, label: "Monitoring Plan", requiresSubscription: true },
    { to: "/readiness", icon: Activity, label: "Readiness Check", requiresSubscription: true },
  ];

  const adminNavItems = [
    { to: "/admin/dashboard", icon: Shield, label: "Admin Dashboard", requiresSubscription: false },
    { to: "/admin/users", icon: UserCog, label: "Kelola User", requiresSubscription: false },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <img src={logo} alt="Hirocross Logo" className="h-8 w-auto" />
        <h1 className="text-lg font-bold text-primary">HIRO CROSS</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-4 space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menu</p>
          {baseNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              activeClassName="bg-primary/10 text-primary"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="px-3 py-2 space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Premium</p>
          {premiumNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              activeClassName="bg-primary/10 text-primary"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.premium && (
                <span className="ml-auto w-2 h-2 rounded-full bg-warning" />
              )}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <div className="px-3 py-2 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin</p>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-primary/10 text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        {athleteName && (
          <p className="text-xs text-muted-foreground px-3 truncate">{athleteName}</p>
        )}
        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
};
