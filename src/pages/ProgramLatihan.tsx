import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
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
      </div>
    </div>
  );
}
