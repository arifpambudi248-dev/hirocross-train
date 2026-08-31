import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, StopCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  romCm: number;
  onRep: (velocity: number) => void;
  reps: number[];
  onReset: () => void;
}

/**
 * Deteksi repetisi via sensor akselerometer HP (DeviceMotion).
 * HP diikat/digenggam pada barbell atau lengan; akselerasi vertikal diintegrasikan
 * untuk mendapat kecepatan puncak, dan durasi fase konsentrik untuk kecepatan rata-rata.
 */
export const SensorVelocityTracker = ({ romCm, onRep, reps, onReset }: Props) => {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const [accel, setAccel] = useState(0);
  const [phase, setPhase] = useState<"idle" | "naik" | "turun">("idle");
  const romRef = useRef(romCm);
  const state = useRef({
    baseline: 9.81,
    lastT: 0,
    dir: 0 as -1 | 0 | 1,
    phaseStart: 0,
    smooth: 0,
  });

  useEffect(() => {
    romRef.current = romCm;
  }, [romCm]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "DeviceMotionEvent" in window);
    return () => stop();
  }, []);

  const handler = (e: DeviceMotionEvent) => {
    const g = e.accelerationIncludingGravity;
    const lin = e.acceleration;
    const now = performance.now();
    const s = state.current;

    let a: number;
    if (lin && lin.y !== null && lin.y !== undefined && (lin.x || lin.y || lin.z)) {
      a = lin.y ?? 0;
    } else if (g) {
      const mag = Math.sqrt((g.x ?? 0) ** 2 + (g.y ?? 0) ** 2 + (g.z ?? 0) ** 2);
      s.baseline = s.baseline * 0.995 + mag * 0.005;
      a = mag - s.baseline;
    } else {
      return;
    }

    s.smooth = s.smooth * 0.7 + a * 0.3;
    setAccel(Math.min(1, Math.abs(s.smooth) / 8));

    const dir: -1 | 0 | 1 = s.smooth > 1.2 ? 1 : s.smooth < -1.2 ? -1 : 0;
    if (dir !== 0 && dir !== s.dir) {
      const duration = (now - s.phaseStart) / 1000;
      if (s.dir === 1 && duration > 0.15 && duration < 4) {
        const velocity = romRef.current / 100 / duration;
        if (velocity > 0.05 && velocity < 4) onRep(Math.round(velocity * 100) / 100);
      }
      s.dir = dir;
      s.phaseStart = now;
      setPhase(dir === 1 ? "naik" : "turun");
    }
    s.lastT = now;
  };

  const start = async () => {
    try {
      const anyDM = DeviceMotionEvent as any;
      if (typeof anyDM?.requestPermission === "function") {
        const res = await anyDM.requestPermission();
        if (res !== "granted") {
          toast.error("Izin sensor gerak ditolak");
          return;
        }
      }
      state.current = { baseline: 9.81, lastT: 0, dir: 0, phaseStart: performance.now(), smooth: 0 };
      window.addEventListener("devicemotion", handler);
      setActive(true);
    } catch (e: any) {
      toast.error("Sensor tidak tersedia: " + (e?.message ?? "unknown"));
    }
  };

  const stop = () => {
    window.removeEventListener("devicemotion", handler);
    setActive(false);
    setPhase("idle");
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 space-y-3">
          {!supported && (
            <p className="text-sm text-destructive">
              Perangkat/browser ini tidak mendukung sensor gerak. Gunakan mode kamera atau manual.
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Fase: {phase === "naik" ? "Konsentrik ↑" : phase === "turun" ? "Eksentrik ↓" : "Diam"}
            </span>
            <span className="text-xs text-muted-foreground">{active ? "Sensor aktif" : "Sensor mati"}</span>
          </div>
          <div className="h-3 rounded bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${accel * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button onClick={start} disabled={!supported} className="gap-2">
            <Smartphone className="h-4 w-4" /> Mulai Sensor
          </Button>
        ) : (
          <Button variant="secondary" onClick={stop} className="gap-2">
            <StopCircle className="h-4 w-4" /> Hentikan
          </Button>
        )}
        <Button variant="outline" onClick={onReset} className="gap-2" disabled={!reps.length}>
          <RotateCcw className="h-4 w-4" /> Reset Rep
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Ikat HP pada barbell/lengan (layar menghadap keluar, posisi tegak). Sensor gerak hanya aktif pada
        koneksi HTTPS dan perangkat mobile.
      </p>
    </div>
  );
};
