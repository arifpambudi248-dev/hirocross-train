import { NavLink } from "./NavLink";
import { Activity, Calendar, ClipboardList, TrendingUp, Target, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const Navigation = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal logout: " + error.message);
    } else {
      toast.success("Berhasil logout");
      navigate("/auth");
    }
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-primary">Periodisasi Latihan</h1>
            
            <div className="flex gap-1">
              <NavLink
                to="/"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-secondary text-foreground"
              >
                <Calendar className="h-4 w-4" />
                Dashboard
              </NavLink>
              
              <NavLink
                to="/annual-plan"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-secondary text-foreground"
              >
                <Calendar className="h-4 w-4" />
                Annual Plan
              </NavLink>
              
              <NavLink
                to="/program-latihan"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-secondary text-foreground"
              >
                <ClipboardList className="h-4 w-4" />
                Program Latihan
              </NavLink>
              
              <NavLink
                to="/tes-fisik"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-secondary text-foreground"
              >
                <Target className="h-4 w-4" />
                Tes Kondisi Fisik
              </NavLink>
              
              <NavLink
                to="/readiness"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-secondary text-foreground"
              >
                <Activity className="h-4 w-4" />
                Readiness
              </NavLink>
              
              <NavLink
                to="/analisis-load"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-secondary text-foreground"
              >
                <TrendingUp className="h-4 w-4" />
                Analisis Load
              </NavLink>
            </div>
          </div>

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
    </nav>
  );
};
