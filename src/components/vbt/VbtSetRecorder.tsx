import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { SensorVelocityTracker } from "./SensorVelocityTracker";
import { CameraVelocityTracker } from "./CameraVelocityTracker";
import { VelocitySpeedometer } from "./VelocitySpeedometer";
import { estimate1RM, fatigueAdvice, getVelocityZone, mean, velocityLoss } from "@/lib/vbt";
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
  const [reps, setReps] = useState<number[]>([]);
  const [romCm, setRomCm] = useState("60");
  const [manual, setManual] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReps([]);
      setNotes("");
      setManual("");
    }
  }, [open]);

  const mv = useMemo(() => (reps.length ? Math.round(mean(reps) * 100) / 100 : 0), [reps]);
  const best = useMemo(() => (reps.length ? Math.max(...reps) : 0), [reps]);
  const loss = useMemo(() => velocityLoss(reps), [reps]);
  const zone = useMemo(() => (mv ? getVelocityZone(mv) : null), [mv]);
  const est1rm = useMemo(() => estimate1RM(Number(loadKg ?? 0), mv), [loadKg, mv]);

  const addManual = () => {
    const v = Number(manual);
    if (!v || v <= 0 || v > 4) {
      toast.error("Masukkan kecepatan 0.05 – 4.00 m/s");
      return;
    }
    const rounded = Math.round(v * 100) / 100;
    setReps((p) => [...p, rounded]);
    setManual("");
    primeAudio();
    const out = targetMin != null && targetMax != null && (rounded < targetMin || rounded > targetMax);
    out ? playWarn() : playTing();
  };

  const save = async () => {
    if (!reps.length) {
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
      reps: reps.length,
      rep_velocities: reps,
      mean_velocity: mv,
      peak_velocity: best,
      best_velocity: best,
      velocity_loss_pct: loss,
      zone: zone?.label ?? null,
      est_1rm: est1rm,
      rom_cm: romCm ? Number(romCm) : null,
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
              <Label className="text-xs">ROM (cm)</Label>
              <Input type="number" value={romCm} onChange={(e) => setRomCm(e.target.value)} />
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
                onRep={(v) => setReps((p) => [...p, v])}
                reps={reps}
                onReset={() => setReps([])}
                targetMin={targetMin}
                targetMax={targetMax}
              />
            </TabsContent>

            <TabsContent value="camera" className="mt-4">
              <CameraVelocityTracker
                romCm={Number(romCm) || 60}
                onRep={(v) => {
                  setReps((p) => [...p, v]);
                  primeAudio();
                  playTing();
                }}
                reps={reps}
                onReset={() => setReps([])}
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

          {reps.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex flex-wrap gap-2">
                {reps.map((v, i) => {
                  const out = targetMin != null && targetMax != null && (v < targetMin || v > targetMax);
                  return (
                    <Badge key={i} variant={out ? "destructive" : "secondary"}>
                      R{i + 1}: {v.toFixed(2)}
                    </Badge>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Rep" value={String(reps.length)} />
                <Stat label="Mean" value={`${mv.toFixed(2)} m/s`} />
                <Stat label="Loss" value={loss !== null ? `${loss}%` : "—"} />
                <Stat label="Est 1RM" value={est1rm ? `${est1rm} kg` : "—"} />
              </div>
              <p className="text-xs text-muted-foreground">{fatigueAdvice(loss)}</p>
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
