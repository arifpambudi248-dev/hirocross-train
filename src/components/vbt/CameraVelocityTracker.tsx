import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CameraOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Range of motion (cm) untuk konversi durasi konsentrik ke kecepatan */
  romCm: number;
  onRep: (velocity: number) => void;
  reps: number[];
  onReset: () => void;
}

/**
 * Deteksi repetisi via kamera: frame differencing untuk mencari titik pusat
 * gerakan secara vertikal, lalu mengukur durasi fase konsentrik (naik).
 * Kecepatan rata-rata = ROM (m) / durasi konsentrik (s).
 */
export const CameraVelocityTracker = ({ romCm, onRep, reps, onReset }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();
  const prevFrame = useRef<Uint8ClampedArray | null>(null);
  const romRef = useRef(romCm);
  const stateRef = useRef({
    lastY: null as number | null,
    direction: 0 as -1 | 0 | 1,
    phaseStart: 0,
    phaseStartY: 0,
    smoothY: null as number | null,
  });

  const [active, setActive] = useState(false);
  const [motion, setMotion] = useState(0);
  const [phase, setPhase] = useState<"idle" | "turun" | "naik">("idle");

  useEffect(() => {
    romRef.current = romCm;
  }, [romCm]);

  useEffect(() => () => stop(), []);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    prevFrame.current = null;
    setActive(false);
    setPhase("idle");
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      stateRef.current = { lastY: null, direction: 0, phaseStart: 0, phaseStartY: 0, smoothY: null };
      loop();
    } catch (e: any) {
      toast.error("Tidak bisa mengakses kamera: " + (e?.message ?? "izin ditolak"));
    }
  };

  const loop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const W = 96;
    const H = 72;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, W, H);
    const frame = ctx.getImageData(0, 0, W, H).data;

    if (prevFrame.current) {
      let sum = 0;
      let weightedY = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const d =
            Math.abs(frame[i] - prevFrame.current[i]) +
            Math.abs(frame[i + 1] - prevFrame.current[i + 1]) +
            Math.abs(frame[i + 2] - prevFrame.current[i + 2]);
          if (d > 60) {
            sum += d;
            weightedY += d * y;
          }
        }
      }
      const intensity = sum / (W * H * 255 * 3);
      setMotion(Math.min(1, intensity * 40));

      if (sum > 4000) {
        const cy = weightedY / sum; // 0..H, kecil = atas
        const s = stateRef.current;
        s.smoothY = s.smoothY === null ? cy : s.smoothY * 0.6 + cy * 0.4;
        detectRep(s.smoothY);
      }
    }
    prevFrame.current = new Uint8ClampedArray(frame);
    rafRef.current = requestAnimationFrame(loop);
  };

  const detectRep = (y: number) => {
    const s = stateRef.current;
    const now = performance.now();
    if (s.lastY === null) {
      s.lastY = y;
      s.phaseStart = now;
      s.phaseStartY = y;
      return;
    }
    const dy = y - s.lastY;
    const dir: -1 | 0 | 1 = dy < -0.6 ? -1 : dy > 0.6 ? 1 : 0; // -1 = naik (y mengecil)
    if (dir !== 0 && dir !== s.direction) {
      const duration = (now - s.phaseStart) / 1000;
      const travel = Math.abs(y - s.phaseStartY);
      // Fase yang baru saja selesai adalah fase konsentrik jika arahnya naik
      if (s.direction === -1 && duration > 0.15 && duration < 4 && travel > 4) {
        const velocity = romRef.current / 100 / duration;
        if (velocity > 0.05 && velocity < 4) onRep(Math.round(velocity * 100) / 100);
      }
      s.direction = dir;
      s.phaseStart = now;
      s.phaseStartY = y;
      setPhase(dir === -1 ? "naik" : "turun");
    }
    s.lastY = y;
  };

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative bg-black">
          <video ref={videoRef} playsInline muted className="w-full aspect-video object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Kamera belum aktif
            </div>
          )}
          {active && (
            <div className="absolute top-2 left-2 right-2 flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-background/80 font-medium">
                Fase: {phase === "naik" ? "Konsentrik ↑" : phase === "turun" ? "Eksentrik ↓" : "Diam"}
              </span>
              <div className="flex-1 h-2 rounded bg-background/40 overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${motion * 100}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button onClick={start} className="gap-2">
            <Camera className="h-4 w-4" /> Mulai Kamera
          </Button>
        ) : (
          <Button variant="secondary" onClick={stop} className="gap-2">
            <CameraOff className="h-4 w-4" /> Hentikan
          </Button>
        )}
        <Button variant="outline" onClick={onReset} className="gap-2" disabled={!reps.length}>
          <RotateCcw className="h-4 w-4" /> Reset Rep
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Letakkan HP menyamping ±2–3 m dari atlet, pastikan hanya atlet yang bergerak dalam frame.
        Isi ROM (jarak tempuh barbell) agar konversi kecepatan akurat.
      </p>
    </div>
  );
};
