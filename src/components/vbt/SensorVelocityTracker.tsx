import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, StopCircle, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { VelocitySpeedometer } from "./VelocitySpeedometer";
import { playTing, playWarn, primeAudio } from "@/lib/sound";

interface Props {
  romCm: number;
  onRep: (velocity: number, detail?: { romCm: number; peakVelocity: number }) => void;
  reps: number[];
  onReset: () => void;
  targetMin?: number | null;
  targetMax?: number | null;
  /** ROM dihitung otomatis dari integrasi sensor (tinggi/rendah gerakan). */
  autoRom?: boolean;
  /** Dilaporkan ke parent agar field ROM ikut terisi otomatis. */
  onRomDetected?: (romCm: number) => void;
}

/**
 * Deteksi repetisi via sensor akselerometer HP (DeviceMotion).
 * HP diikat/digenggam pada barbell atau lengan; akselerasi vertikal diintegrasikan
 * untuk mendapat kecepatan sesaat, dan durasi fase konsentrik untuk kecepatan rata-rata.
 */
export const SensorVelocityTracker = ({
  romCm,
  onRep,
  reps,
  onReset,
  targetMin,
  targetMax,
  autoRom = true,
  onRomDetected,
}: Props) => {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const [liveVel, setLiveVel] = useState(0);
  const [lastVel, setLastVel] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "naik" | "turun">("idle");
  const [lastRom, setLastRom] = useState<number | null>(null);
  const [lastPeak, setLastPeak] = useState<number | null>(null);
  const [sound, setSound] = useState(true);
  const romRef = useRef(romCm);
  const soundRef = useRef(true);
  const targetRef = useRef<{ min?: number | null; max?: number | null }>({});
  const state = useRef({
    baseline: 9.81,
    lastT: 0,
    dir: 0 as -1 | 0 | 1,
    phaseStart: 0,
    smooth: 0,
    vel: 0,
    dist: 0,
    peak: 0,
  });

  useEffect(() => {
    romRef.current = romCm;
  }, [romCm]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    targetRef.current = { min: targetMin, max: targetMax };
  }, [targetMin, targetMax]);

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

    // integrasi kecepatan sesaat untuk tampilan speedometer
    const dt = s.lastT ? Math.min(0.1, (now - s.lastT) / 1000) : 0;
    if (Math.abs(s.smooth) < 0.6) {
      s.vel *= 0.6; // peredam saat diam (anti-drift)
    } else {
      s.vel = Math.max(0, Math.min(4, s.vel + s.smooth * dt));
    }
    setLiveVel(Math.round(s.vel * 100) / 100);

    // integrasi perpindahan selama fase konsentrik -> ROM otomatis
    if (s.dir === 1) {
      s.dist += s.vel * dt;
      if (s.vel > s.peak) s.peak = s.vel;
    }

    const dir: -1 | 0 | 1 = s.smooth > 1.2 ? 1 : s.smooth < -1.2 ? -1 : 0;
    if (dir !== 0 && dir !== s.dir) {
      const duration = (now - s.phaseStart) / 1000;
      if (s.dir === 1 && duration > 0.15 && duration < 4) {
        const detectedCm = Math.round(Math.min(200, Math.max(10, s.dist * 100)));
        const usedRom = autoRom && s.dist > 0.05 ? detectedCm : romRef.current;
        const velocity = usedRom / 100 / duration;
        if (velocity > 0.05 && velocity < 4) {
          const v = Math.round(velocity * 100) / 100;
          const peakV = Math.round(Math.max(s.peak, v) * 100) / 100;
          onRep(v, { romCm: usedRom, peakVelocity: peakV });
          setLastVel(v);
          setLastRom(usedRom);
          setLastPeak(peakV);
          if (autoRom && s.dist > 0.05) onRomDetected?.(usedRom);
          if (soundRef.current) {
            const { min, max } = targetRef.current;
            const out = min != null && max != null && (v < min || v > max);
            out ? playWarn() : playTing();
          }
        }
      }
      s.dir = dir;
      s.phaseStart = now;
      s.dist = 0;
      s.peak = 0;
      setPhase(dir === 1 ? "naik" : "turun");
    }
    s.lastT = now;
  };

  const start = async () => {
    try {
      primeAudio();
      const anyDM = DeviceMotionEvent as any;
      if (typeof anyDM?.requestPermission === "function") {
        const res = await anyDM.requestPermission();
        if (res !== "granted") {
          toast.error("Izin sensor gerak ditolak");
          return;
        }
      }
      state.current = {
        baseline: 9.81,
        lastT: 0,
        dir: 0,
        phaseStart: performance.now(),
        smooth: 0,
        vel: 0,
        dist: 0,
        peak: 0,
      };
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
    setLiveVel(0);
  };

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-b from-primary/10 to-transparent">
        <CardContent className="p-4 flex flex-col items-center gap-3">
          <VelocitySpeedometer
            value={active ? liveVel : lastVel ?? 0}
            max={2}
            size={260}
            targetMin={targetMin ?? undefined}
            targetMax={targetMax ?? undefined}
            sublabel={
              targetMin != null && targetMax != null
                ? `Target pelatih ${targetMin.toFixed(2)} – ${targetMax.toFixed(2)} m/s`
                : undefined
            }
          />

          <div className="flex w-full items-center justify-between text-sm">
            <span className="font-medium">
              Fase: {phase === "naik" ? "Konsentrik ↑" : phase === "turun" ? "Eksentrik ↓" : "Diam"}
            </span>
            <Badge variant={active ? "default" : "secondary"}>{active ? "Sensor aktif" : "Sensor mati"}</Badge>
          </div>

          {lastVel !== null && (
            <p className="text-xs text-muted-foreground text-center">
              Rep terakhir: <span className="font-semibold text-foreground">{lastVel.toFixed(2)} m/s</span>
              {lastPeak !== null && <> • Peak {lastPeak.toFixed(2)} m/s</>}
              {lastRom !== null && <> • ROM {lastRom} cm{autoRom ? " (otomatis)" : ""}</>} • Total {reps.length} rep
            </p>
          )}
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
        <Button
          variant="outline"
          onClick={() => {
            setSound((s) => !s);
            if (!sound) {
              primeAudio();
              playTing();
            }
          }}
          className="gap-2"
        >
          {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {sound ? "Suara On" : "Suara Off"}
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2" disabled={!reps.length}>
          <RotateCcw className="h-4 w-4" /> Reset Rep
        </Button>
      </div>

      {!supported && (
        <p className="text-sm text-destructive">
          Perangkat/browser ini tidak mendukung sensor gerak. Gunakan mode kamera atau manual.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Ikat HP pada barbell/lengan (layar menghadap keluar, posisi tegak). Sensor gerak hanya aktif pada
        koneksi HTTPS dan perangkat mobile. Bunyi "ting" berbunyi tiap 1 repetisi terdeteksi.
      </p>
    </div>
  );
};
