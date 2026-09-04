import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { SensorVelocityTracker } from "./SensorVelocityTracker";
import { CameraVelocityTracker } from "./CameraVelocityTracker";
import { VelocitySpeedometer } from "./VelocitySpeedometer";
import { buildRep, estimate1RM, fatigueAdvice, getVelocityZone, mean, RepData, velocityLoss } from "@/lib/vbt";
import { playTing, playWarn, primeAudio } from "@/lib/sound";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  athleteId: string;
  sessionId: string;
  sessionDate: string;
  sessionExerciseId: string;
  exerciseName: string;
  loadKg?: number | null;
  targetMin?: number | null;
  targetMax?: number | null;
  nextSetNumber: number;
  onSaved?: () => void;
}

export function VbtSetRecorder({
  open,
  onOpenChange,
  athleteId,
  sessionId,
  sessionDate,
  sessionExerciseId,
  exerciseName,
  loadKg,
  targetMin,
  targetMax,
  nextSetNumber,
  onSaved,
}: Props) {
  const [method, setMethod] = useState<"sensor" | "camera" | "manual">("sensor");
  const [repData, setRepData] = useState<RepData[]>([]);
  const [romCm, setRomCm] = useState("60");
  const [autoRom, setAutoRom] = useState(true);
  const [romDetected, setRomDetected] = useState(false);
  const [manual, setManual] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRepData([]);
      setNotes("");
      setManual("");
      setRomDetected(false);
    }
  }, [open]);

  const load = Number(loadKg ?? 0);
  const reps = useMemo(() => repData.map((r) => r.velocity), [repData]);

  const mv = useMemo(() => (reps.length ? Math.round(mean(reps) * 100) / 100 : 0), [reps]);
  const bestVel = useMemo(() => (reps.length ? Math.max(...reps) : 0), [reps]);
  const peakVel = useMemo(() => (repData.length ? Math.max(...repData.map((r) => r.peakVelocity)) : 0), [repData]);
  const avgPower = useMemo(
    () => (repData.length ? Math.round(mean(repData.map((r) => r.power))) : 0),
    [repData]
  );
  const peakPower = useMemo(() => (repData.length ? Math.max(...repData.map((r) => r.peakPower)) : 0), [repData]);
  const loss = useMemo(() => velocityLoss(reps), [reps]);
  const zone = useMemo(() => (mv ? getVelocityZone(mv) : null), [mv]);
  const est1rm = useMemo(() => estimate1RM(load, mv), [load, mv]);

  const pushRep = (velocity: number, detail?: { romCm: number; peakVelocity: number }) => {
    const rom = detail?.romCm ?? (Number(romCm) || 60);
    const rep = buildRep(load, velocity, rom, detail?.peakVelocity);
    setRepData((p) => [...p, rep]);
    primeAudio();
    const out = targetMin != null && targetMax != null && (rep.velocity < targetMin || rep.velocity > targetMax);
    out ? playWarn() : playTing();
  };

  const addManual = () => {
    const v = Number(manual);
    if (!v || v <= 0 || v > 4) {
      toast.error("Masukkan kecepatan 0.05 – 4.00 m/s");
      return;
    }
    pushRep(Math.round(v * 100) / 100);
    setManual("");
  };

  const save = async () => {
    if (!repData.length) {
      toast.error("Belum ada repetisi yang terekam");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vbt_sets" as any).insert({
      athlete_id: athleteId,
      date: sessionDate,
      exercise: exerciseName,
      load_kg: loadKg ?? null,
      method,
      reps: repData.length,
      rep_velocities: reps,
      rep_powers: repData.map((r) => r.power),
      mean_power: avgPower || null,
      peak_power: peakPower || null,
      avg_velocity: mv,
      mean_velocity: mv,
      peak_velocity: peakVel || bestVel,
      best_velocity: bestVel,
      velocity_loss_pct: loss,
      zone: zone?.label ?? null,
      est_1rm: est1rm,
      rom_cm: repData.length ? Math.round(mean(repData.map((r) => r.romCm))) : Number(romCm) || null,
      rom_auto: autoRom && romDetected,
      notes: notes || null,
      session_id: sessionId,
      session_exercise_id: sessionExerciseId,
      set_number: nextSetNumber,
      target_velocity_min: targetMin ?? null,
      target_velocity_max: targetMax ?? null,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    toast.success(`Set ${nextSetNumber} tersimpan & dikirim ke pelatih`);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            VBT — {exerciseName} (Set {nextSetNumber})
          </DialogTitle>
          <DialogDescription>
            {targetMin != null && targetMax != null
              ? `Target kecepatan pelatih: ${Number(targetMin).toFixed(2)} – ${Number(targetMax).toFixed(2)} m/s`
              : "Tidak ada target kecepatan khusus untuk latihan ini."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Beban (kg)</Label>
              <Input value={loadKg ?? "-"} disabled />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">ROM (cm)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Auto sensor</span>
                  <Switch checked={autoRom} onCheckedChange={setAutoRom} />
                </div>
              </div>
              <Input
                type="number"
                value={romCm}
                disabled={autoRom && method === "sensor"}
                onChange={(e) => setRomCm(e.target.value)}
              />
              {autoRom && method === "sensor" && (
                <p className="text-[10px] text-muted-foreground">
                  {romDetected ? "Terisi otomatis dari sensor HP" : "Akan terisi otomatis setelah repetisi pertama"}
                </p>
              )}
            </div>
          </div>

          <Tabs value={method} onValueChange={(v) => setMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sensor">Sensor HP</TabsTrigger>
              <TabsTrigger value="camera">Kamera</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="sensor" className="mt-4">
              <SensorVelocityTracker
                romCm={Number(romCm) || 60}
                onRep={pushRep}
                reps={reps}
                onReset={() => setRepData([])}
                targetMin={targetMin}
                targetMax={targetMax}
                autoRom={autoRom}
                onRomDetected={(cm) => {
                  setRomCm(String(cm));
                  setRomDetected(true);
                }}
              />
            </TabsContent>

            <TabsContent value="camera" className="mt-4">
              <CameraVelocityTracker
                romCm={Number(romCm) || 60}
                onRep={(v) => pushRep(v)}
                reps={reps}
                onReset={() => setRepData([])}
              />
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-3">
              <div className="flex justify-center">
                <VelocitySpeedometer
                  value={reps.length ? reps[reps.length - 1] : 0}
                  size={220}
                  targetMin={targetMin ?? undefined}
                  targetMax={targetMax ?? undefined}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Kecepatan rep (m/s)"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManual()}
                />
                <Button onClick={addManual} className="gap-2">
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {repData.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              {/* Ringkasan kecepatan & power */}
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <Stat label="Rep" value={String(repData.length)} />
                <Stat label="Avg Velocity" value={`${mv.toFixed(2)} m/s`} />
                <Stat label="Peak Velocity" value={`${peakVel.toFixed(2)} m/s`} />
                <Stat label="Avg Power" value={avgPower ? `${avgPower} W` : "—"} />
                <Stat label="Peak Power" value={peakPower ? `${peakPower} W` : "—"} />
                <Stat label="Est 1RM" value={est1rm ? `${est1rm} kg` : "—"} />
              </div>

              {/* Detail tiap repetisi */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-1 text-left">Rep</th>
                      <th className="py-1 text-right">Velocity</th>
                      <th className="py-1 text-right">Peak Vel</th>
                      <th className="py-1 text-right">ROM</th>
                      <th className="py-1 text-right">Power</th>
                      <th className="py-1 text-right">Peak Power</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repData.map((r, i) => {
                      const out =
                        targetMin != null && targetMax != null && (r.velocity < targetMin || r.velocity > targetMax);
                      return (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-1">
                            <Badge variant={out ? "destructive" : "secondary"}>R{i + 1}</Badge>
                          </td>
                          <td className="py-1 text-right font-medium">{r.velocity.toFixed(2)}</td>
                          <td className="py-1 text-right">{r.peakVelocity.toFixed(2)}</td>
                          <td className="py-1 text-right">{r.romCm} cm</td>
                          <td className="py-1 text-right font-medium">{r.power} W</td>
                          <td className="py-1 text-right">{r.peakPower} W</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Velocity loss {loss !== null ? `${loss}%` : "—"} • {fatigueAdvice(loss)}
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Catatan</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan set..." />
              </div>
              <Button onClick={save} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" /> Simpan Set {nextSetNumber}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
