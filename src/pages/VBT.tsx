import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Zap, Save, Trash2, Plus, Gauge } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { CameraVelocityTracker } from "@/components/vbt/CameraVelocityTracker";
import { SensorVelocityTracker } from "@/components/vbt/SensorVelocityTracker";
import {
  VBT_EXERCISES,
  VELOCITY_ZONES,
  estimate1RM,
  fatigueAdvice,
  getVelocityZone,
  mean,
  velocityLoss,
  velocityToPercent1RM,
  type VbtMethod,
} from "@/lib/vbt";

type VbtSet = {
  id: string;
  date: string;
  exercise: string;
  load_kg: number | null;
  method: string;
  reps: number;
  rep_velocities: number[];
  mean_velocity: number | null;
  best_velocity: number | null;
  velocity_loss_pct: number | null;
  zone: string | null;
  est_1rm: number | null;
  rom_cm: number | null;
  notes: string | null;
};

export default function VBT() {
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<VbtSet[]>([]);
  const [loading, setLoading] = useState(false);

  const [method, setMethod] = useState<VbtMethod>("camera");
  const [exercise, setExercise] = useState(VBT_EXERCISES[0]);
  const [loadKg, setLoadKg] = useState<string>("");
  const [romCm, setRomCm] = useState<string>("60");
  const [notes, setNotes] = useState("");
  const [reps, setReps] = useState<number[]>([]);
  const [manualVelocity, setManualVelocity] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadHistory(user.id);
      }
    });
  }, []);

  const loadHistory = async (uid: string) => {
    const { data, error } = await supabase
      .from("vbt_sets" as any)
      .select("*")
      .eq("athlete_id", uid)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error(error);
      return;
    }
    setHistory((data as any[])?.map((d) => ({ ...d, rep_velocities: d.rep_velocities ?? [] })) ?? []);
  };

  const mv = useMemo(() => (reps.length ? Math.round(mean(reps) * 100) / 100 : 0), [reps]);
  const best = useMemo(() => (reps.length ? Math.max(...reps) : 0), [reps]);
  const loss = useMemo(() => velocityLoss(reps), [reps]);
  const zone = useMemo(() => (mv ? getVelocityZone(mv) : null), [mv]);
  const est1rm = useMemo(() => estimate1RM(Number(loadKg), mv), [loadKg, mv]);

  const addRep = (v: number) => setReps((prev) => [...prev, v]);

  const addManualRep = () => {
    const v = Number(manualVelocity);
    if (!v || v <= 0 || v > 4) {
      toast.error("Masukkan kecepatan 0.05 – 4.00 m/s");
      return;
    }
    addRep(Math.round(v * 100) / 100);
    setManualVelocity("");
  };

  const saveSet = async () => {
    if (!userId) return;
    if (!reps.length) {
      toast.error("Belum ada repetisi yang terekam");
      return;
    }
    setLoading(true);
    const payload = {
      athlete_id: userId,
      date: new Date().toISOString().split("T")[0],
      exercise,
      load_kg: loadKg ? Number(loadKg) : null,
      method,
      reps: reps.length,
      rep_velocities: reps,
      mean_velocity: mv,
      peak_velocity: best,
      best_velocity: best,
      velocity_loss_pct: loss,
      zone: zone?.label ?? null,
      est_1rm: est1rm,
      rom_cm: romCm ? Number(romCm) : null,
      notes,
    };
    const { error } = await supabase.from("vbt_sets" as any).insert(payload as any);
    setLoading(false);
    if (error) {
      toast.error("Gagal menyimpan set: " + error.message);
      return;
    }
    toast.success("Set VBT tersimpan");
    setReps([]);
    setNotes("");
    loadHistory(userId);
  };

  const deleteSet = async (id: string) => {
    const { error } = await supabase.from("vbt_sets" as any).delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
      return;
    }
    setHistory((h) => h.filter((s) => s.id !== id));
  };

  const repChartData = reps.map((v, i) => ({ rep: `R${i + 1}`, velocity: v }));
  const trendData = [...history]
    .filter((h) => h.mean_velocity)
    .slice(0, 15)
    .reverse()
    .map((h) => ({ label: `${h.date.slice(5)}`, mv: Number(h.mean_velocity), load: h.load_kg ?? 0 }));

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <Navigation />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Velocity Based Training (VBT)</h1>
            <p className="text-sm text-muted-foreground">
              Ukur kecepatan angkatan memakai kamera HP, sensor gerak HP, atau input manual.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Setup + tracker */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pengaturan Set</CardTitle>
                <CardDescription>Isi latihan, beban, dan ROM sebelum merekam.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Latihan</Label>
                  <Select value={exercise} onValueChange={setExercise}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VBT_EXERCISES.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Beban (kg)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={loadKg}
                    onChange={(e) => setLoadKg(e.target.value)}
                    placeholder="mis. 80"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ROM / jarak angkat (cm)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={romCm}
                    onChange={(e) => setRomCm(e.target.value)}
                    placeholder="mis. 60"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metode Pengukuran</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={method} onValueChange={(v) => setMethod(v as VbtMethod)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="camera">Kamera</TabsTrigger>
                    <TabsTrigger value="sensor">Sensor HP</TabsTrigger>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                  </TabsList>

                  <TabsContent value="camera" className="mt-4">
                    <CameraVelocityTracker
                      romCm={Number(romCm) || 60}
                      onRep={addRep}
                      reps={reps}
                      onReset={() => setReps([])}
                    />
                  </TabsContent>

                  <TabsContent value="sensor" className="mt-4">
                    <SensorVelocityTracker
                      romCm={Number(romCm) || 60}
                      onRep={addRep}
                      reps={reps}
                      onReset={() => setReps([])}
                    />
                  </TabsContent>

                  <TabsContent value="manual" className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Kecepatan rep (m/s)"
                        value={manualVelocity}
                        onChange={(e) => setManualVelocity(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addManualRep()}
                      />
                      <Button onClick={addManualRep} className="gap-2">
                        <Plus className="h-4 w-4" /> Tambah
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gunakan bila memakai alat VBT eksternal (encoder) dan ingin mencatat hasilnya di sini.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {reps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Kecepatan per Repetisi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={repChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="rep" fontSize={12} />
                        <YAxis fontSize={12} unit=" m/s" />
                        <RTooltip formatter={(v: any) => [`${v} m/s`, "Kecepatan"]} />
                        <ReferenceLine y={best * 0.8} stroke="hsl(25 90% 55%)" strokeDasharray="4 4" label={{ value: "-20%", fontSize: 10 }} />
                        <Bar dataKey="velocity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reps.map((v, i) => (
                      <Badge key={i} variant="secondary">
                        R{i + 1}: {v.toFixed(2)} m/s
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan set..." />
                  </div>
                  <Button onClick={saveSet} disabled={loading} className="gap-2">
                    <Save className="h-4 w-4" /> Simpan Set
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Live metrics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" /> Metrik Set
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Repetisi" value={String(reps.length)} />
                  <Metric label="Mean Velocity" value={mv ? `${mv.toFixed(2)} m/s` : "—"} />
                  <Metric label="Rep Tercepat" value={best ? `${best.toFixed(2)} m/s` : "—"} />
                  <Metric label="Velocity Loss" value={loss !== null ? `${loss}%` : "—"} />
                  <Metric label="Estimasi %1RM" value={mv ? `${Math.round(velocityToPercent1RM(mv))}%` : "—"} />
                  <Metric label="Estimasi 1RM" value={est1rm ? `${est1rm} kg` : "—"} />
                </div>
                {zone && (
                  <div className="rounded-md border border-border p-3" style={{ borderLeftWidth: 4, borderLeftColor: zone.color }}>
                    <p className="font-semibold text-sm">{zone.label}</p>
                    <p className="text-xs text-muted-foreground">{zone.goal}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{fatigueAdvice(loss)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zona Kecepatan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {VELOCITY_ZONES.map((z) => (
                  <div key={z.key} className="flex items-center gap-3 text-sm">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: z.color }} />
                    <span className="flex-1">{z.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {z.max > 90 ? `> ${z.min}` : `${z.min}–${z.max}`} m/s
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {trendData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tren Mean Velocity</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} unit=" m/s" />
                  <RTooltip />
                  <Line type="monotone" dataKey="mv" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riwayat Set VBT</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data VBT.</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-3 sm:hidden">
                  {history.map((s) => (
                    <div key={s.id} className="rounded-md border border-border p-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{s.exercise}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.date} • {s.load_kg ?? "-"} kg • {s.method}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteSet(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-xs">
                        {s.reps} rep • MV {Number(s.mean_velocity ?? 0).toFixed(2)} m/s • Loss{" "}
                        {s.velocity_loss_pct ?? "-"}% • Est 1RM {s.est_1rm ?? "-"} kg
                      </p>
                      {s.zone && <Badge variant="secondary" className="text-xs">{s.zone}</Badge>}
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Latihan</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead className="text-right">Beban</TableHead>
                        <TableHead className="text-right">Rep</TableHead>
                        <TableHead className="text-right">MV</TableHead>
                        <TableHead className="text-right">Loss</TableHead>
                        <TableHead className="text-right">Est 1RM</TableHead>
                        <TableHead>Zona</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.date}</TableCell>
                          <TableCell className="font-medium">{s.exercise}</TableCell>
                          <TableCell className="capitalize">{s.method}</TableCell>
                          <TableCell className="text-right">{s.load_kg ?? "-"}</TableCell>
                          <TableCell className="text-right">{s.reps}</TableCell>
                          <TableCell className="text-right">{Number(s.mean_velocity ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{s.velocity_loss_pct ?? "-"}%</TableCell>
                          <TableCell className="text-right">{s.est_1rm ?? "-"}</TableCell>
                          <TableCell>
                            {s.zone && <Badge variant="secondary" className="text-xs">{s.zone}</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteSet(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNavigation />
    </div>
  );
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-secondary/50 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-bold">{value}</p>
  </div>
);
