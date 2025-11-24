import { useEffect, useState } from "react";
import { NavLink } from "./NavLink";
import { Activity, Calendar, ClipboardList, TrendingUp, Target, LogOut, User, History, Menu, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/hirocross-logo.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export const Navigation = () => {
  const navigate = useNavigate();
  const [athleteName, setAthleteName] = useState<string>("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteEmail, setNewAthleteEmail] = useState("");
  const [newAthletePassword, setNewAthletePassword] = useState("");

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchProfile();
      } else {
        setAthleteName("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleAddAthlete = async () => {
    if (!newAthleteName || !newAthleteEmail || !newAthletePassword) {
      toast.error("Mohon lengkapi semua field");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: newAthleteEmail,
      password: newAthletePassword,
      options: {
        data: {
          athlete_name: newAthleteName,
        },
      },
    });

    if (error) {
      toast.error("Gagal menambah atlet: " + error.message);
    } else {
      toast.success("Atlet baru berhasil ditambahkan");
      setIsDialogOpen(false);
      setNewAthleteName("");
      setNewAthleteEmail("");
      setNewAthletePassword("");
    }
  };

  const navItems = [
    { to: "/", icon: Calendar, label: "Dashboard" },
    { to: "/annual-plan", icon: Calendar, label: "Annual Plan" },
    { to: "/program-latihan", icon: ClipboardList, label: "Program Latihan" },
    { to: "/tes-fisik", icon: Target, label: "Tes Kondisi Fisik" },
    { to: "/readiness", icon: Activity, label: "Readiness" },
    { to: "/laporan", icon: ClipboardList, label: "Laporan" },
    { to: "/historical", icon: History, label: "Historis & Target" },
    { to: "/profile", icon: User, label: "Profil" },
  ];

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
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Menu Navigasi</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6">
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
                    </NavLink>
                  ))}
                </div>
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

          <div className="flex items-center gap-4">
            {athleteName && (
              <span className="text-sm text-muted-foreground font-medium">{athleteName}</span>
            )}
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Tambah Atlet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Atlet Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="athlete-name">Nama Atlet</Label>
                    <Input
                      id="athlete-name"
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value)}
                      placeholder="Masukkan nama atlet"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="athlete-email">Email</Label>
                    <Input
                      id="athlete-email"
                      type="email"
                      value={newAthleteEmail}
                      onChange={(e) => setNewAthleteEmail(e.target.value)}
                      placeholder="Masukkan email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="athlete-password">Password</Label>
                    <Input
                      id="athlete-password"
                      type="password"
                      value={newAthletePassword}
                      onChange={(e) => setNewAthletePassword(e.target.value)}
                      placeholder="Masukkan password"
                    />
                  </div>
                  <Button onClick={handleAddAthlete} className="w-full">
                    Tambah Atlet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
