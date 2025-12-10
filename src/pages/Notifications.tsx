import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Check, X, UserPlus, Search, Loader2, Users, Send } from "lucide-react";
import { toast } from "sonner";

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
}

export default function Notifications() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myRequests, setMyRequests] = useState<Invitation[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
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

      // Check if user is athlete
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role === "athlete") {
        setIsAthlete(true);
        await loadInvitations(user.id);
        await loadMyRequests(user.id);
      } else {
        toast.error("Halaman ini hanya untuk atlet");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
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
    if (!searchQuery.trim()) {
      toast.error("Masukkan nama pelatih untuk mencari");
      return;
    }

    setIsSearching(true);
    try {
      // Get all users with coach role
      const { data: coachRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "coach");

      console.log("Coach roles:", coachRoles, "Error:", rolesError);

      if (!coachRoles || coachRoles.length === 0) {
        console.log("No coach roles found");
        setCoaches([]);
        setIsSearching(false);
        return;
      }

      const coachIds = coachRoles.map(r => r.user_id);

      // Search coach profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, athlete_name, avatar_url")
        .in("id", coachIds)
        .ilike("athlete_name", `%${searchQuery}%`);

      // Filter out coaches already connected or with pending requests
      const existingConnections = [...invitations, ...myRequests].map(i => i.coach_id);
      
      // Also get accepted connections
      const { data: acceptedCoaches } = await supabase
        .from("coach_athletes")
        .select("coach_id")
        .eq("athlete_id", userId)
        .eq("status", "accepted");

      const acceptedIds = acceptedCoaches?.map(a => a.coach_id) || [];
      const allExisting = [...existingConnections, ...acceptedIds];

      const filteredCoaches = profiles?.filter(p => !allExisting.includes(p.id)) || [];
      setCoaches(filteredCoaches);
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
      setCoaches(coaches.filter(c => c.id !== coachId));
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

  if (!isAthlete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
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
                  {coaches.length === 0 && searchQuery && !isSearching && (
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
      </div>
    </div>
  );
}
