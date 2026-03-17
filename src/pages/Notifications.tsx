import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Check, X, UserPlus, Search, Loader2, Users, Send, Trophy, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Invitation {
  id: string;
  coach_id: string;
  athlete_id: string;
  status: string;
  invited_by: string;
  assigned_at: string;
  coach_name?: string;
  coach_avatar?: string;
}

interface Coach {
  id: string;
  athlete_name: string;
  avatar_url: string | null;
  relationStatus: "available" | "pending" | "accepted";
}

interface UpcomingCompetition {
  id: string;
  competition_name: string;
  competition_date: string;
  plan_name: string;
  days_until: number;
  priority: number;
}

export default function Notifications() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myRequests, setMyRequests] = useState<Invitation[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<UpcomingCompetition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAthlete, setIsAthlete] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkUserAndLoad();
  }, []);

  const checkUserAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      setUserId(user.id);

      // Check user roles without assuming a single role row
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = roleData?.map((item) => item.role) || [];

      if (roles.includes("athlete")) {
        setIsAthlete(true);
        await Promise.all([
          loadInvitations(user.id),
          loadMyRequests(user.id),
          loadUpcomingCompetitions(user.id)
        ]);
      } else if (roles.includes("coach")) {
        // Coaches can also see their competitions
        await loadUpcomingCompetitionsForCoach(user.id);
        setIsAthlete(false);
        setIsLoading(false);
      } else {
        toast.error("Halaman ini hanya untuk atlet dan pelatih");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  };

  const loadUpcomingCompetitions = async (uid: string) => {
    try {
      const today = new Date();
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(today.getDate() + 14);

      // Get annual plans for this athlete
      const { data: plans } = await supabase
        .from("annual_plans")
        .select("id, plan_name, competition_date")
        .eq("athlete_id", uid);

      if (!plans) return;

      const upcoming: UpcomingCompetition[] = [];

      // Check main competition dates
      for (const plan of plans) {
        const compDate = new Date(plan.competition_date);
        const daysUntil = differenceInDays(compDate, today);
        
        if (daysUntil >= 0 && daysUntil <= 14) {
          upcoming.push({
            id: plan.id,
            competition_name: "Kompetisi Utama",
            competition_date: plan.competition_date,
            plan_name: plan.plan_name,
            days_until: daysUntil,
            priority: 1
          });
        }
      }

      // Get additional competitions from plan_competitions table
      for (const plan of plans) {
        const { data: competitions } = await supabase
          .from("plan_competitions")
          .select("*")
          .eq("plan_id", plan.id);

        if (competitions) {
          for (const comp of competitions) {
            const compDate = new Date(comp.competition_date);
            const daysUntil = differenceInDays(compDate, today);
            
            if (daysUntil >= 0 && daysUntil <= 14) {
              upcoming.push({
                id: comp.id,
                competition_name: comp.competition_name,
                competition_date: comp.competition_date,
                plan_name: plan.plan_name,
                days_until: daysUntil,
                priority: comp.priority || 2
              });
            }
          }
        }
      }

      // Sort by days until
      upcoming.sort((a, b) => a.days_until - b.days_until);
      setUpcomingCompetitions(upcoming);
    } catch (error) {
      console.error("Error loading competitions:", error);
    }
  };

  const loadUpcomingCompetitionsForCoach = async (uid: string) => {
    try {
      const today = new Date();
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(today.getDate() + 14);

      // Get annual plans created by this coach
      const { data: plans } = await supabase
        .from("annual_plans")
        .select("id, plan_name, competition_date, athlete_id")
        .eq("user_id", uid);

      if (!plans) return;

      // Get athlete names
      const athleteIds = [...new Set(plans.map(p => p.athlete_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, athlete_name")
        .in("id", athleteIds);

      const upcoming: UpcomingCompetition[] = [];

      // Check main competition dates
      for (const plan of plans) {
        const compDate = new Date(plan.competition_date);
        const daysUntil = differenceInDays(compDate, today);
        const athleteName = profiles?.find(p => p.id === plan.athlete_id)?.athlete_name || "Unknown";
        
        if (daysUntil >= 0 && daysUntil <= 14) {
          upcoming.push({
            id: plan.id,
            competition_name: `Kompetisi Utama - ${athleteName}`,
            competition_date: plan.competition_date,
            plan_name: plan.plan_name,
            days_until: daysUntil,
            priority: 1
          });
        }
      }

      // Get additional competitions
      for (const plan of plans) {
        const { data: competitions } = await supabase
          .from("plan_competitions")
          .select("*")
          .eq("plan_id", plan.id);

        if (competitions) {
          const athleteName = profiles?.find(p => p.id === plan.athlete_id)?.athlete_name || "Unknown";
          
          for (const comp of competitions) {
            const compDate = new Date(comp.competition_date);
            const daysUntil = differenceInDays(compDate, today);
            
            if (daysUntil >= 0 && daysUntil <= 14) {
              upcoming.push({
                id: comp.id,
                competition_name: `${comp.competition_name} - ${athleteName}`,
                competition_date: comp.competition_date,
                plan_name: plan.plan_name,
                days_until: daysUntil,
                priority: comp.priority || 2
              });
            }
          }
        }
      }

      upcoming.sort((a, b) => a.days_until - b.days_until);
      setUpcomingCompetitions(upcoming);
    } catch (error) {
      console.error("Error loading competitions:", error);
    }
  };

  const loadInvitations = async (uid: string) => {
    try {
      // Get pending invitations from coaches
      const { data: invites } = await supabase
        .from("coach_athletes")
        .select("*")
        .eq("athlete_id", uid)
        .eq("invited_by", "coach")
        .eq("status", "pending");

      if (invites && invites.length > 0) {
        const coachIds = invites.map(i => i.coach_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, athlete_name, avatar_url")
          .in("id", coachIds);

        const invitesWithNames = invites.map(inv => {
          const profile = profiles?.find(p => p.id === inv.coach_id);
          return {
            ...inv,
            coach_name: profile?.athlete_name || "Unknown Coach",
            coach_avatar: profile?.avatar_url
          };
        });

        setInvitations(invitesWithNames);
      } else {
        setInvitations([]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading invitations:", error);
      setIsLoading(false);
    }
  };

  const loadMyRequests = async (uid: string) => {
    try {
      // Get my pending requests to coaches
      const { data: requests } = await supabase
        .from("coach_athletes")
        .select("*")
        .eq("athlete_id", uid)
        .eq("invited_by", "athlete");

      if (requests && requests.length > 0) {
        const coachIds = requests.map(r => r.coach_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, athlete_name, avatar_url")
          .in("id", coachIds);

        const requestsWithNames = requests.map(req => {
          const profile = profiles?.find(p => p.id === req.coach_id);
          return {
            ...req,
            coach_name: profile?.athlete_name || "Unknown Coach",
            coach_avatar: profile?.avatar_url
          };
        });

        setMyRequests(requestsWithNames);
      } else {
        setMyRequests([]);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("coach_athletes")
        .update({ status: "accepted" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation diterima! Anda sekarang terhubung dengan pelatih.");
      if (userId) {
        loadInvitations(userId);
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Gagal menerima invitation");
    }
  };

  const handleReject = async (invitationId: string) => {
    if (!confirm("Tolak invitation dari pelatih ini?")) return;

    try {
      const { error } = await supabase
        .from("coach_athletes")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation ditolak");
      if (userId) {
        loadInvitations(userId);
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      toast.error("Gagal menolak invitation");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Batalkan request ini?")) return;

    try {
      const { error } = await supabase
        .from("coach_athletes")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request dibatalkan");
      if (userId) {
        loadMyRequests(userId);
      }
    } catch (error) {
      console.error("Error canceling request:", error);
      toast.error("Gagal membatalkan request");
    }
  };

  const searchCoaches = async () => {
    setIsSearching(true);
    try {
      const normalizedQuery = searchQuery.trim();

      const [{ data: profiles, error: profilesError }, { data: allRelations, error: relationsError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, athlete_name, avatar_url")
          .ilike("athlete_name", normalizedQuery ? `%${normalizedQuery}%` : "%"),
        supabase
          .from("coach_athletes")
          .select("coach_id, status")
          .eq("athlete_id", userId)
      ]);

      if (profilesError) throw profilesError;
      if (relationsError) throw relationsError;

      const relationMap = new Map<string, "pending" | "accepted">();
      allRelations?.forEach((relation) => {
        if (relation.status === "pending" || relation.status === "accepted") {
          relationMap.set(relation.coach_id, relation.status);
        }
      });

      const coachResults: Coach[] = (profiles || [])
        .filter((profile) => profile.id !== userId)
        .map((profile) => ({
          ...profile,
          relationStatus: relationMap.get(profile.id) === "accepted"
            ? "accepted"
            : relationMap.get(profile.id) === "pending"
              ? "pending"
              : "available",
        }))
        .filter((coach) => coach.relationStatus !== "accepted");

      setCoaches(coachResults);
    } catch (error) {
      console.error("Error searching coaches:", error);
      toast.error("Gagal mencari pelatih");
    } finally {
      setIsSearching(false);
    }
  };

  const sendJoinRequest = async (coachId: string) => {
    if (!userId) return;

    setIsSending(coachId);
    try {
      const { error } = await supabase
        .from("coach_athletes")
        .insert({
          coach_id: coachId,
          athlete_id: userId,
          status: "pending",
          invited_by: "athlete"
        });

      if (error) throw error;

      toast.success("Request berhasil dikirim ke pelatih!");
      setCoaches((prev) => prev.map((coach) =>
        coach.id === coachId ? { ...coach, relationStatus: "pending" } : coach
      ));
      loadMyRequests(userId);
      setDialogOpen(false);
      setSearchQuery("");
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast.error(error.message || "Gagal mengirim request");
    } finally {
      setIsSending(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show for both athletes and coaches now
  const showCoachView = !isAthlete && upcomingCompetitions.length > 0;

  return (
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Competition Reminders Alert */}
        {upcomingCompetitions.length > 0 && (
          <Alert className="mb-6 border-warning bg-warning/10">
            <Trophy className="h-5 w-5 text-warning" />
            <AlertTitle className="text-warning">Kompetisi dalam 2 Minggu!</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {upcomingCompetitions.map((comp) => (
                  <div 
                    key={comp.id} 
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        comp.days_until <= 3 ? 'bg-destructive/20 text-destructive' : 
                        comp.days_until <= 7 ? 'bg-warning/20 text-warning' : 
                        'bg-primary/20 text-primary'
                      }`}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{comp.competition_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(comp.competition_date), "EEEE, d MMMM yyyy", { locale: localeId })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Plan: {comp.plan_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={comp.days_until <= 3 ? "destructive" : comp.days_until <= 7 ? "secondary" : "default"}
                        className="text-sm"
                      >
                        {comp.days_until === 0 ? "Hari Ini!" : 
                         comp.days_until === 1 ? "Besok!" : 
                         `${comp.days_until} hari lagi`}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prioritas: {comp.priority === 1 ? "A" : comp.priority === 2 ? "B" : "C"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Coach view - only show competitions */}
        {showCoachView && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Reminder Kompetisi Atlet
              </CardTitle>
              <CardDescription>
                Kompetisi atlet Anda dalam 2 minggu ke depan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-4">
                Lihat daftar kompetisi di atas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Athlete view - full notifications */}
        {isAthlete && (
          <>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-8 w-8 text-primary" />
              Notifikasi
            </h1>
            <p className="text-muted-foreground mt-1">
              Kelola invitation dari pelatih dan kirim request
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Cari Pelatih
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cari & Gabung Pelatih</DialogTitle>
                <DialogDescription>
                  Cari pelatih dan kirim request untuk bergabung ke roster mereka
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nama pelatih..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchCoaches()}
                  />
                  <Button onClick={searchCoaches} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {coaches.length === 0 && !isSearching && (
                    <p className="text-center text-muted-foreground py-4">
                      Tidak ada pelatih ditemukan
                    </p>
                  )}

                  {coaches.map((coach) => (
                    <div
                      key={coach.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={coach.avatar_url || undefined} />
                          <AvatarFallback>
                            {coach.athlete_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{coach.athlete_name}</p>
                          <Badge variant="secondary" className="text-xs">Pelatih</Badge>
                        </div>
                      </div>
                      {coach.relationStatus === "pending" ? (
                        <Badge variant="outline">Menunggu</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => sendJoinRequest(coach.id)}
                          disabled={isSending === coach.id}
                        >
                          {isSending === coach.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Request
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="invitations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invitations" className="gap-2">
              <Bell className="h-4 w-4" />
              Invitation Masuk
              {invitations.length > 0 && (
                <Badge variant="destructive" className="ml-1">{invitations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Send className="h-4 w-4" />
              Request Terkirim
              {myRequests.filter(r => r.status === "pending").length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {myRequests.filter(r => r.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Invitation dari Pelatih
                </CardTitle>
                <CardDescription>
                  Pelatih ingin menambahkan Anda ke roster mereka
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Tidak ada invitation baru</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={inv.coach_avatar || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {inv.coach_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{inv.coach_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Mengundang Anda bergabung
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(inv.assigned_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(inv.id)}
                            className="gap-1"
                          >
                            <X className="h-4 w-4" />
                            Tolak
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(inv.id)}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Terima
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Request Terkirim
                </CardTitle>
                <CardDescription>
                  Request yang Anda kirim ke pelatih
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada request terkirim</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Cari Pelatih
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={req.coach_avatar || undefined} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                              {req.coach_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{req.coach_name}</p>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={req.status === "accepted" ? "default" : req.status === "pending" ? "secondary" : "destructive"}
                              >
                                {req.status === "accepted" ? "Diterima" : req.status === "pending" ? "Menunggu" : "Ditolak"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Dikirim: {new Date(req.assigned_at).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        </div>
                        {req.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Batalkan
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
}
