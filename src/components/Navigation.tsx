import { useEffect, useState } from "react";
import { NavLink } from "./NavLink";
import { Activity, Calendar, ClipboardList, TrendingUp, Target, LogOut, User, History, Menu, Users, Bell, CreditCard, Shield, UserCog, Gem } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/hirocross-logo.png";
import { ThemeToggle } from "./ThemeToggle";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
export const Navigation = () => {
  const navigate = useNavigate();
  const [athleteName, setAthleteName] = useState<string>("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

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

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("profiles")
        .select("athlete_name")
        .eq("id", session.user.id)
        .single();
      
      if (data) {
        setAthleteName(data.athlete_name);
      }
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
    { to: "/", icon: Calendar, label: "Dashboard", requiresSubscription: false },
    { to: "/annual-plan", icon: Calendar, label: "Annual Plan", requiresSubscription: true },
    { to: "/program-latihan", icon: ClipboardList, label: "Program Latihan", requiresSubscription: true },
    { to: "/tes-fisik", icon: Target, label: "Tes Kondisi Fisik", requiresSubscription: true },
    { to: "/readiness", icon: Activity, label: "Readiness", requiresSubscription: true },
    { to: "/laporan", icon: ClipboardList, label: "Laporan", requiresSubscription: true },
    { to: "/historical", icon: History, label: "Historis & Target", requiresSubscription: true },
  ];

  const coachNavItems = [
    { to: "/athlete-management", icon: Users, label: "Kelola Atlet", requiresSubscription: true },
    { to: "/athlete-comparison", icon: TrendingUp, label: "Perbandingan Atlet", requiresSubscription: true },
    { to: "/notifications", icon: Bell, label: "Notifikasi", requiresSubscription: true },
  ];

  const athleteNavItems = [
    { to: "/profile", icon: User, label: "Profil", requiresSubscription: false },
    { to: "/notifications", icon: Bell, label: "Notifikasi", requiresSubscription: true },
    { to: "/subscription", icon: CreditCard, label: "Langganan", requiresSubscription: false },
  ];

  const adminNavItems = [
    { to: "/admin/dashboard", icon: Shield, label: "Admin Dashboard", requiresSubscription: false },
    { to: "/admin/users", icon: UserCog, label: "Kelola User", requiresSubscription: false },
  ];

  let navItems = isCoach 
    ? [...baseNavItems, ...coachNavItems] 
    : [...baseNavItems, ...athleteNavItems];
  
  if (isAdmin) {
    navItems = [...navItems, ...adminNavItems];
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 flex flex-col p-0">
                <SheetHeader className="p-4 pb-2 border-b border-border">
                  <SheetTitle>Menu Navigasi</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1 px-2">
                  <div className="flex flex-col gap-1 py-4">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        activeClassName="bg-secondary text-foreground"
                        onClick={() => setIsSheetOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {item.requiresSubscription && !hasSubscription && (
                          <Gem className="h-3 w-3 ml-auto text-amber-400" />
                        )}
                      </NavLink>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={logo} 
                alt="Hirocross Logo" 
                className="h-6 sm:h-8 md:h-10 w-auto transition-transform duration-300 hover:scale-110" 
              />
              <h1 className="text-base sm:text-xl font-bold text-primary">HIROCROSS_TRAIN</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {athleteName && (
              <span className="text-sm text-muted-foreground font-medium hidden sm:block">{athleteName}</span>
            )}

            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
