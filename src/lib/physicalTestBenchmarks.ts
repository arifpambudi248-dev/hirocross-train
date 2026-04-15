// Physical Test Benchmarks with Age and Gender-based Norms
// Scale: 5 = Excellent, 4 = Good, 3 = Average, 2 = Below Average, 1 = Poor

export type Gender = 'male' | 'female';
export type AgeGroup = 'youth' | 'junior' | 'senior' | 'master';

export interface BenchmarkScale {
  scale5: number;
  scale4: number;
  scale3: number;
  scale2: number;
  scale1: number;
}

export interface TestBenchmark {
  testName: string;
  unit: string;
  inverse: boolean;
  description: string;
  norms: {
    male: Record<AgeGroup, BenchmarkScale>;
    female: Record<AgeGroup, BenchmarkScale>;
  };
}

export interface CategoryBenchmarks {
  [key: string]: TestBenchmark[];
}

// Helper to get age group from age
export function getAgeGroup(age: number): AgeGroup {
  if (age < 15) return 'youth';
  if (age < 20) return 'junior';
  if (age < 35) return 'senior';
  return 'master';
}

export function getAgeGroupLabel(ageGroup: AgeGroup): string {
  switch (ageGroup) {
    case 'youth': return '< 15 tahun';
    case 'junior': return '15-19 tahun';
    case 'senior': return '20-34 tahun';
    case 'master': return '≥ 35 tahun';
  }
}

// Comprehensive benchmark definitions with age and gender-based norms
export const BENCHMARKS: CategoryBenchmarks = {
  daya_tahan: [
    {
      testName: "VO2max",
      unit: "ml/kg/min",
      inverse: false,
      description: "Konsumsi oksigen maksimal",
      norms: {
        male: {
          youth: { scale5: 55, scale4: 48, scale3: 42, scale2: 36, scale1: 30 },
          junior: { scale5: 60, scale4: 52, scale3: 45, scale2: 38, scale1: 32 },
          senior: { scale5: 65, scale4: 55, scale3: 45, scale2: 40, scale1: 35 },
          master: { scale5: 55, scale4: 48, scale3: 40, scale2: 35, scale1: 30 },
        },
        female: {
          youth: { scale5: 48, scale4: 42, scale3: 36, scale2: 30, scale1: 25 },
          junior: { scale5: 52, scale4: 45, scale3: 38, scale2: 32, scale1: 27 },
          senior: { scale5: 55, scale4: 48, scale3: 40, scale2: 35, scale1: 30 },
          master: { scale5: 48, scale4: 42, scale3: 35, scale2: 30, scale1: 25 },
        },
      },
    },
    {
      testName: "Cooper Test (12 min)",
      unit: "m",
      inverse: false,
      description: "Jarak lari 12 menit",
      norms: {
        male: {
          youth: { scale5: 2700, scale4: 2400, scale3: 2100, scale2: 1900, scale1: 1700 },
          junior: { scale5: 3000, scale4: 2700, scale3: 2300, scale2: 2000, scale1: 1800 },
          senior: { scale5: 3200, scale4: 2800, scale3: 2400, scale2: 2200, scale1: 2000 },
          master: { scale5: 2800, scale4: 2500, scale3: 2200, scale2: 2000, scale1: 1800 },
        },
        female: {
          youth: { scale5: 2300, scale4: 2100, scale3: 1900, scale2: 1700, scale1: 1500 },
          junior: { scale5: 2500, scale4: 2200, scale3: 2000, scale2: 1800, scale1: 1600 },
          senior: { scale5: 2700, scale4: 2400, scale3: 2100, scale2: 1900, scale1: 1700 },
          master: { scale5: 2400, scale4: 2100, scale3: 1900, scale2: 1700, scale1: 1500 },
        },
      },
    },
    {
      testName: "Beep Test",
      unit: "level",
      inverse: false,
      description: "Multistage fitness test",
      norms: {
        male: {
          youth: { scale5: 11, scale4: 9, scale3: 7, scale2: 5, scale1: 4 },
          junior: { scale5: 13, scale4: 11, scale3: 9, scale2: 7, scale1: 5 },
          senior: { scale5: 15, scale4: 12, scale3: 10, scale2: 7, scale1: 5 },
          master: { scale5: 12, scale4: 10, scale3: 8, scale2: 6, scale1: 4 },
        },
        female: {
          youth: { scale5: 9, scale4: 7, scale3: 6, scale2: 4, scale1: 3 },
          junior: { scale5: 10, scale4: 8, scale3: 7, scale2: 5, scale1: 4 },
          senior: { scale5: 12, scale4: 10, scale3: 8, scale2: 6, scale1: 4 },
          master: { scale5: 10, scale4: 8, scale3: 6, scale2: 5, scale1: 3 },
        },
      },
    },
    {
      testName: "Yo-Yo Intermittent Recovery Test",
      unit: "m",
      inverse: false,
      description: "Tes daya tahan dengan interval recovery",
      norms: {
        male: {
          youth: { scale5: 1680, scale4: 1280, scale3: 920, scale2: 640, scale1: 440 },
          junior: { scale5: 2080, scale4: 1680, scale3: 1280, scale2: 920, scale1: 640 },
          senior: { scale5: 2400, scale4: 2000, scale3: 1600, scale2: 1200, scale1: 800 },
          master: { scale5: 1920, scale4: 1520, scale3: 1120, scale2: 800, scale1: 560 },
        },
        female: {
          youth: { scale5: 1120, scale4: 840, scale3: 640, scale2: 440, scale1: 320 },
          junior: { scale5: 1440, scale4: 1080, scale3: 800, scale2: 560, scale1: 400 },
          senior: { scale5: 1760, scale4: 1360, scale3: 1000, scale2: 720, scale1: 480 },
          master: { scale5: 1280, scale4: 960, scale3: 720, scale2: 520, scale1: 360 },
        },
      },
    },
    {
      testName: "1.5 Mile Run (2.4 km)",
      unit: "min",
      inverse: true,
      description: "Waktu lari 2.4 km",
      norms: {
        male: {
          youth: { scale5: 9.0, scale4: 10.0, scale3: 11.5, scale2: 13.0, scale1: 15.0 },
          junior: { scale5: 8.5, scale4: 9.5, scale3: 11.0, scale2: 12.5, scale1: 14.0 },
          senior: { scale5: 8.0, scale4: 9.0, scale3: 10.5, scale2: 12.0, scale1: 14.0 },
          master: { scale5: 9.5, scale4: 10.5, scale3: 12.0, scale2: 13.5, scale1: 15.5 },
        },
        female: {
          youth: { scale5: 11.0, scale4: 12.5, scale3: 14.0, scale2: 16.0, scale1: 18.0 },
          junior: { scale5: 10.5, scale4: 12.0, scale3: 13.5, scale2: 15.0, scale1: 17.0 },
          senior: { scale5: 10.0, scale4: 11.5, scale3: 13.0, scale2: 15.0, scale1: 17.0 },
          master: { scale5: 12.0, scale4: 13.5, scale3: 15.0, scale2: 17.0, scale1: 19.0 },
        },
      },
    },
    {
      testName: "VCr (Velocity at Cruise)",
      unit: "m/s",
      inverse: false,
      description: "Kecepatan lari aerobik (jarak/waktu)",
      norms: {
        male: {
          youth: { scale5: 4.0, scale4: 3.5, scale3: 3.0, scale2: 2.5, scale1: 2.0 },
          junior: { scale5: 4.5, scale4: 4.0, scale3: 3.5, scale2: 3.0, scale1: 2.5 },
          senior: { scale5: 5.0, scale4: 4.4, scale3: 3.8, scale2: 3.2, scale1: 2.6 },
          master: { scale5: 4.2, scale4: 3.7, scale3: 3.2, scale2: 2.7, scale1: 2.2 },
        },
        female: {
          youth: { scale5: 3.5, scale4: 3.0, scale3: 2.6, scale2: 2.2, scale1: 1.8 },
          junior: { scale5: 3.8, scale4: 3.3, scale3: 2.9, scale2: 2.5, scale1: 2.1 },
          senior: { scale5: 4.2, scale4: 3.7, scale3: 3.2, scale2: 2.7, scale1: 2.2 },
          master: { scale5: 3.6, scale4: 3.1, scale3: 2.7, scale2: 2.3, scale1: 1.9 },
        },
      },
    },
  ],
  kecepatan: [
    {
      testName: "Sprint 10m",
      unit: "s",
      inverse: true,
      description: "Waktu sprint 10 meter",
      norms: {
        male: {
          youth: { scale5: 1.75, scale4: 1.90, scale3: 2.05, scale2: 2.20, scale1: 2.40 },
          junior: { scale5: 1.65, scale4: 1.78, scale3: 1.92, scale2: 2.08, scale1: 2.25 },
          senior: { scale5: 1.60, scale4: 1.75, scale3: 1.90, scale2: 2.05, scale1: 2.20 },
          master: { scale5: 1.80, scale4: 1.95, scale3: 2.10, scale2: 2.30, scale1: 2.50 },
        },
        female: {
          youth: { scale5: 1.95, scale4: 2.10, scale3: 2.25, scale2: 2.45, scale1: 2.65 },
          junior: { scale5: 1.85, scale4: 2.00, scale3: 2.15, scale2: 2.30, scale1: 2.50 },
          senior: { scale5: 1.80, scale4: 1.95, scale3: 2.10, scale2: 2.25, scale1: 2.45 },
          master: { scale5: 2.00, scale4: 2.18, scale3: 2.35, scale2: 2.55, scale1: 2.80 },
        },
      },
    },
    {
      testName: "Sprint 20m",
      unit: "s",
      inverse: true,
      description: "Waktu sprint 20 meter",
      norms: {
        male: {
          youth: { scale5: 3.0, scale4: 3.2, scale3: 3.45, scale2: 3.70, scale1: 4.0 },
          junior: { scale5: 2.85, scale4: 3.05, scale3: 3.28, scale2: 3.52, scale1: 3.80 },
          senior: { scale5: 2.80, scale4: 3.00, scale3: 3.25, scale2: 3.50, scale1: 3.80 },
          master: { scale5: 3.10, scale4: 3.35, scale3: 3.60, scale2: 3.90, scale1: 4.25 },
        },
        female: {
          youth: { scale5: 3.35, scale4: 3.55, scale3: 3.80, scale2: 4.05, scale1: 4.35 },
          junior: { scale5: 3.20, scale4: 3.40, scale3: 3.62, scale2: 3.88, scale1: 4.18 },
          senior: { scale5: 3.15, scale4: 3.35, scale3: 3.55, scale2: 3.80, scale1: 4.10 },
          master: { scale5: 3.50, scale4: 3.75, scale3: 4.00, scale2: 4.30, scale1: 4.65 },
        },
      },
    },
    {
      testName: "Sprint 40m",
      unit: "s",
      inverse: true,
      description: "Waktu sprint 40 meter",
      norms: {
        male: {
          youth: { scale5: 5.2, scale4: 5.5, scale3: 5.9, scale2: 6.4, scale1: 7.0 },
          junior: { scale5: 4.95, scale4: 5.25, scale3: 5.60, scale2: 6.00, scale1: 6.50 },
          senior: { scale5: 4.90, scale4: 5.20, scale3: 5.60, scale2: 6.00, scale1: 6.50 },
          master: { scale5: 5.40, scale4: 5.80, scale3: 6.25, scale2: 6.80, scale1: 7.40 },
        },
        female: {
          youth: { scale5: 5.80, scale4: 6.15, scale3: 6.55, scale2: 7.00, scale1: 7.55 },
          junior: { scale5: 5.55, scale4: 5.90, scale3: 6.30, scale2: 6.75, scale1: 7.30 },
          senior: { scale5: 5.50, scale4: 5.85, scale3: 6.25, scale2: 6.70, scale1: 7.20 },
          master: { scale5: 6.10, scale4: 6.55, scale3: 7.05, scale2: 7.60, scale1: 8.25 },
        },
      },
    },
    {
      testName: "Sprint 60m",
      unit: "s",
      inverse: true,
      description: "Waktu sprint 60 meter",
      norms: {
        male: {
          youth: { scale5: 8.0, scale4: 8.5, scale3: 9.2, scale2: 10.0, scale1: 11.0 },
          junior: { scale5: 7.5, scale4: 8.0, scale3: 8.6, scale2: 9.3, scale1: 10.2 },
          senior: { scale5: 7.2, scale4: 7.7, scale3: 8.3, scale2: 9.0, scale1: 10.0 },
          master: { scale5: 8.2, scale4: 8.8, scale3: 9.5, scale2: 10.4, scale1: 11.5 },
        },
        female: {
          youth: { scale5: 9.0, scale4: 9.6, scale3: 10.4, scale2: 11.3, scale1: 12.4 },
          junior: { scale5: 8.5, scale4: 9.1, scale3: 9.8, scale2: 10.6, scale1: 11.6 },
          senior: { scale5: 8.2, scale4: 8.8, scale3: 9.5, scale2: 10.3, scale1: 11.3 },
          master: { scale5: 9.3, scale4: 10.0, scale3: 10.8, scale2: 11.8, scale1: 13.0 },
        },
      },
    },
    {
      testName: "Flying 30m",
      unit: "s",
      inverse: true,
      description: "Waktu sprint terbang 30 meter",
      norms: {
        male: {
          youth: { scale5: 3.6, scale4: 3.85, scale3: 4.15, scale2: 4.50, scale1: 4.90 },
          junior: { scale5: 3.4, scale4: 3.65, scale3: 3.95, scale2: 4.28, scale1: 4.65 },
          senior: { scale5: 3.3, scale4: 3.55, scale3: 3.85, scale2: 4.18, scale1: 4.55 },
          master: { scale5: 3.8, scale4: 4.10, scale3: 4.45, scale2: 4.85, scale1: 5.30 },
        },
        female: {
          youth: { scale5: 4.1, scale4: 4.40, scale3: 4.75, scale2: 5.15, scale1: 5.60 },
          junior: { scale5: 3.9, scale4: 4.20, scale3: 4.52, scale2: 4.90, scale1: 5.35 },
          senior: { scale5: 3.8, scale4: 4.10, scale3: 4.42, scale2: 4.80, scale1: 5.25 },
          master: { scale5: 4.3, scale4: 4.65, scale3: 5.05, scale2: 5.50, scale1: 6.00 },
        },
      },
    },
  ],
  kekuatan: [
    {
      testName: "Leg Dynamometer",
      unit: "kg",
      inverse: false,
      description: "Kekuatan otot tungkai dengan dynamometer",
      norms: {
        male: {
          youth: { scale5: 180, scale4: 150, scale3: 120, scale2: 90, scale1: 60 },
          junior: { scale5: 220, scale4: 185, scale3: 150, scale2: 115, scale1: 80 },
          senior: { scale5: 260, scale4: 220, scale3: 180, scale2: 140, scale1: 100 },
          master: { scale5: 220, scale4: 185, scale3: 150, scale2: 115, scale1: 80 },
        },
        female: {
          youth: { scale5: 120, scale4: 100, scale3: 80, scale2: 60, scale1: 40 },
          junior: { scale5: 150, scale4: 125, scale3: 100, scale2: 75, scale1: 50 },
          senior: { scale5: 180, scale4: 150, scale3: 120, scale2: 90, scale1: 60 },
          master: { scale5: 150, scale4: 125, scale3: 100, scale2: 75, scale1: 50 },
        },
      },
    },
    {
      testName: "Back Squat 1RM",
      unit: "x BW",
      inverse: false,
      description: "1 Rep Max relatif terhadap berat badan",
      norms: {
        male: {
          youth: { scale5: 1.5, scale4: 1.25, scale3: 1.0, scale2: 0.8, scale1: 0.6 },
          junior: { scale5: 2.0, scale4: 1.7, scale3: 1.4, scale2: 1.1, scale1: 0.9 },
          senior: { scale5: 2.5, scale4: 2.0, scale3: 1.5, scale2: 1.2, scale1: 1.0 },
          master: { scale5: 2.0, scale4: 1.6, scale3: 1.3, scale2: 1.0, scale1: 0.8 },
        },
        female: {
          youth: { scale5: 1.2, scale4: 1.0, scale3: 0.8, scale2: 0.65, scale1: 0.5 },
          junior: { scale5: 1.6, scale4: 1.35, scale3: 1.1, scale2: 0.9, scale1: 0.7 },
          senior: { scale5: 2.0, scale4: 1.6, scale3: 1.2, scale2: 1.0, scale1: 0.8 },
          master: { scale5: 1.5, scale4: 1.2, scale3: 1.0, scale2: 0.8, scale1: 0.6 },
        },
      },
    },
    {
      testName: "Bench Press 1RM",
      unit: "x BW",
      inverse: false,
      description: "1 Rep Max relatif terhadap berat badan",
      norms: {
        male: {
          youth: { scale5: 1.0, scale4: 0.85, scale3: 0.7, scale2: 0.55, scale1: 0.4 },
          junior: { scale5: 1.35, scale4: 1.15, scale3: 0.95, scale2: 0.75, scale1: 0.6 },
          senior: { scale5: 1.8, scale4: 1.5, scale3: 1.2, scale2: 1.0, scale1: 0.8 },
          master: { scale5: 1.4, scale4: 1.2, scale3: 1.0, scale2: 0.8, scale1: 0.65 },
        },
        female: {
          youth: { scale5: 0.6, scale4: 0.5, scale3: 0.4, scale2: 0.32, scale1: 0.25 },
          junior: { scale5: 0.85, scale4: 0.7, scale3: 0.55, scale2: 0.45, scale1: 0.35 },
          senior: { scale5: 1.1, scale4: 0.9, scale3: 0.7, scale2: 0.55, scale1: 0.45 },
          master: { scale5: 0.85, scale4: 0.7, scale3: 0.55, scale2: 0.45, scale1: 0.35 },
        },
      },
    },
    {
      testName: "Deadlift 1RM",
      unit: "x BW",
      inverse: false,
      description: "1 Rep Max relatif terhadap berat badan",
      norms: {
        male: {
          youth: { scale5: 1.75, scale4: 1.45, scale3: 1.2, scale2: 0.95, scale1: 0.75 },
          junior: { scale5: 2.35, scale4: 2.0, scale3: 1.65, scale2: 1.35, scale1: 1.1 },
          senior: { scale5: 3.0, scale4: 2.5, scale3: 2.0, scale2: 1.5, scale1: 1.2 },
          master: { scale5: 2.4, scale4: 2.0, scale3: 1.6, scale2: 1.3, scale1: 1.0 },
        },
        female: {
          youth: { scale5: 1.35, scale4: 1.1, scale3: 0.9, scale2: 0.7, scale1: 0.55 },
          junior: { scale5: 1.85, scale4: 1.55, scale3: 1.25, scale2: 1.0, scale1: 0.8 },
          senior: { scale5: 2.4, scale4: 2.0, scale3: 1.6, scale2: 1.3, scale1: 1.0 },
          master: { scale5: 1.85, scale4: 1.55, scale3: 1.25, scale2: 1.0, scale1: 0.8 },
        },
      },
    },
    {
      testName: "Pull Up Max",
      unit: "reps",
      inverse: false,
      description: "Jumlah maksimal pull up",
      norms: {
        male: {
          youth: { scale5: 12, scale4: 9, scale3: 6, scale2: 3, scale1: 1 },
          junior: { scale5: 18, scale4: 14, scale3: 10, scale2: 6, scale1: 3 },
          senior: { scale5: 20, scale4: 15, scale3: 10, scale2: 7, scale1: 5 },
          master: { scale5: 15, scale4: 11, scale3: 7, scale2: 4, scale1: 2 },
        },
        female: {
          youth: { scale5: 5, scale4: 3, scale3: 2, scale2: 1, scale1: 0 },
          junior: { scale5: 8, scale4: 5, scale3: 3, scale2: 2, scale1: 1 },
          senior: { scale5: 10, scale4: 7, scale3: 4, scale2: 2, scale1: 1 },
          master: { scale5: 7, scale4: 4, scale3: 2, scale2: 1, scale1: 0 },
        },
      },
    },
    {
      testName: "Push Up Max (1 min)",
      unit: "reps",
      inverse: false,
      description: "Jumlah push up dalam 1 menit",
      norms: {
        male: {
          youth: { scale5: 40, scale4: 32, scale3: 24, scale2: 16, scale1: 10 },
          junior: { scale5: 55, scale4: 45, scale3: 35, scale2: 25, scale1: 15 },
          senior: { scale5: 60, scale4: 50, scale3: 40, scale2: 30, scale1: 20 },
          master: { scale5: 45, scale4: 36, scale3: 27, scale2: 18, scale1: 12 },
        },
        female: {
          youth: { scale5: 25, scale4: 20, scale3: 15, scale2: 10, scale1: 5 },
          junior: { scale5: 35, scale4: 28, scale3: 21, scale2: 14, scale1: 8 },
          senior: { scale5: 40, scale4: 32, scale3: 24, scale2: 16, scale1: 10 },
          master: { scale5: 30, scale4: 24, scale3: 18, scale2: 12, scale1: 7 },
        },
      },
    },
    {
      testName: "Sit Up Max (1 min)",
      unit: "reps",
      inverse: false,
      description: "Jumlah sit up dalam 1 menit",
      norms: {
        male: {
          youth: { scale5: 45, scale4: 38, scale3: 30, scale2: 22, scale1: 15 },
          junior: { scale5: 55, scale4: 47, scale3: 38, scale2: 28, scale1: 20 },
          senior: { scale5: 60, scale4: 50, scale3: 40, scale2: 30, scale1: 22 },
          master: { scale5: 48, scale4: 40, scale3: 32, scale2: 24, scale1: 17 },
        },
        female: {
          youth: { scale5: 40, scale4: 33, scale3: 26, scale2: 19, scale1: 12 },
          junior: { scale5: 48, scale4: 40, scale3: 32, scale2: 23, scale1: 15 },
          senior: { scale5: 52, scale4: 43, scale3: 34, scale2: 25, scale1: 17 },
          master: { scale5: 42, scale4: 35, scale3: 27, scale2: 20, scale1: 13 },
        },
      },
    },
    {
      testName: "Overhead Press 1RM",
      unit: "x BW",
      inverse: false,
      description: "1 Rep Max relatif terhadap berat badan",
      norms: {
        male: {
          youth: { scale5: 0.65, scale4: 0.55, scale3: 0.45, scale2: 0.35, scale1: 0.25 },
          junior: { scale5: 0.9, scale4: 0.75, scale3: 0.6, scale2: 0.48, scale1: 0.38 },
          senior: { scale5: 1.2, scale4: 1.0, scale3: 0.8, scale2: 0.65, scale1: 0.5 },
          master: { scale5: 0.95, scale4: 0.8, scale3: 0.65, scale2: 0.52, scale1: 0.4 },
        },
        female: {
          youth: { scale5: 0.45, scale4: 0.37, scale3: 0.3, scale2: 0.23, scale1: 0.17 },
          junior: { scale5: 0.6, scale4: 0.5, scale3: 0.4, scale2: 0.32, scale1: 0.25 },
          senior: { scale5: 0.8, scale4: 0.65, scale3: 0.5, scale2: 0.4, scale1: 0.32 },
          master: { scale5: 0.62, scale4: 0.52, scale3: 0.42, scale2: 0.33, scale1: 0.26 },
        },
      },
    },
    {
      testName: "Grip Strength",
      unit: "kg",
      inverse: false,
      description: "Kekuatan genggaman tangan",
      norms: {
        male: {
          youth: { scale5: 40, scale4: 34, scale3: 28, scale2: 22, scale1: 16 },
          junior: { scale5: 52, scale4: 45, scale3: 38, scale2: 30, scale1: 23 },
          senior: { scale5: 60, scale4: 52, scale3: 44, scale2: 36, scale1: 28 },
          master: { scale5: 52, scale4: 45, scale3: 38, scale2: 30, scale1: 23 },
        },
        female: {
          youth: { scale5: 28, scale4: 24, scale3: 20, scale2: 16, scale1: 12 },
          junior: { scale5: 35, scale4: 30, scale3: 25, scale2: 20, scale1: 15 },
          senior: { scale5: 40, scale4: 34, scale3: 28, scale2: 22, scale1: 17 },
          master: { scale5: 35, scale4: 30, scale3: 25, scale2: 20, scale1: 15 },
        },
      },
    },
    {
      testName: "Back Extension Hold",
      unit: "s",
      inverse: false,
      description: "Waktu tahan posisi back extension",
      norms: {
        male: {
          youth: { scale5: 90, scale4: 70, scale3: 50, scale2: 35, scale1: 20 },
          junior: { scale5: 120, scale4: 95, scale3: 70, scale2: 48, scale1: 28 },
          senior: { scale5: 150, scale4: 120, scale3: 90, scale2: 60, scale1: 35 },
          master: { scale5: 120, scale4: 95, scale3: 70, scale2: 48, scale1: 28 },
        },
        female: {
          youth: { scale5: 80, scale4: 62, scale3: 45, scale2: 30, scale1: 18 },
          junior: { scale5: 105, scale4: 82, scale3: 60, scale2: 40, scale1: 24 },
          senior: { scale5: 130, scale4: 105, scale3: 80, scale2: 55, scale1: 32 },
          master: { scale5: 105, scale4: 82, scale3: 60, scale2: 40, scale1: 24 },
        },
      },
    },
    {
      testName: "Plank Hold",
      unit: "s",
      inverse: false,
      description: "Waktu tahan posisi plank",
      norms: {
        male: {
          youth: { scale5: 90, scale4: 70, scale3: 50, scale2: 35, scale1: 20 },
          junior: { scale5: 120, scale4: 95, scale3: 70, scale2: 48, scale1: 28 },
          senior: { scale5: 150, scale4: 120, scale3: 90, scale2: 60, scale1: 35 },
          master: { scale5: 120, scale4: 95, scale3: 70, scale2: 48, scale1: 28 },
        },
        female: {
          youth: { scale5: 80, scale4: 62, scale3: 45, scale2: 30, scale1: 18 },
          junior: { scale5: 105, scale4: 82, scale3: 60, scale2: 40, scale1: 24 },
          senior: { scale5: 130, scale4: 105, scale3: 80, scale2: 55, scale1: 32 },
          master: { scale5: 105, scale4: 82, scale3: 60, scale2: 40, scale1: 24 },
        },
      },
    },
    {
      testName: "Leg Dynamometer",
      unit: "kg",
      inverse: false,
      description: "Kekuatan otot tungkai menggunakan dynamometer",
      norms: {
        male: {
          youth: { scale5: 120, scale4: 100, scale3: 80, scale2: 65, scale1: 50 },
          junior: { scale5: 180, scale4: 150, scale3: 120, scale2: 95, scale1: 70 },
          senior: { scale5: 250, scale4: 210, scale3: 170, scale2: 130, scale1: 100 },
          master: { scale5: 200, scale4: 165, scale3: 130, scale2: 100, scale1: 75 },
        },
        female: {
          youth: { scale5: 80, scale4: 65, scale3: 50, scale2: 40, scale1: 30 },
          junior: { scale5: 120, scale4: 100, scale3: 80, scale2: 60, scale1: 45 },
          senior: { scale5: 160, scale4: 135, scale3: 110, scale2: 85, scale1: 65 },
          master: { scale5: 130, scale4: 105, scale3: 85, scale2: 65, scale1: 50 },
        },
      },
    },
  ],
  kelincahan: [
    {
      testName: "T-Test",
      unit: "s",
      inverse: true,
      description: "Tes kelincahan bentuk T",
      norms: {
        male: {
          youth: { scale5: 9.5, scale4: 10.3, scale3: 11.2, scale2: 12.2, scale1: 13.5 },
          junior: { scale5: 9.0, scale4: 9.8, scale3: 10.7, scale2: 11.7, scale1: 12.8 },
          senior: { scale5: 8.5, scale4: 9.5, scale3: 10.5, scale2: 11.5, scale1: 12.5 },
          master: { scale5: 9.8, scale4: 10.8, scale3: 11.8, scale2: 12.9, scale1: 14.2 },
        },
        female: {
          youth: { scale5: 10.8, scale4: 11.7, scale3: 12.7, scale2: 13.9, scale1: 15.2 },
          junior: { scale5: 10.3, scale4: 11.2, scale3: 12.2, scale2: 13.3, scale1: 14.6 },
          senior: { scale5: 10.0, scale4: 11.0, scale3: 12.0, scale2: 13.0, scale1: 14.5 },
          master: { scale5: 11.2, scale4: 12.2, scale3: 13.4, scale2: 14.6, scale1: 16.0 },
        },
      },
    },
    {
      testName: "Illinois Agility Test",
      unit: "s",
      inverse: true,
      description: "Tes kelincahan Illinois",
      norms: {
        male: {
          youth: { scale5: 15.8, scale4: 17.0, scale3: 18.3, scale2: 19.8, scale1: 21.5 },
          junior: { scale5: 15.0, scale4: 16.2, scale3: 17.5, scale2: 18.9, scale1: 20.5 },
          senior: { scale5: 14.0, scale4: 15.5, scale3: 17.0, scale2: 18.5, scale1: 20.0 },
          master: { scale5: 16.2, scale4: 17.6, scale3: 19.0, scale2: 20.6, scale1: 22.4 },
        },
        female: {
          youth: { scale5: 18.0, scale4: 19.4, scale3: 20.9, scale2: 22.6, scale1: 24.5 },
          junior: { scale5: 17.2, scale4: 18.5, scale3: 20.0, scale2: 21.6, scale1: 23.5 },
          senior: { scale5: 16.5, scale4: 18.0, scale3: 19.5, scale2: 21.0, scale1: 23.0 },
          master: { scale5: 18.7, scale4: 20.2, scale3: 21.9, scale2: 23.7, scale1: 25.7 },
        },
      },
    },
    {
      testName: "505 Agility Test",
      unit: "s",
      inverse: true,
      description: "Tes kelincahan 5-0-5",
      norms: {
        male: {
          youth: { scale5: 2.25, scale4: 2.40, scale3: 2.55, scale2: 2.72, scale1: 2.92 },
          junior: { scale5: 2.12, scale4: 2.28, scale3: 2.45, scale2: 2.62, scale1: 2.82 },
          senior: { scale5: 2.00, scale4: 2.20, scale3: 2.40, scale2: 2.60, scale1: 2.80 },
          master: { scale5: 2.32, scale4: 2.52, scale3: 2.72, scale2: 2.95, scale1: 3.20 },
        },
        female: {
          youth: { scale5: 2.52, scale4: 2.70, scale3: 2.90, scale2: 3.10, scale1: 3.35 },
          junior: { scale5: 2.38, scale4: 2.58, scale3: 2.78, scale2: 2.98, scale1: 3.22 },
          senior: { scale5: 2.30, scale4: 2.50, scale3: 2.70, scale2: 2.90, scale1: 3.15 },
          master: { scale5: 2.62, scale4: 2.85, scale3: 3.08, scale2: 3.32, scale1: 3.60 },
        },
      },
    },
    {
      testName: "Hexagon Test",
      unit: "s",
      inverse: true,
      description: "Tes kelincahan hexagon",
      norms: {
        male: {
          youth: { scale5: 11.5, scale4: 12.6, scale3: 13.8, scale2: 15.1, scale1: 16.6 },
          junior: { scale5: 10.8, scale4: 11.9, scale3: 13.1, scale2: 14.3, scale1: 15.7 },
          senior: { scale5: 10.0, scale4: 11.5, scale3: 13.0, scale2: 14.5, scale1: 16.0 },
          master: { scale5: 12.0, scale4: 13.3, scale3: 14.6, scale2: 16.1, scale1: 17.8 },
        },
        female: {
          youth: { scale5: 13.2, scale4: 14.5, scale3: 15.9, scale2: 17.4, scale1: 19.1 },
          junior: { scale5: 12.5, scale4: 13.7, scale3: 15.0, scale2: 16.5, scale1: 18.1 },
          senior: { scale5: 12.0, scale4: 13.5, scale3: 15.0, scale2: 16.5, scale1: 18.5 },
          master: { scale5: 14.0, scale4: 15.4, scale3: 16.9, scale2: 18.6, scale1: 20.5 },
        },
      },
    },
    {
      testName: "Pro Agility (5-10-5)",
      unit: "s",
      inverse: true,
      description: "Tes kelincahan shuttle 5-10-5 yard",
      norms: {
        male: {
          youth: { scale5: 4.8, scale4: 5.1, scale3: 5.5, scale2: 5.9, scale1: 6.4 },
          junior: { scale5: 4.5, scale4: 4.8, scale3: 5.2, scale2: 5.6, scale1: 6.1 },
          senior: { scale5: 4.2, scale4: 4.5, scale3: 4.9, scale2: 5.3, scale1: 5.8 },
          master: { scale5: 5.0, scale4: 5.4, scale3: 5.9, scale2: 6.4, scale1: 7.0 },
        },
        female: {
          youth: { scale5: 5.4, scale4: 5.8, scale3: 6.2, scale2: 6.7, scale1: 7.3 },
          junior: { scale5: 5.1, scale4: 5.5, scale3: 5.9, scale2: 6.4, scale1: 6.9 },
          senior: { scale5: 4.8, scale4: 5.2, scale3: 5.6, scale2: 6.1, scale1: 6.7 },
          master: { scale5: 5.7, scale4: 6.2, scale3: 6.7, scale2: 7.3, scale1: 8.0 },
        },
      },
    },
  ],
  fleksibilitas: [
    {
      testName: "Sit and Reach",
      unit: "cm",
      inverse: false,
      description: "Fleksibilitas hamstring",
      norms: {
        male: {
          youth: { scale5: 22, scale4: 17, scale3: 12, scale2: 6, scale1: 0 },
          junior: { scale5: 25, scale4: 20, scale3: 14, scale2: 8, scale1: 2 },
          senior: { scale5: 25, scale4: 20, scale3: 15, scale2: 10, scale1: 5 },
          master: { scale5: 22, scale4: 17, scale3: 12, scale2: 6, scale1: 0 },
        },
        female: {
          youth: { scale5: 27, scale4: 22, scale3: 17, scale2: 11, scale1: 5 },
          junior: { scale5: 30, scale4: 25, scale3: 19, scale2: 13, scale1: 7 },
          senior: { scale5: 30, scale4: 25, scale3: 20, scale2: 15, scale1: 10 },
          master: { scale5: 27, scale4: 22, scale3: 17, scale2: 11, scale1: 5 },
        },
      },
    },
    {
      testName: "Shoulder Flexibility (Scratch Test)",
      unit: "cm",
      inverse: true,
      description: "Jarak antara tangan di belakang (negatif = lebih baik)",
      norms: {
        male: {
          youth: { scale5: -2, scale4: 2, scale3: 7, scale2: 12, scale1: 18 },
          junior: { scale5: -4, scale4: 1, scale3: 6, scale2: 11, scale1: 17 },
          senior: { scale5: -5, scale4: 0, scale3: 5, scale2: 10, scale1: 15 },
          master: { scale5: 0, scale4: 5, scale3: 10, scale2: 16, scale1: 23 },
        },
        female: {
          youth: { scale5: -5, scale4: 0, scale3: 5, scale2: 10, scale1: 16 },
          junior: { scale5: -7, scale4: -2, scale3: 3, scale2: 8, scale1: 14 },
          senior: { scale5: -8, scale4: -3, scale3: 2, scale2: 7, scale1: 13 },
          master: { scale5: -3, scale4: 2, scale3: 8, scale2: 14, scale1: 21 },
        },
      },
    },
    {
      testName: "Hip Flexion ROM",
      unit: "deg",
      inverse: false,
      description: "Range of motion pinggul",
      norms: {
        male: {
          youth: { scale5: 125, scale4: 115, scale3: 105, scale2: 95, scale1: 85 },
          junior: { scale5: 128, scale4: 118, scale3: 108, scale2: 98, scale1: 88 },
          senior: { scale5: 130, scale4: 120, scale3: 110, scale2: 100, scale1: 90 },
          master: { scale5: 120, scale4: 110, scale3: 100, scale2: 90, scale1: 80 },
        },
        female: {
          youth: { scale5: 135, scale4: 125, scale3: 115, scale2: 105, scale1: 95 },
          junior: { scale5: 138, scale4: 128, scale3: 118, scale2: 108, scale1: 98 },
          senior: { scale5: 140, scale4: 130, scale3: 120, scale2: 110, scale1: 100 },
          master: { scale5: 130, scale4: 120, scale3: 110, scale2: 100, scale1: 90 },
        },
      },
    },
    {
      testName: "Trunk Rotation",
      unit: "deg",
      inverse: false,
      description: "Rotasi batang tubuh",
      norms: {
        male: {
          youth: { scale5: 55, scale4: 48, scale3: 42, scale2: 35, scale1: 28 },
          junior: { scale5: 58, scale4: 51, scale3: 44, scale2: 37, scale1: 30 },
          senior: { scale5: 60, scale4: 53, scale3: 45, scale2: 38, scale1: 30 },
          master: { scale5: 52, scale4: 45, scale3: 38, scale2: 31, scale1: 24 },
        },
        female: {
          youth: { scale5: 60, scale4: 53, scale3: 46, scale2: 39, scale1: 32 },
          junior: { scale5: 63, scale4: 56, scale3: 49, scale2: 42, scale1: 35 },
          senior: { scale5: 65, scale4: 58, scale3: 50, scale2: 43, scale1: 35 },
          master: { scale5: 57, scale4: 50, scale3: 43, scale2: 36, scale1: 29 },
        },
      },
    },
    {
      testName: "Ankle Dorsiflexion",
      unit: "deg",
      inverse: false,
      description: "Dorsifleksi pergelangan kaki",
      norms: {
        male: {
          youth: { scale5: 38, scale4: 33, scale3: 28, scale2: 23, scale1: 18 },
          junior: { scale5: 40, scale4: 35, scale3: 30, scale2: 25, scale1: 20 },
          senior: { scale5: 40, scale4: 35, scale3: 30, scale2: 25, scale1: 20 },
          master: { scale5: 35, scale4: 30, scale3: 25, scale2: 20, scale1: 15 },
        },
        female: {
          youth: { scale5: 42, scale4: 37, scale3: 32, scale2: 27, scale1: 22 },
          junior: { scale5: 44, scale4: 39, scale3: 34, scale2: 29, scale1: 24 },
          senior: { scale5: 45, scale4: 40, scale3: 35, scale2: 30, scale1: 25 },
          master: { scale5: 40, scale4: 35, scale3: 30, scale2: 25, scale1: 20 },
        },
      },
    },
  ],
  power: [
    {
      testName: "CMJ (Counter Movement Jump)",
      unit: "cm",
      inverse: false,
      description: "Lompat vertikal dengan ayunan",
      norms: {
        male: {
          youth: { scale5: 45, scale4: 38, scale3: 32, scale2: 25, scale1: 18 },
          junior: { scale5: 55, scale4: 47, scale3: 39, scale2: 31, scale1: 22 },
          senior: { scale5: 65, scale4: 55, scale3: 45, scale2: 35, scale1: 25 },
          master: { scale5: 50, scale4: 42, scale3: 34, scale2: 26, scale1: 18 },
        },
        female: {
          youth: { scale5: 35, scale4: 30, scale3: 25, scale2: 20, scale1: 14 },
          junior: { scale5: 42, scale4: 36, scale3: 30, scale2: 24, scale1: 17 },
          senior: { scale5: 50, scale4: 42, scale3: 34, scale2: 26, scale1: 18 },
          master: { scale5: 38, scale4: 32, scale3: 26, scale2: 20, scale1: 14 },
        },
      },
    },
    {
      testName: "Squat Jump",
      unit: "cm",
      inverse: false,
      description: "Lompat vertikal dari posisi squat",
      norms: {
        male: {
          youth: { scale5: 40, scale4: 34, scale3: 28, scale2: 22, scale1: 16 },
          junior: { scale5: 50, scale4: 42, scale3: 35, scale2: 28, scale1: 20 },
          senior: { scale5: 60, scale4: 50, scale3: 40, scale2: 32, scale1: 22 },
          master: { scale5: 45, scale4: 38, scale3: 31, scale2: 24, scale1: 17 },
        },
        female: {
          youth: { scale5: 30, scale4: 25, scale3: 21, scale2: 16, scale1: 11 },
          junior: { scale5: 38, scale4: 32, scale3: 26, scale2: 20, scale1: 14 },
          senior: { scale5: 45, scale4: 38, scale3: 31, scale2: 24, scale1: 16 },
          master: { scale5: 34, scale4: 28, scale3: 23, scale2: 18, scale1: 12 },
        },
      },
    },
    {
      testName: "Standing Broad Jump",
      unit: "cm",
      inverse: false,
      description: "Lompat jauh dari posisi berdiri",
      norms: {
        male: {
          youth: { scale5: 230, scale4: 205, scale3: 180, scale2: 155, scale1: 130 },
          junior: { scale5: 270, scale4: 240, scale3: 210, scale2: 180, scale1: 150 },
          senior: { scale5: 310, scale4: 270, scale3: 230, scale2: 200, scale1: 170 },
          master: { scale5: 250, scale4: 220, scale3: 190, scale2: 160, scale1: 130 },
        },
        female: {
          youth: { scale5: 190, scale4: 170, scale3: 150, scale2: 130, scale1: 110 },
          junior: { scale5: 220, scale4: 195, scale3: 170, scale2: 145, scale1: 120 },
          senior: { scale5: 250, scale4: 220, scale3: 190, scale2: 165, scale1: 140 },
          master: { scale5: 205, scale4: 180, scale3: 155, scale2: 130, scale1: 105 },
        },
      },
    },
    {
      testName: "Medicine Ball Throw",
      unit: "m",
      inverse: false,
      description: "Lempar medicine ball overhead (3kg)",
      norms: {
        male: {
          youth: { scale5: 10, scale4: 8.5, scale3: 7, scale2: 5.5, scale1: 4 },
          junior: { scale5: 12, scale4: 10.2, scale3: 8.5, scale2: 6.8, scale1: 5 },
          senior: { scale5: 14, scale4: 12, scale3: 10, scale2: 8, scale1: 6 },
          master: { scale5: 11, scale4: 9.2, scale3: 7.5, scale2: 5.8, scale1: 4.2 },
        },
        female: {
          youth: { scale5: 7, scale4: 6, scale3: 5, scale2: 4, scale1: 3 },
          junior: { scale5: 8.5, scale4: 7.2, scale3: 6, scale2: 4.8, scale1: 3.5 },
          senior: { scale5: 10, scale4: 8.5, scale3: 7, scale2: 5.5, scale1: 4 },
          master: { scale5: 7.5, scale4: 6.3, scale3: 5.2, scale2: 4, scale1: 2.8 },
        },
      },
    },
    {
      testName: "Drop Jump (RSI)",
      unit: "index",
      inverse: false,
      description: "Reactive Strength Index dari drop jump",
      norms: {
        male: {
          youth: { scale5: 1.8, scale4: 1.5, scale3: 1.2, scale2: 0.95, scale1: 0.7 },
          junior: { scale5: 2.2, scale4: 1.85, scale3: 1.5, scale2: 1.18, scale1: 0.88 },
          senior: { scale5: 2.6, scale4: 2.2, scale3: 1.8, scale2: 1.4, scale1: 1.0 },
          master: { scale5: 2.0, scale4: 1.65, scale3: 1.32, scale2: 1.0, scale1: 0.72 },
        },
        female: {
          youth: { scale5: 1.4, scale4: 1.15, scale3: 0.92, scale2: 0.7, scale1: 0.5 },
          junior: { scale5: 1.7, scale4: 1.42, scale3: 1.15, scale2: 0.88, scale1: 0.62 },
          senior: { scale5: 2.0, scale4: 1.7, scale3: 1.4, scale2: 1.1, scale1: 0.8 },
          master: { scale5: 1.55, scale4: 1.28, scale3: 1.02, scale2: 0.78, scale1: 0.55 },
        },
      },
    },
  ],
  koordinasi: [
    {
      testName: "Ball Wall Toss (30s)",
      unit: "catches",
      inverse: false,
      description: "Jumlah tangkapan bola dalam 30 detik",
      norms: {
        male: {
          youth: { scale5: 32, scale4: 27, scale3: 22, scale2: 17, scale1: 12 },
          junior: { scale5: 38, scale4: 32, scale3: 26, scale2: 20, scale1: 14 },
          senior: { scale5: 42, scale4: 36, scale3: 30, scale2: 24, scale1: 18 },
          master: { scale5: 35, scale4: 30, scale3: 24, scale2: 19, scale1: 14 },
        },
        female: {
          youth: { scale5: 28, scale4: 24, scale3: 19, scale2: 15, scale1: 10 },
          junior: { scale5: 34, scale4: 28, scale3: 23, scale2: 18, scale1: 12 },
          senior: { scale5: 38, scale4: 32, scale3: 26, scale2: 20, scale1: 14 },
          master: { scale5: 30, scale4: 25, scale3: 20, scale2: 15, scale1: 10 },
        },
      },
    },
    {
      testName: "Stick Drop Test",
      unit: "cm",
      inverse: true,
      description: "Jarak tangkapan tongkat (lebih rendah = lebih baik)",
      norms: {
        male: {
          youth: { scale5: 12, scale4: 16, scale3: 21, scale2: 26, scale1: 32 },
          junior: { scale5: 10, scale4: 14, scale3: 18, scale2: 23, scale1: 28 },
          senior: { scale5: 8, scale4: 12, scale3: 16, scale2: 21, scale1: 26 },
          master: { scale5: 14, scale4: 19, scale3: 24, scale2: 30, scale1: 37 },
        },
        female: {
          youth: { scale5: 14, scale4: 18, scale3: 23, scale2: 28, scale1: 34 },
          junior: { scale5: 12, scale4: 16, scale3: 21, scale2: 26, scale1: 32 },
          senior: { scale5: 10, scale4: 14, scale3: 19, scale2: 24, scale1: 30 },
          master: { scale5: 16, scale4: 21, scale3: 27, scale2: 33, scale1: 40 },
        },
      },
    },
    {
      testName: "Alternate Hand Wall Toss",
      unit: "catches",
      inverse: false,
      description: "Tangkapan bergantian tangan dalam 30 detik",
      norms: {
        male: {
          youth: { scale5: 28, scale4: 24, scale3: 19, scale2: 15, scale1: 10 },
          junior: { scale5: 34, scale4: 29, scale3: 23, scale2: 18, scale1: 12 },
          senior: { scale5: 38, scale4: 32, scale3: 26, scale2: 20, scale1: 14 },
          master: { scale5: 31, scale4: 26, scale3: 21, scale2: 16, scale1: 11 },
        },
        female: {
          youth: { scale5: 24, scale4: 20, scale3: 16, scale2: 12, scale1: 8 },
          junior: { scale5: 30, scale4: 25, scale3: 20, scale2: 15, scale1: 10 },
          senior: { scale5: 34, scale4: 28, scale3: 22, scale2: 17, scale1: 12 },
          master: { scale5: 27, scale4: 22, scale3: 18, scale2: 13, scale1: 9 },
        },
      },
    },
    {
      testName: "Foot Tapping (10s)",
      unit: "taps",
      inverse: false,
      description: "Jumlah ketukan kaki dalam 10 detik",
      norms: {
        male: {
          youth: { scale5: 48, scale4: 42, scale3: 36, scale2: 30, scale1: 24 },
          junior: { scale5: 55, scale4: 48, scale3: 41, scale2: 34, scale1: 27 },
          senior: { scale5: 60, scale4: 52, scale3: 44, scale2: 36, scale1: 28 },
          master: { scale5: 50, scale4: 43, scale3: 36, scale2: 29, scale1: 22 },
        },
        female: {
          youth: { scale5: 44, scale4: 38, scale3: 32, scale2: 26, scale1: 20 },
          junior: { scale5: 51, scale4: 44, scale3: 37, scale2: 30, scale1: 23 },
          senior: { scale5: 56, scale4: 48, scale3: 40, scale2: 32, scale1: 24 },
          master: { scale5: 46, scale4: 39, scale3: 32, scale2: 25, scale1: 18 },
        },
      },
    },
    {
      testName: "Stork Balance Test",
      unit: "s",
      inverse: false,
      description: "Waktu keseimbangan satu kaki",
      norms: {
        male: {
          youth: { scale5: 45, scale4: 35, scale3: 25, scale2: 15, scale1: 8 },
          junior: { scale5: 55, scale4: 43, scale3: 32, scale2: 20, scale1: 10 },
          senior: { scale5: 60, scale4: 48, scale3: 36, scale2: 24, scale1: 12 },
          master: { scale5: 45, scale4: 35, scale3: 25, scale2: 15, scale1: 8 },
        },
        female: {
          youth: { scale5: 50, scale4: 40, scale3: 30, scale2: 20, scale1: 10 },
          junior: { scale5: 60, scale4: 48, scale3: 36, scale2: 24, scale1: 12 },
          senior: { scale5: 65, scale4: 52, scale3: 40, scale2: 28, scale1: 15 },
          master: { scale5: 50, scale4: 40, scale3: 30, scale2: 20, scale1: 10 },
        },
      },
    },
  ],
  komposisi_tubuh: [
    {
      testName: "IMT/BMI",
      unit: "kg/m²",
      inverse: true, // Lower is better (within healthy range)
      description: "Indeks Massa Tubuh (Berat/Tinggi²)",
      norms: {
        male: {
          youth: { scale5: 18.5, scale4: 20.0, scale3: 23.0, scale2: 25.0, scale1: 30.0 },
          junior: { scale5: 19.0, scale4: 21.0, scale3: 23.5, scale2: 25.0, scale1: 30.0 },
          senior: { scale5: 20.0, scale4: 22.0, scale3: 24.0, scale2: 26.5, scale1: 30.0 },
          master: { scale5: 21.0, scale4: 23.0, scale3: 25.0, scale2: 27.0, scale1: 30.0 },
        },
        female: {
          youth: { scale5: 17.5, scale4: 19.0, scale3: 22.0, scale2: 24.0, scale1: 29.0 },
          junior: { scale5: 18.0, scale4: 20.0, scale3: 22.5, scale2: 24.5, scale1: 29.0 },
          senior: { scale5: 18.5, scale4: 21.0, scale3: 23.0, scale2: 25.0, scale1: 29.0 },
          master: { scale5: 19.0, scale4: 22.0, scale3: 24.0, scale2: 26.0, scale1: 29.0 },
        },
      },
    },
    {
      testName: "Persen Lemak Tubuh",
      unit: "%",
      inverse: true,
      description: "Persentase lemak tubuh (skinfold/bioimpedance)",
      norms: {
        male: {
          youth: { scale5: 10, scale4: 14, scale3: 18, scale2: 22, scale1: 28 },
          junior: { scale5: 8, scale4: 12, scale3: 16, scale2: 20, scale1: 26 },
          senior: { scale5: 10, scale4: 14, scale3: 18, scale2: 22, scale1: 28 },
          master: { scale5: 14, scale4: 18, scale3: 22, scale2: 26, scale1: 32 },
        },
        female: {
          youth: { scale5: 16, scale4: 20, scale3: 24, scale2: 28, scale1: 34 },
          junior: { scale5: 14, scale4: 18, scale3: 22, scale2: 26, scale1: 32 },
          senior: { scale5: 16, scale4: 20, scale3: 24, scale2: 28, scale1: 34 },
          master: { scale5: 20, scale4: 24, scale3: 28, scale2: 32, scale1: 38 },
        },
      },
    },
    {
      testName: "Lingkar Pinggang",
      unit: "cm",
      inverse: true,
      description: "Lingkar pinggang (waist circumference)",
      norms: {
        male: {
          youth: { scale5: 65, scale4: 72, scale3: 80, scale2: 88, scale1: 95 },
          junior: { scale5: 70, scale4: 77, scale3: 84, scale2: 91, scale1: 100 },
          senior: { scale5: 78, scale4: 84, scale3: 90, scale2: 96, scale1: 102 },
          master: { scale5: 82, scale4: 88, scale3: 94, scale2: 100, scale1: 108 },
        },
        female: {
          youth: { scale5: 58, scale4: 64, scale3: 70, scale2: 76, scale1: 84 },
          junior: { scale5: 62, scale4: 68, scale3: 74, scale2: 80, scale1: 88 },
          senior: { scale5: 68, scale4: 74, scale3: 80, scale2: 86, scale1: 92 },
          master: { scale5: 72, scale4: 78, scale3: 84, scale2: 90, scale1: 98 },
        },
      },
    },
    {
      testName: "Rasio Pinggang-Pinggul",
      unit: "ratio",
      inverse: true,
      description: "Waist-to-Hip Ratio (WHR)",
      norms: {
        male: {
          youth: { scale5: 0.80, scale4: 0.85, scale3: 0.90, scale2: 0.95, scale1: 1.00 },
          junior: { scale5: 0.82, scale4: 0.87, scale3: 0.92, scale2: 0.96, scale1: 1.00 },
          senior: { scale5: 0.85, scale4: 0.90, scale3: 0.95, scale2: 0.98, scale1: 1.02 },
          master: { scale5: 0.88, scale4: 0.92, scale3: 0.96, scale2: 1.00, scale1: 1.05 },
        },
        female: {
          youth: { scale5: 0.70, scale4: 0.75, scale3: 0.80, scale2: 0.85, scale1: 0.90 },
          junior: { scale5: 0.72, scale4: 0.77, scale3: 0.82, scale2: 0.86, scale1: 0.90 },
          senior: { scale5: 0.75, scale4: 0.80, scale3: 0.85, scale2: 0.88, scale1: 0.92 },
          master: { scale5: 0.78, scale4: 0.82, scale3: 0.86, scale2: 0.90, scale1: 0.95 },
        },
      },
    },
  ],
};

// List of available categories
export const CATEGORIES = [
  { value: "daya_tahan", label: "Daya Tahan" },
  { value: "kecepatan", label: "Kecepatan" },
  { value: "kekuatan", label: "Kekuatan" },
  { value: "kelincahan", label: "Kelincahan" },
  { value: "fleksibilitas", label: "Fleksibilitas" },
  { value: "power", label: "Power" },
  { value: "koordinasi", label: "Koordinasi & Keseimbangan" },
  { value: "komposisi_tubuh", label: "Komposisi Tubuh" },
];

// Function to get benchmark scale based on age and gender
export function getBenchmarkScale(
  benchmark: TestBenchmark,
  age: number,
  gender: Gender
): BenchmarkScale {
  const ageGroup = getAgeGroup(age);
  return benchmark.norms[gender][ageGroup];
}

// Function to calculate score (1-5) based on benchmark, age, and gender
export function calculateScore(
  value: number,
  benchmark: TestBenchmark,
  age: number = 25,
  gender: Gender = 'male'
): number {
  const scale = getBenchmarkScale(benchmark, age, gender);
  
  if (benchmark.inverse) {
    if (value <= scale.scale5) return 5;
    if (value <= scale.scale4) return 4;
    if (value <= scale.scale3) return 3;
    if (value <= scale.scale2) return 2;
    return 1;
  } else {
    if (value >= scale.scale5) return 5;
    if (value >= scale.scale4) return 4;
    if (value >= scale.scale3) return 3;
    if (value >= scale.scale2) return 2;
    return 1;
  }
}

// Function to get score color
export function getScoreColor(score: number): string {
  if (score === 5) return "bg-green-500 text-white";
  if (score === 4) return "bg-blue-500 text-white";
  if (score === 3) return "bg-yellow-500 text-black";
  if (score === 2) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
}

// Function to get score label
export function getScoreLabel(score: number): string {
  if (score === 5) return "Excellent";
  if (score === 4) return "Good";
  if (score === 3) return "Average";
  if (score === 2) return "Below Average";
  return "Poor";
}

// Find benchmark by test name
export function findBenchmark(testName: string): TestBenchmark | undefined {
  return Object.values(BENCHMARKS).flat().find(b => b.testName === testName);
}
