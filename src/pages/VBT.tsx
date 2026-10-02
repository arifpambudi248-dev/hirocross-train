import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Activity, Gauge, Plus, RotateCcw, Save, Target, Trash2, Wifi } from "lucide-react";
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
import { VelocitySpeedometer } from "@/components/vbt/VelocitySpeedometer";
import {
  VBT_EXERCISES,
  buildRep,
  estimate1RM,
  fatigueAdvice,
  getVelocityZone,
  mean,
  velocityLoss,
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
  const [targetMin, setTargetMin] = useState("0.50");
  const [targetMax, setTargetMax] = useState("0.80");

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
  const powerData = useMemo(
    () => reps.map((velocity) => buildRep(Number(loadKg) || 0, velocity, Number(romCm) || 60)),
    [loadKg, reps, romCm]
  );
  const avgPower = useMemo(
    () => (powerData.length ? Math.round(mean(powerData.map((rep) => rep.power))) : 0),
    [powerData]
  );
  const peakPower = useMemo(
    () => (powerData.length ? Math.max(...powerData.map((rep) => rep.peakPower)) : 0),
    [powerData]
  );

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
    <div className="min-h-screen bg-background pb-20 font-vbt sm:pb-0">
      <Navigation />
      <main className="mx-auto max-w-[1500px] space-y-5 px-3 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="font-vbt-heading text-sm uppercase text-primary">HIROCROSS TRAIN</p>
            <h1 className="font-vbt-heading text-2xl uppercase sm:text-3xl">VBT Performance Console</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-success" /> Siap merekam
            <Wifi className="ml-2 h-4 w-4 text-success" /> Perangkat
          </div>
        </header>

        <section className="overflow-hidden border border-border bg-card shadow-premium">
          <div className="grid xl:grid-cols-[280px_minmax(420px,1fr)_300px]">
            <aside className="space-y-5 border-b border-border p-4 xl:border-b-0 xl:border-r sm:p-5">
              <InstrumentHeading icon={<Activity className="h-4 w-4" />} title="Set aktif" />
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Latihan</Label>
                <Select value={exercise} onValueChange={setExercise}>
                  <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>{VBT_EXERCISES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ReadoutInput label="Beban" unit="kg" value={loadKg} onChange={setLoadKg} placeholder="80" />
                <ReadoutInput label="ROM" unit="cm" value={romCm} onChange={setRomCm} placeholder="60" />
              </div>
              <div className="border-y border-border py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Kecepatan repetisi</p>
                  <span className="font-vbt-heading text-xl tabular-nums">{String(reps.length).padStart(2, "0")}</span>
                </div>
                <div className="h-36">
                  {reps.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={repChartData} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="rep" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 2]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <RTooltip formatter={(v: number) => [`${v.toFixed(2)} m/s`, "Velocity"]} />
                        <ReferenceLine y={Number(targetMin)} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
                        <Bar dataKey="velocity" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center border border-dashed border-border text-xs text-muted-foreground">Menunggu repetisi</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <Metric label="Set" value="01" />
                <Metric label="Rep" value={String(reps.length).padStart(2, "0")} />
                <Metric label="Beban" value={loadKg ? `${loadKg} kg` : "—"} />
                <Metric label="ROM" value={romCm ? `${romCm} cm` : "—"} />
              </div>
            </aside>

            <div className="flex min-w-0 flex-col p-4 sm:p-6">
              <Tabs value={method} onValueChange={(value) => setMethod(value as VbtMethod)} className="flex flex-1 flex-col">
                <TabsList className="mx-auto grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="sensor">Sensor HP</TabsTrigger>
                  <TabsTrigger value="camera">Kamera</TabsTrigger>
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                </TabsList>
                <div className="flex min-h-[340px] flex-1 items-center justify-center py-4">
                  {method !== "sensor" && (
                    <VelocitySpeedometer value={reps.length ? reps[reps.length - 1] : 0} max={2} size={330} targetMin={Number(targetMin)} targetMax={Number(targetMax)} sublabel={`Target ${targetMin} – ${targetMax} m/s`} />
                  )}
                  <TabsContent value="sensor" className="mt-0 w-full">
                    <SensorVelocityTracker romCm={Number(romCm) || 60} onRep={addRep} reps={reps} onReset={() => setReps([])} targetMin={Number(targetMin)} targetMax={Number(targetMax)} autoRom onRomDetected={(value) => setRomCm(String(value))} />
                  </TabsContent>
                </div>
                <TabsContent value="camera" className="mt-0"><CameraVelocityTracker romCm={Number(romCm) || 60} onRep={addRep} reps={reps} onReset={() => setReps([])} /></TabsContent>
                <TabsContent value="manual" className="mt-0">
                  <div className="mx-auto flex max-w-md gap-2">
                    <Input type="number" step="0.01" inputMode="decimal" placeholder="Kecepatan rep (m/s)" value={manualVelocity} onChange={(e) => setManualVelocity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManualRep()} />
                    <Button onClick={addManualRep} className="gap-2"><Plus className="h-4 w-4" /> Tambah</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <aside className="space-y-5 border-t border-border bg-background/40 p-4 xl:border-l xl:border-t-0 sm:p-5">
              <InstrumentHeading icon={<Gauge className="h-4 w-4" />} title="Data performa" />
              <div className="grid grid-cols-2 gap-px bg-border">
                <Metric label="Avg velocity" value={mv ? `${mv.toFixed(2)} m/s` : "—"} emphasis />
                <Metric label="Peak velocity" value={best ? `${best.toFixed(2)} m/s` : "—"} />
                <Metric label="Avg power" value={avgPower ? `${avgPower} W` : "—"} />
                <Metric label="Peak power" value={peakPower ? `${peakPower} W` : "—"} />
                <Metric label="Velocity loss" value={loss !== null ? `${loss}%` : "—"} />
                <Metric label="Estimasi 1RM" value={est1rm ? `${est1rm} kg` : "—"} />
              </div>
              <div className="space-y-2 border-y border-border py-4">
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><p className="text-[10px] font-bold uppercase text-muted-foreground">Target velocity</p></div>
                <div className="grid grid-cols-2 gap-2">
                  <ReadoutInput label="Minimum" unit="m/s" value={targetMin} onChange={setTargetMin} placeholder="0.50" step="0.01" />
                  <ReadoutInput label="Maksimum" unit="m/s" value={targetMax} onChange={setTargetMax} placeholder="0.80" step="0.01" />
                </div>
              </div>
              {zone && <div className="border-l-4 border-primary bg-primary/10 p-3"><p className="font-vbt-heading uppercase">{zone.label}</p><p className="text-xs text-muted-foreground">{zone.goal}</p></div>}
              <p className="text-xs text-muted-foreground">{fatigueAdvice(loss)}</p>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Catatan set</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan..." />
              </div>
              <div className="grid grid-cols-[44px_1fr] gap-2">
                <Button variant="outline" size="icon" onClick={() => setReps([])} disabled={!reps.length} aria-label="Reset repetisi"><RotateCcw className="h-4 w-4" /></Button>
                <Button onClick={saveSet} disabled={loading || !reps.length} className="gap-2 font-bold uppercase"><Save className="h-4 w-4" /> Simpan set</Button>
              </div>
            </aside>
          </div>
        </section>

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

        <Card className="rounded-none">
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

const Metric = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => (
  <div className="bg-card p-3">
    <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
    <p className={`${emphasis ? "text-primary" : "text-foreground"} font-vbt-heading text-xl tabular-nums`}>{value}</p>
  </div>
);

const InstrumentHeading = ({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="flex items-center gap-2 border-b border-border pb-3 text-primary">
    {icon}<h2 className="font-vbt-heading text-sm uppercase text-foreground">{title}</h2>
  </div>
);

const ReadoutInput = ({ label, unit, value, onChange, placeholder, step }: { label: string; unit: string; value: string; onChange: (value: string) => void; placeholder: string; step?: string }) => (
  <div className="space-y-1">
    <Label className="text-[10px] font-bold uppercase text-muted-foreground">{label}</Label>
    <div className="relative">
      <Input type="number" inputMode="decimal" step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pr-11 font-vbt-heading text-lg tabular-nums" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">{unit}</span>
    </div>
  </div>
);
