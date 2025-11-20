import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeSessionLoad } from "@/lib/trainingLoad";
import { generateWeeklyPlan } from "@/lib/weeklyPlanning";
import { format, subDays, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Trash2, Lightbulb, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

type TrainingSession = {
  id: string;
  date: string;
  session_name: string | null;
  rpe: number | null;
  duration_minutes: number | null;
  load_auto: number;
  load_manual: number | null;
  load_final: number;
  notes: string | null;
};

export default function ProgramLatihan() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>("");
  const [weeklyPlan, setWeeklyPlan] = useState<any>(null);
  const [competitionDate, setCompetitionDate] = useState<Date | null>(null);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sessionName, setSessionName] = useState("");
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<number>(60);
  const [loadManual, setLoadManual] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    
    // Fetch athlete name
    const { data: profile } = await supabase
      .from("profiles")
      .select("athlete_name")
      .eq("id", session.user.id)
      .single();
    
    if (profile) {
      setAthleteName(profile.athlete_name);
    }
    
    fetchSessions(session.user.id);
    loadWeeklyPlanData(session.user.id);
  };

  const loadWeeklyPlanData = async (userId: string) => {
    // Load competition date from annual plan
    const { data: plans } = await supabase
      .from("annual_plans")
      .select("competition_date")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const compDate = plans?.competition_date ? new Date(plans.competition_date) : addWeeks(new Date(), 12);
    setCompetitionDate(compDate);

    // Load readiness data
    const { data: readiness } = await supabase
      .from("readiness_logs")
      .select("readiness_score, readiness_zone")
      .eq("athlete_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!readiness) return;

    // Load previous week and average load
    const now = new Date();
    const lastWeekStart = format(startOfWeek(subDays(now, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const lastWeekEnd = format(endOfWeek(subDays(now, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const fourWeeksAgo = format(subDays(now, 28), "yyyy-MM-dd");

    const { data: lastWeekSessions } = await supabase
      .from("training_sessions")
      .select("load_final")
      .eq("user_id", userId)
      .gte("date", lastWeekStart)
      .lte("date", lastWeekEnd);

    const previousWeekLoad = lastWeekSessions?.reduce((sum, s) => sum + (s.load_final || 0), 0) || 0;

    const { data: fourWeekSessions } = await supabase
      .from("training_sessions")
      .select("load_final")
      .eq("user_id", userId)
      .gte("date", fourWeeksAgo);

    const avgWeeklyLoad = fourWeekSessions && fourWeekSessions.length > 0
      ? fourWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0) / 4
      : 1500;

    // Generate weekly plan
    const plan = generateWeeklyPlan(
      readiness.readiness_score,
      readiness.readiness_zone as 'low' | 'moderate' | 'prime',
      previousWeekLoad,
      avgWeeklyLoad,
      compDate
    );

    setWeeklyPlan(plan);
  };

  const fetchSessions = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const loadAuto = computeSessionLoad(rpe, duration);
    const loadFinal = loadManual !== null ? loadManual : loadAuto;

    try {
      const { error } = await supabase.from("training_sessions").insert({
        user_id: userId,
        athlete_name: athleteName,
        date,
        session_name: sessionName || null,
        rpe,
        duration_minutes: duration,
        load_auto: loadAuto,
        load_manual: loadManual,
        load_final: loadFinal,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Sesi latihan berhasil ditambahkan");
      setOpen(false);
      resetForm();
      fetchSessions(userId);
    } catch (error: any) {
      toast.error("Gagal menambahkan sesi: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Sesi latihan berhasil dihapus");
      if (userId) fetchSessions(userId);
    } catch (error: any) {
      toast.error("Gagal menghapus sesi: " + error.message);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), "yyyy-MM-dd"));
    setSessionName("");
    setRpe(5);
    setDuration(60);
    setLoadManual(null);
    setNotes("");
  };

  const currentLoadAuto = computeSessionLoad(rpe, duration);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history">Riwayat Sesi</TabsTrigger>
            <TabsTrigger value="weekly-plan">Rencana Mingguan</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Program Latihan</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Sesi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Sesi Latihan</DialogTitle>
                <DialogDescription>
                  Isi detail sesi latihan. Load akan dihitung otomatis berdasarkan RPE dan durasi.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-name">Nama Sesi (opsional)</Label>
                  <Input
                    id="session-name"
                    placeholder="Contoh: Latihan Endurance"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rpe">RPE (1-10)</Label>
                    <Input
                      id="rpe"
                      type="number"
                      min="1"
                      max="10"
                      value={rpe}
                      onChange={(e) => setRpe(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durasi (menit)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Load otomatis: <span className="font-bold text-foreground">{currentLoadAuto} AU</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="load-manual">Load Manual (opsional)</Label>
                  <Input
                    id="load-manual"
                    type="number"
                    placeholder="Kosongkan untuk gunakan load otomatis"
                    value={loadManual || ""}
                    onChange={(e) =>
                      setLoadManual(e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan (opsional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan tambahan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Simpan Sesi
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Sesi Latihan</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Belum ada sesi latihan. Klik "Tambah Sesi" untuk memulai.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nama Sesi</TableHead>
                      <TableHead className="text-center">RPE</TableHead>
                      <TableHead className="text-center">Durasi</TableHead>
                      <TableHead className="text-right">Load Auto</TableHead>
                      <TableHead className="text-right">Load Manual</TableHead>
                      <TableHead className="text-right">Load Final</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          {format(new Date(session.date), "d MMM yyyy", {
                            locale: localeId,
                          })}
                        </TableCell>
                        <TableCell>{session.session_name || "-"}</TableCell>
                        <TableCell className="text-center">{session.rpe}</TableCell>
                        <TableCell className="text-center">
                          {session.duration_minutes} min
                        </TableCell>
                        <TableCell className="text-right">{session.load_auto} AU</TableCell>
                        <TableCell className="text-right">
                          {session.load_manual ? `${session.load_manual} AU` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {session.load_final} AU
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(session.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="weekly-plan">
            {weeklyPlan ? (
              <div className="space-y-6">
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Rencana Latihan Mingguan Otomatis</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p className="font-semibold">{weeklyPlan.notes}</p>
                      <p className="text-sm">Fase: <span className="font-medium capitalize">{weeklyPlan.phaseType}</span></p>
                      <p className="text-sm">Target Load Mingguan: <span className="font-bold">{weeklyPlan.totalPlannedLoad} AU</span></p>
                      <p className="text-sm text-muted-foreground">
                        Kompetisi: {competitionDate ? format(competitionDate, "dd MMM yyyy", { locale: localeId }) : "Tidak diset"}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Sesi Latihan yang Direkomendasikan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hari</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Sesi</TableHead>
                          <TableHead>Fokus</TableHead>
                          <TableHead className="text-center">RPE</TableHead>
                          <TableHead className="text-center">Durasi</TableHead>
                          <TableHead className="text-right">Est. Load</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weeklyPlan.sessions.map((session: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{session.day}</TableCell>
                            <TableCell>{format(new Date(session.date), "dd MMM", { locale: localeId })}</TableCell>
                            <TableCell>{session.sessionName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{session.focus}</TableCell>
                            <TableCell className="text-center font-semibold">{session.recommendedRPE}</TableCell>
                            <TableCell className="text-center">{session.recommendedDuration} min</TableCell>
                            <TableCell className="text-right font-medium">{session.estimatedLoad} AU</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Alert>
                  <CalendarIcon className="h-4 w-4" />
                  <AlertTitle>Cara Menggunakan</AlertTitle>
                  <AlertDescription className="text-sm">
                    Gunakan rekomendasi di atas sebagai panduan perencanaan latihan minggu ini. 
                    Anda dapat menambahkan sesi di tab "Riwayat Sesi" dengan RPE dan durasi yang direkomendasikan, 
                    atau menyesuaikan sesuai kondisi lapangan.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Memuat rencana mingguan... Pastikan Anda sudah mengisi data readiness dan memiliki annual plan.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
