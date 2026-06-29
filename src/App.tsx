import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import ProgramLatihan from "./pages/ProgramLatihan";
import TesFisik from "./pages/TesFisik";
import Readiness from "./pages/Readiness";
import AnnualPlan from "./pages/AnnualPlan";
import Laporan from "./pages/Laporan";
import Profile from "./pages/Profile";
import Historical from "./pages/Historical";
import AthleteManagement from "./pages/AthleteManagement";
import AthleteComparison from "./pages/AthleteComparison";
import CoachAthleteDetail from "./pages/CoachAthleteDetail";
import BodyMapPage from "./pages/BodyMapPage";
import Notifications from "./pages/Notifications";
import Subscription from "./pages/Subscription";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show landing page and auth routes
  if (!session) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Logged in - show app routes
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SubscriptionGuard>
            <Routes>
              {/* Free pages - accessible without subscription */}
              <Route path="/" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/subscription" element={<Subscription />} />
              
              {/* Admin pages */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/users" element={<AdminUserManagement />} />
              
              {/* Protected pages - require active subscription */}
              <Route path="/annual-plan" element={<AnnualPlan />} />
              <Route path="/program-latihan" element={<ProgramLatihan />} />
              <Route path="/tes-fisik" element={<TesFisik />} />
              <Route path="/readiness" element={<Readiness />} />
              <Route path="/laporan" element={<Laporan />} />
              <Route path="/historical" element={<Historical />} />
              <Route path="/athlete-management" element={<AthleteManagement />} />
              <Route path="/athlete-comparison" element={<AthleteComparison />} />
              <Route path="/coach/athlete/:athleteId" element={<CoachAthleteDetail />} />
              <Route path="/body-map" element={<BodyMapPage />} />
              <Route path="/notifications" element={<Notifications />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SubscriptionGuard>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
