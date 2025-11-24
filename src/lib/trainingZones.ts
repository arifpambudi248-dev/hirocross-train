/**
 * Training Zones Calculation Library
 * Calculates HR zones and RPE conversion based on age
 */

export type TrainingZone = {
  name: string;
  rpe: number;
  hrMin: number;
  hrMax: number;
  percentage: string;
  description: string;
  color: string;
};

/**
 * Calculate maximum heart rate based on age
 * Formula: 220 - age
 */
export function calculateMaxHR(age: number): number {
  if (!age || age < 10 || age > 100) {
    throw new Error("Usia harus antara 10-100 tahun");
  }
  return 220 - age;
}

/**
 * Calculate training zones based on HR max
 * Converts HR zones to RPE scale (1-10)
 */
export function calculateTrainingZones(maxHR: number): TrainingZone[] {
  return [
    {
      name: "Recovery / Sangat Ringan",
      rpe: 1,
      hrMin: Math.round(maxHR * 0.50),
      hrMax: Math.round(maxHR * 0.55),
      percentage: "50-55%",
      description: "Pemulihan aktif, pemanasan",
      color: "bg-blue-500"
    },
    {
      name: "Ringan",
      rpe: 2,
      hrMin: Math.round(maxHR * 0.55),
      hrMax: Math.round(maxHR * 0.60),
      percentage: "55-60%",
      description: "Aerobik dasar, pembakaran lemak",
      color: "bg-cyan-500"
    },
    {
      name: "Sedang",
      rpe: 3,
      hrMin: Math.round(maxHR * 0.60),
      hrMax: Math.round(maxHR * 0.65),
      percentage: "60-65%",
      description: "Endurance building",
      color: "bg-green-500"
    },
    {
      name: "Sedang-Cukup Berat",
      rpe: 4,
      hrMin: Math.round(maxHR * 0.65),
      hrMax: Math.round(maxHR * 0.70),
      percentage: "65-70%",
      description: "Tempo sedang, sustainable",
      color: "bg-lime-500"
    },
    {
      name: "Cukup Berat",
      rpe: 5,
      hrMin: Math.round(maxHR * 0.70),
      hrMax: Math.round(maxHR * 0.75),
      percentage: "70-75%",
      description: "Threshold training",
      color: "bg-yellow-500"
    },
    {
      name: "Berat",
      rpe: 6,
      hrMin: Math.round(maxHR * 0.75),
      hrMax: Math.round(maxHR * 0.80),
      percentage: "75-80%",
      description: "Tempo training, lactate threshold",
      color: "bg-amber-500"
    },
    {
      name: "Sangat Berat",
      rpe: 7,
      hrMin: Math.round(maxHR * 0.80),
      hrMax: Math.round(maxHR * 0.85),
      percentage: "80-85%",
      description: "VO2 max training",
      color: "bg-orange-500"
    },
    {
      name: "Maksimal Sedang",
      rpe: 8,
      hrMin: Math.round(maxHR * 0.85),
      hrMax: Math.round(maxHR * 0.90),
      percentage: "85-90%",
      description: "High intensity intervals",
      color: "bg-red-500"
    },
    {
      name: "Maksimal Tinggi",
      rpe: 9,
      hrMin: Math.round(maxHR * 0.90),
      hrMax: Math.round(maxHR * 0.95),
      percentage: "90-95%",
      description: "Near maximum effort",
      color: "bg-red-600"
    },
    {
      name: "Maksimal Absolut",
      rpe: 10,
      hrMin: Math.round(maxHR * 0.95),
      hrMax: maxHR,
      percentage: "95-100%",
      description: "Maximum effort, sprint",
      color: "bg-red-700"
    }
  ];
}

/**
 * Get RPE from heart rate
 */
export function getRPEFromHR(hr: number, maxHR: number): number {
  const percentage = (hr / maxHR) * 100;
  
  if (percentage < 55) return 1;
  if (percentage < 60) return 2;
  if (percentage < 65) return 3;
  if (percentage < 70) return 4;
  if (percentage < 75) return 5;
  if (percentage < 80) return 6;
  if (percentage < 85) return 7;
  if (percentage < 90) return 8;
  if (percentage < 95) return 9;
  return 10;
}

/**
 * Get HR range for specific RPE
 */
export function getHRRangeForRPE(rpe: number, maxHR: number): { min: number; max: number } {
  const zones = calculateTrainingZones(maxHR);
  const zone = zones.find(z => z.rpe === rpe);
  
  if (!zone) {
    throw new Error("RPE tidak valid (harus 1-10)");
  }
  
  return {
    min: zone.hrMin,
    max: zone.hrMax
  };
}