import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Edit, Trash2, FileDown, Users, Mail, Calendar, Check, X, UserCheck, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Athlete {
  id: string;
  athlete_name: string;
  age: number | null;
  baseline_rhr: number | null;
  baseline_vj: number | null;
  avatar_url: string | null;
  email?: string;
  assigned_at?: string;
}

interface PendingInvitation {
  id: string;
  athlete_id: string;
  athlete_name: string;
  invited_by: string;
  created_at: string;
}

export default function AthleteManagement() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [athleteRequests, setAthleteRequests] = useState<PendingInvitation[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allAthletesWithStatus, setAllAthletesWithStatus] = useState<Array<{
    id: string;
    athlete_name: string;
    avatar_url: string | null;
    status: 'available' | 'pending' | 'assigned';
  }>>([]);
  const [directAssignMode, setDirectAssignMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const { toast } = useToast();

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  // Form states
  const [newAthleteEmail, setNewAthleteEmail] = useState("");
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthletePassword, setNewAthletePassword] = useState("");
  const [selectedExistingAthleteId, setSelectedExistingAthleteId] = useState("");
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editRHR, setEditRHR] = useState("");
  const [editVJ, setEditVJ] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "age">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filtered and sorted athletes
  const filteredAthletes = athletes
    .filter(athlete => 
      athlete.athlete_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.athlete_name.localeCompare(b.athlete_name);
          break;
        case "date":
          comparison = new Date(a.assigned_at || 0).getTime() - new Date(b.assigned_at || 0).getTime();
          break;
        case "age":
          comparison = (a.age || 0) - (b.age || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  useEffect(() => {
    checkCoachRole();
  }, []);

  const checkCoachRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role === "coach") {
        setIsCoach(true);
        loadAthletes();
      } else {
        toast({
          title: "Akses Ditolak",
          description: "Halaman ini hanya untuk pelatih",
          variant: "destructive",
        });
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error checking role:", error);
      setIsLoading(false);
    }
  };

  const loadAthletes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get only accepted athlete assignments
      const { data: assignments } = await supabase
        .from("coach_athletes")
        .select("athlete_id, assigned_at, status, invited_by")
        .eq("coach_id", user.id)
        .eq("status", "accepted");

      if (!assignments || assignments.length === 0) {
        setAthletes([]);
        setIsLoading(false);
        return;
      }

      const athleteIds = assignments.map(a => a.athlete_id);

      // Get athlete profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", athleteIds);

      if (profiles) {
        const athletesWithAssignmentDate = profiles.map(profile => {
          const assignment = assignments.find(a => a.athlete_id === profile.id);
          return {
            ...profile,
            assigned_at: assignment?.assigned_at
          };
        });
        setAthletes(athletesWithAssignmentDate);
      }

      // Load all athletes for assign dialog with status
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "athlete");

      if (allRoles) {
        const athleteUserIds = allRoles.map(r => r.user_id);
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, athlete_name, avatar_url")
          .in("id", athleteUserIds);

        // Get all assignments/invitations for this coach
        const { data: coachAssignments } = await supabase
          .from("coach_athletes")
          .select("athlete_id, status")
          .eq("coach_id", user.id);

        const assignmentMap = new Map<string, string>();
        coachAssignments?.forEach(a => assignmentMap.set(a.athlete_id, a.status));

        if (allProfiles) {
          // Build athletes with status, excluding current coach
          const athletesWithStatus = allProfiles
            .filter(p => p.id !== user.id)
            .map(p => ({
              id: p.id,
              athlete_name: p.athlete_name,
              avatar_url: p.avatar_url,
              status: (assignmentMap.has(p.id) 
                ? (assignmentMap.get(p.id) === 'accepted' ? 'assigned' : 'pending')
                : 'available') as 'available' | 'pending' | 'assigned'
            }));
          
          setAllAthletesWithStatus(athletesWithStatus);
          
          // Keep available only for backward compatibility
          const availableAthletes = athletesWithStatus.filter(a => a.status === 'available');
          setAllUsers(availableAthletes);
        }
      }

      // Load pending invitations (sent by coach)
      const { data: pending } = await supabase
        .from("coach_athletes")
        .select("id, athlete_id, invited_by, assigned_at")
        .eq("coach_id", user.id)
        .eq("status", "pending")
        .eq("invited_by", "coach");
      
      if (pending && pending.length > 0) {
        const pendingAthleteIds = pending.map((p: any) => p.athlete_id);
        const { data: pendingProfiles } = await supabase
          .from("profiles")
          .select("id, athlete_name")
          .in("id", pendingAthleteIds);
        
        if (pendingProfiles) {
          const pendingWithNames = pending.map((p: any) => {
            const profile = pendingProfiles.find(pr => pr.id === p.athlete_id);
            return {
              id: p.id,
              athlete_id: p.athlete_id,
              athlete_name: profile?.athlete_name || "Unknown",
              invited_by: p.invited_by || "coach",
              created_at: p.assigned_at || new Date().toISOString()
            };
          });
          setPendingInvitations(pendingWithNames);
        }
      } else {
        setPendingInvitations([]);
      }

      // Load athlete requests (sent by athlete)
      const { data: requests } = await supabase
        .from("coach_athletes")
        .select("id, athlete_id, invited_by, assigned_at")
        .eq("coach_id", user.id)
        .eq("status", "pending")
        .eq("invited_by", "athlete");
      
      if (requests && requests.length > 0) {
        const requestAthleteIds = requests.map((r: any) => r.athlete_id);
        const { data: requestProfiles } = await supabase
          .from("profiles")
          .select("id, athlete_name")
          .in("id", requestAthleteIds);
        
        if (requestProfiles) {
          const requestsWithNames = requests.map((r: any) => {
            const profile = requestProfiles.find(pr => pr.id === r.athlete_id);
            return {
              id: r.id,
              athlete_id: r.athlete_id,
              athlete_name: profile?.athlete_name || "Unknown",
              invited_by: r.invited_by || "athlete",
              created_at: r.assigned_at || new Date().toISOString()
            };
          });
          setAthleteRequests(requestsWithNames);
        }
      } else {
        setAthleteRequests([]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading athletes:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data atlet",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleCreateAthlete = async () => {
    if (!newAthleteEmail || !newAthleteName || !newAthletePassword) {
      sonnerToast.error("Semua field harus diisi");
      return;
    }

    if (newAthletePassword.length < 6) {
      sonnerToast.error("Password minimal 6 karakter");
      return;
    }

    try {
      setIsSaving(true);
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sonnerToast.error("Sesi tidak ditemukan, silakan login kembali");
        return;
      }

      // Use edge function to create athlete without affecting current session
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-athlete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            email: newAthleteEmail,
            password: newAthletePassword,
            athlete_name: newAthleteName
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Handle specific email exists error
        if (result.code === "EMAIL_EXISTS" || response.status === 409) {
          sonnerToast.error("Email sudah terdaftar", {
            description: "Gunakan 'Assign Atlet' untuk menambahkan atlet yang sudah memiliki akun."
          });
          return;
        }
        throw new Error(result.error || "Gagal membuat akun atlet");
      }

      sonnerToast.success("Atlet berhasil ditambahkan");
      setAddDialogOpen(false);
      setNewAthleteEmail("");
      setNewAthleteName("");
      setNewAthletePassword("");
      loadAthletes();
    } catch (error: any) {
      console.error("Error creating athlete:", error);
      sonnerToast.error(error.message || "Gagal menambahkan atlet");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAthlete = async () => {
    if (!selectedAthlete) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          athlete_name: editName,
          age: editAge ? parseInt(editAge) : null,
          baseline_rhr: editRHR ? parseFloat(editRHR) : null,
          baseline_vj: editVJ ? parseFloat(editVJ) : null
        })
        .eq("id", selectedAthlete.id);

      if (error) throw error;

      sonnerToast.success("Data atlet berhasil diupdate");
      setEditDialogOpen(false);
      loadAthletes();
    } catch (error) {
      console.error("Error updating athlete:", error);
      sonnerToast.error("Gagal update data atlet");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignExistingAthlete = async () => {
    if (!selectedExistingAthleteId) {
      sonnerToast.error("Pilih atlet yang akan di-assign");
      return;
    }

    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already assigned
      const { data: existing } = await supabase
        .from("coach_athletes")
        .select("id")
        .eq("coach_id", user.id)
        .eq("athlete_id", selectedExistingAthleteId)
        .single();

      if (existing) {
        sonnerToast.error("Atlet ini sudah di-assign ke Anda");
        return;
      }

      // Direct assign mode: immediately accepted, Invitation mode: pending
      const assignStatus = directAssignMode ? 'accepted' : 'pending';
      
      const { error } = await supabase
        .from("coach_athletes")
        .insert({
          coach_id: user.id,
          athlete_id: selectedExistingAthleteId,
          status: assignStatus,
          invited_by: 'coach',
          created_by: user.id
        });

      if (error) throw error;

      if (directAssignMode) {
        sonnerToast.success("Atlet berhasil langsung ditambahkan ke roster");
      } else {
        sonnerToast.success("Invitation berhasil dikirim ke atlet");
      }
      setAssignDialogOpen(false);
      setSelectedExistingAthleteId("");
      loadAthletes();
    } catch (error: any) {
      console.error("Error assigning athlete:", error);
      sonnerToast.error(error.message || "Gagal assign atlet");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAthlete = async (athleteId: string, athleteName: string) => {
    if (!confirm(`Hapus assignment untuk ${athleteName}?`)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("coach_athletes")
        .delete()
        .eq("coach_id", user.id)
        .eq("athlete_id", athleteId);

      if (error) throw error;

      sonnerToast.success("Assignment atlet berhasil dihapus");
      loadAthletes();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      sonnerToast.error("Gagal menghapus assignment");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("Batalkan invitation ini?")) return;

    try {
      const { error } = await supabase
        .from("coach_athletes")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      sonnerToast.success("Invitation berhasil dibatalkan");
      loadAthletes();
    } catch (error) {
      console.error("Error canceling invitation:", error);
      sonnerToast.error("Gagal membatalkan invitation");
    }
  };

  const handleAcceptAthleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("coach_athletes")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      sonnerToast.success("Request diterima! Atlet berhasil ditambahkan ke roster.");
      loadAthletes();
    } catch (error) {
      console.error("Error accepting request:", error);
      sonnerToast.error("Gagal menerima request");
    }
  };

  const handleRejectAthleteRequest = async (requestId: string) => {
    if (!confirm("Tolak request dari atlet ini?")) return;

    try {
      const { error } = await supabase
        .from("coach_athletes")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      sonnerToast.success("Request ditolak");
      loadAthletes();
    } catch (error) {
      console.error("Error rejecting request:", error);
      sonnerToast.error("Gagal menolak request");
    }
  };

  const generatePDFReport = async (athleteId: string, athleteName: string) => {
    try {
      setIsGeneratingPDF(athleteId);

      // Fetch all data for the athlete
      const [readinessData, sessionsData, testsData, goalsData] = await Promise.all([
        supabase.from("readiness_logs").select("*").eq("athlete_id", athleteId).order("date", { ascending: false }).limit(30),
        supabase.from("training_sessions").select("*").eq("user_id", athleteId).order("date", { ascending: false }).limit(30),
        supabase.from("physical_tests").select("*").eq("athlete_id", athleteId).order("test_date", { ascending: false }),
        supabase.from("athlete_goals").select("*").eq("athlete_id", athleteId)
      ]);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38);
      doc.text("HIROCROSS_TRAIN", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 10;
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Laporan Performa Atlet`, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 8;
      doc.setFontSize(14);
      doc.text(athleteName, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString("id-ID")}`, pageWidth / 2, yPos, { align: "center" });

      yPos += 15;

      // Readiness Summary
      if (readinessData.data && readinessData.data.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("RINGKASAN KESIAPAN", 14, yPos);
        yPos += 5;

        const avgReadiness = readinessData.data.reduce((sum, r) => sum + r.readiness_score, 0) / readinessData.data.length;
        const lastReadiness = readinessData.data[0];

        autoTable(doc, {
          startY: yPos,
          head: [["Metrik", "Nilai"]],
          body: [
            ["Rata-rata Readiness (30 hari)", `${avgReadiness.toFixed(1)}%`],
            ["Readiness Terakhir", `${lastReadiness.readiness_score.toFixed(1)}% (${lastReadiness.readiness_zone})`],
            ["RHR Terakhir", `${lastReadiness.rhr} bpm`],
            ["VJ Terakhir", `${lastReadiness.vj} cm`],
          ],
          theme: "striped",
          headStyles: { fillColor: [220, 38, 38] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Training Load Summary
      if (sessionsData.data && sessionsData.data.length > 0) {
        doc.setFontSize(12);
        doc.text("BEBAN LATIHAN", 14, yPos);
        yPos += 5;

        const totalLoad = sessionsData.data.reduce((sum, s) => sum + (s.load_final || 0), 0);
        const avgLoad = totalLoad / sessionsData.data.length;

        autoTable(doc, {
          startY: yPos,
          head: [["Metrik", "Nilai"]],
          body: [
            ["Total Beban (30 hari)", `${totalLoad} AU`],
            ["Rata-rata Beban/Sesi", `${avgLoad.toFixed(1)} AU`],
            ["Jumlah Sesi", `${sessionsData.data.length} sesi`],
          ],
          theme: "striped",
          headStyles: { fillColor: [220, 38, 38] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Physical Tests
      if (testsData.data && testsData.data.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text("TES KONDISI FISIK", 14, yPos);
        yPos += 5;

        const testRows = testsData.data.map(test => [
          test.test_name,
          test.category,
          `${test.value} ${test.unit}`,
          new Date(test.test_date).toLocaleDateString("id-ID")
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Tes", "Kategori", "Nilai", "Tanggal"]],
          body: testRows,
          theme: "striped",
          headStyles: { fillColor: [220, 38, 38] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Goals
      if (goalsData.data && goalsData.data.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text("TARGET & PROGRESS", 14, yPos);
        yPos += 5;

        const goalRows = goalsData.data.map(goal => [
          goal.goal_name,
          `${goal.baseline_value || "-"} ${goal.target_unit || ""}`,
          `${goal.target_value || "-"} ${goal.target_unit || ""}`,
          `${goal.current_value || "-"} ${goal.target_unit || ""}`,
          goal.status || "-"
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Target", "Baseline", "Target", "Saat Ini", "Status"]],
          body: goalRows,
          theme: "striped",
          headStyles: { fillColor: [220, 38, 38] },
        });
      }

      // Save PDF
      doc.save(`Laporan_${athleteName.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
      sonnerToast.success("PDF berhasil di-generate");
    } catch (error) {
      console.error("Error generating PDF:", error);
      sonnerToast.error("Gagal generate PDF");
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manajemen Atlet</h1>
            <p className="text-muted-foreground">Kelola data dan profile atlet Anda</p>
          </div>

          <div className="flex gap-2">
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Assign Atlet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Atlet</DialogTitle>
                  <DialogDescription>
                    Pilih atlet yang sudah terdaftar untuk ditambahkan ke roster Anda.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Mode:</span>
                      <Badge variant={directAssignMode ? "default" : "secondary"}>
                        {directAssignMode ? "Direct Assign" : "Invitation"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDirectAssignMode(!directAssignMode)}
                    >
                      {directAssignMode ? "Ganti ke Invitation" : "Ganti ke Direct"}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {directAssignMode 
                      ? "Direct Assign: Atlet langsung masuk ke roster tanpa konfirmasi"
                      : "Invitation: Atlet akan menerima notifikasi dan harus konfirmasi"}
                  </p>

                  <div>
                    <Label htmlFor="existing-athlete">Pilih Atlet</Label>
                    <div className="mt-2 max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                      {allAthletesWithStatus.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Tidak ada atlet terdaftar
                        </p>
                      ) : (
                        allAthletesWithStatus.map(athlete => (
                          <div
                            key={athlete.id}
                            onClick={() => {
                              if (athlete.status === 'available') {
                                setSelectedExistingAthleteId(athlete.id);
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                              selectedExistingAthleteId === athlete.id
                                ? 'bg-primary/10 border border-primary'
                                : athlete.status === 'available'
                                  ? 'hover:bg-muted'
                                  : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={athlete.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {athlete.athlete_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{athlete.athlete_name}</span>
                            </div>
                            <Badge
                              variant={
                                athlete.status === 'available' 
                                  ? 'outline' 
                                  : athlete.status === 'pending' 
                                    ? 'secondary' 
                                    : 'default'
                              }
                              className={
                                athlete.status === 'available'
                                  ? 'border-green-500 text-green-500'
                                  : athlete.status === 'pending'
                                    ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                                    : ''
                              }
                            >
                              {athlete.status === 'available' && 'Available'}
                              {athlete.status === 'pending' && 'Pending'}
                              {athlete.status === 'assigned' && 'Assigned'}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleAssignExistingAthlete}
                    disabled={isSaving || !selectedExistingAthleteId}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : directAssignMode ? (
                      "Langsung Assign"
                    ) : (
                      "Kirim Invitation"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Tambah Atlet Baru
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Atlet Baru</DialogTitle>
                  <DialogDescription>
                    Buat akun baru untuk atlet dan assign ke Anda sebagai pelatih
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-name">Nama Atlet</Label>
                    <Input
                      id="new-name"
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value)}
                      placeholder="Contoh: John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newAthleteEmail}
                      onChange={(e) => setNewAthleteEmail(e.target.value)}
                      placeholder="athlete@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newAthletePassword}
                      onChange={(e) => setNewAthletePassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                    />
                  </div>
                  <Button
                    onClick={handleCreateAthlete}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      "Buat Akun & Assign"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Bar */}
        {athletes.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari atlet berdasarkan nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: "name" | "date" | "age") => setSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Urutkan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nama</SelectItem>
                      <SelectItem value="date">Tanggal Assign</SelectItem>
                      <SelectItem value="age">Usia</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    title={sortOrder === "asc" ? "Ascending" : "Descending"}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </Button>
                </div>
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Menampilkan {filteredAthletes.length} dari {athletes.length} atlet
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <Card className="mb-6 border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-yellow-500" />
                Invitation Pending ({pendingInvitations.length})
              </CardTitle>
              <CardDescription>
                Invitation yang sedang menunggu konfirmasi dari atlet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-yellow-500/10 text-yellow-500">
                          {invitation.athlete_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{invitation.athlete_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Dikirim {new Date(invitation.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Athlete Requests Section */}
        {athleteRequests.length > 0 && (
          <Card className="mb-6 border-green-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                Request dari Atlet ({athleteRequests.length})
              </CardTitle>
              <CardDescription>
                Atlet yang ingin bergabung ke roster Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {athleteRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-green-500/10 text-green-500">
                          {request.athlete_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{request.athlete_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Request diterima {new Date(request.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectAthleteRequest(request.id)}
                        className="gap-1"
                      >
                        <X className="h-4 w-4" />
                        Tolak
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptAthleteRequest(request.id)}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Terima
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {athletes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum ada atlet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Tambahkan atlet pertama Anda untuk mulai mengelola data mereka
              </p>
            </CardContent>
          </Card>
        ) : filteredAthletes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tidak ditemukan</h3>
              <p className="text-muted-foreground text-center mb-4">
                Tidak ada atlet yang cocok dengan pencarian "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Reset Pencarian
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAthletes.map((athlete) => (
              <Card key={athlete.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      {athlete.avatar_url ? (
                        <AvatarImage src={athlete.avatar_url} alt={athlete.athlete_name} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {athlete.athlete_name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{athlete.athlete_name}</CardTitle>
                      {athlete.assigned_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Assigned {new Date(athlete.assigned_at).toLocaleDateString("id-ID")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {athlete.age && (
                      <div>
                        <span className="text-muted-foreground">Usia:</span>
                        <p className="font-semibold">{athlete.age} tahun</p>
                      </div>
                    )}
                    {athlete.baseline_rhr && (
                      <div>
                        <span className="text-muted-foreground">RHR:</span>
                        <p className="font-semibold">{athlete.baseline_rhr} bpm</p>
                      </div>
                    )}
                    {athlete.baseline_vj && (
                      <div>
                        <span className="text-muted-foreground">VJ:</span>
                        <p className="font-semibold">{athlete.baseline_vj} cm</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedAthlete(athlete);
                        setEditName(athlete.athlete_name);
                        setEditAge(athlete.age?.toString() || "");
                        setEditRHR(athlete.baseline_rhr?.toString() || "");
                        setEditVJ(athlete.baseline_vj?.toString() || "");
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => generatePDFReport(athlete.id, athlete.athlete_name)}
                      disabled={isGeneratingPDF === athlete.id}
                    >
                      {isGeneratingPDF === athlete.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <FileDown className="h-3 w-3 mr-1" />
                      )}
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAthlete(athlete.id, athlete.athlete_name)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Data Atlet</DialogTitle>
              <DialogDescription>
                Update informasi profile atlet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-age">Usia (tahun)</Label>
                <Input
                  id="edit-age"
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-rhr">Baseline RHR (bpm)</Label>
                <Input
                  id="edit-rhr"
                  type="number"
                  value={editRHR}
                  onChange={(e) => setEditRHR(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-vj">Baseline VJ (cm)</Label>
                <Input
                  id="edit-vj"
                  type="number"
                  value={editVJ}
                  onChange={(e) => setEditVJ(e.target.value)}
                />
              </div>
              <Button
                onClick={handleEditAthlete}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
