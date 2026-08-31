// Velocity Based Training (VBT) helpers

export type VbtMethod = "camera" | "sensor" | "manual";

export const VBT_EXERCISES = [
  "Back Squat",
  "Front Squat",
  "Bench Press",
  "Deadlift",
  "Hip Thrust",
  "Overhead Press",
  "Power Clean",
  "Snatch",
  "Jump Squat",
  "Lainnya",
];

export type VelocityZone = {
  key: string;
  label: string;
  min: number;
  max: number;
  goal: string;
  color: string;
};

// Zona kecepatan (Mean Concentric Velocity, m/s)
export const VELOCITY_ZONES: VelocityZone[] = [
  { key: "starting", label: "Starting Strength", min: 1.3, max: 99, goal: "Kecepatan awal / reaktif", color: "hsl(190 90% 50%)" },
  { key: "speed_strength", label: "Speed-Strength", min: 1.0, max: 1.3, goal: "Power kecepatan tinggi", color: "hsl(150 70% 45%)" },
  { key: "strength_speed", label: "Strength-Speed", min: 0.75, max: 1.0, goal: "Power beban sedang", color: "hsl(45 90% 50%)" },
  { key: "accelerative", label: "Accelerative Strength", min: 0.5, max: 0.75, goal: "Kekuatan akselerasi", color: "hsl(25 90% 55%)" },
  { key: "absolute", label: "Absolute Strength", min: 0, max: 0.5, goal: "Kekuatan maksimal", color: "hsl(0 75% 55%)" },
];

export function getVelocityZone(v: number): VelocityZone {
  return VELOCITY_ZONES.find((z) => v >= z.min && v < z.max) ?? VELOCITY_ZONES[VELOCITY_ZONES.length - 1];
}

/** Estimasi %1RM dari mean concentric velocity (persamaan linier load-velocity). */
export function velocityToPercent1RM(v: number): number {
  const pct = 105.05 - 60.05 * v;
  return Math.min(100, Math.max(25, pct));
}

/** Estimasi 1RM dari beban (kg) dan mean concentric velocity. */
export function estimate1RM(loadKg: number, v: number): number | null {
  if (!loadKg || loadKg <= 0 || !v || v <= 0) return null;
  const pct = velocityToPercent1RM(v);
  return Math.round((loadKg / (pct / 100)) * 10) / 10;
}

/** Velocity loss (%) antara rep terbaik dan rep terakhir — indikator kelelahan. */
export function velocityLoss(reps: number[]): number | null {
  if (reps.length < 2) return null;
  const best = Math.max(...reps);
  const last = reps[reps.length - 1];
  if (best <= 0) return null;
  return Math.round(((best - last) / best) * 1000) / 10;
}

export function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function fatigueAdvice(loss: number | null): string {
  if (loss === null) return "Butuh minimal 2 repetisi untuk analisis kelelahan.";
  if (loss < 10) return "Kelelahan minimal — fokus kecepatan/power terjaga.";
  if (loss < 20) return "Zona optimal power. Set boleh dilanjutkan.";
  if (loss < 30) return "Zona hipertrofi/kekuatan. Perhatikan kualitas gerakan.";
  return "Velocity loss tinggi (>30%). Sebaiknya hentikan set untuk menjaga kualitas.";
}
