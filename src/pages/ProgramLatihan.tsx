import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { computeSessionLoad } from "@/lib/trainingLoad";
import type { TrainingSession } from "@/types/database";

export default function ProgramLatihan() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      loadSessions(user.id);
    }
  };

  const loadSessions = async (uid: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("training_sessions")
      .select("*")
      .eq("athlete_id", uid)
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      toast.error("Gagal memuat data: " + error.message);
    } else {
      setSessions((data as any[]) || []);
    }
    setLoading(false);
  };

  const addNewSession = () => {
    const today = new Date().toISOString().split("T")[0];
    setSessions([
      {
        date: today,
        session_name: "",
        session_type: "Endurance",
        duration_min: 60,
        rpe: 5,
        load_auto: 0,
        load_manual: null,
        load_final: 0,
        notes: "",
      },
      ...sessions,
    ]);
  };

  const updateSession = (index: number, field: keyof TrainingSession, value: any) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate load
    if (field === "rpe" || field === "duration_min") {
      const loadAuto = computeSessionLoad(updated[index].rpe, updated[index].duration_min);
      updated[index].load_auto = loadAuto;
      if (!updated[index].load_manual) {
        updated[index].load_final = loadAuto;
      }
    }

    if (field === "load_manual") {
      updated[index].load_final = value || updated[index].load_auto;
    }

    setSessions(updated);
  };

  const saveSession = async (session: TrainingSession, index: number) => {
    if (!userId || !session.session_name) {
      toast.error("Nama sesi wajib diisi");
      return;
    }

    const payload = {
      athlete_id: userId,
      date: session.date,
      session_name: session.session_name,
      session_type: session.session_type,
      duration_min: session.duration_min,
      rpe: session.rpe,
      load_auto: session.load_auto,
      load_manual: session.load_manual,
      load_final: session.load_final,
      notes: session.notes,
    };

    if (session.id) {
      const { error } = await (supabase as any)
        .from("training_sessions")
        .update(payload as any)
        .eq("id", session.id);

      if (error) {
        toast.error("Gagal update: " + error.message);
      } else {
        toast.success("Sesi berhasil diupdate");
      }
    } else {
      const { data, error } = await (supabase as any)
        .from("training_sessions")
        .insert([payload as any])
        .select()
        .single();

      if (error) {
        toast.error("Gagal simpan: " + error.message);
      } else if (data) {
        toast.success("Sesi berhasil disimpan");
        const updated = [...sessions];
        updated[index] = { ...updated[index], id: (data as any).id };
        setSessions(updated);
      }
    }
  };

  const deleteSession = async (session: TrainingSession, index: number) => {
    if (session.id) {
      const { error } = await (supabase as any)
        .from("training_sessions")
        .delete()
        .eq("id", session.id);

      if (error) {
        toast.error("Gagal hapus: " + error.message);
        return;
      }
      toast.success("Sesi berhasil dihapus");
    }

    setSessions(sessions.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Program Latihan</CardTitle>
              <Button onClick={addNewSession} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Sesi
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Sesi</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Durasi (menit)</TableHead>
                    <TableHead>RPE</TableHead>
                    <TableHead>Load Auto</TableHead>
                    <TableHead>Load Manual</TableHead>
                    <TableHead>Load Final</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session, idx) => (
                    <TableRow key={session.id || idx}>
                      <TableCell>
                        <Input
                          type="date"
                          value={session.date}
                          onChange={(e) => updateSession(idx, "date", e.target.value)}
                          className="w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={session.session_name}
                          onChange={(e) => updateSession(idx, "session_name", e.target.value)}
                          placeholder="Nama sesi"
                          className="w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={session.session_type}
                          onValueChange={(v) => updateSession(idx, "session_type", v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Endurance">Endurance</SelectItem>
                            <SelectItem value="Strength">Strength</SelectItem>
                            <SelectItem value="Speed">Speed</SelectItem>
                            <SelectItem value="Recovery">Recovery</SelectItem>
                            <SelectItem value="Interval">Interval</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={session.duration_min || ""}
                          onChange={(e) =>
                            updateSession(idx, "duration_min", parseInt(e.target.value) || null)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={session.rpe?.toString() || ""}
                          onValueChange={(v) => updateSession(idx, "rpe", parseInt(v))}
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="w-16 text-sm text-muted-foreground">
                          {session.load_auto}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={session.load_manual || ""}
                          onChange={(e) =>
                            updateSession(idx, "load_manual", parseFloat(e.target.value) || null)
                          }
                          placeholder="Override"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="w-16 font-semibold text-primary">
                          {session.load_final}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={session.notes}
                          onChange={(e) => updateSession(idx, "notes", e.target.value)}
                          placeholder="Catatan"
                          className="w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveSession(session, idx)}
                            className="gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Simpan
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSession(session, idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {sessions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Belum ada sesi latihan. Klik "Tambah Sesi" untuk memulai.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
