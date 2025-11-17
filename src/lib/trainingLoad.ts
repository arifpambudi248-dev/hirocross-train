// ============================================
// TRAINING LOAD CALCULATION UTILITIES
// ============================================

export type DailyLoad = {
  date: string;    // "YYYY-MM-DD"
  load: number;    // total load hari itu
};

const BASE_LOAD_PER_RPE: Record<number, number> = {
  1: 20,
  2: 30,
  3: 40,
  4: 50,
  5: 60,
  6: 70,
  7: 80,
  8: 100,
  9: 120,
  10: 140,
};

/**
 * Menghitung load otomatis dari satu sesi latihan.
 * RPE 1-10 dengan base load, diskalakan dengan durasi/60
 */
export function computeSessionLoad(rpe: number | null, durationMin: number | null): number {
  if (!rpe || !durationMin || durationMin <= 0) return 0;
  const base = BASE_LOAD_PER_RPE[rpe] ?? 0;
  if (base <= 0) return 0;
  const factor = durationMin / 60;
  return Math.round(base * factor);
}

/**
 * Aggregasi total load harian dari array sesi
 */
export function aggregateDailyLoad(sessions: { date: string; load_final: number }[]): DailyLoad[] {
  const map = new Map<string, number>();

  for (const s of sessions) {
    const d = s.date;
    const v = s.load_final ?? 0;
    if (!map.has(d)) map.set(d, 0);
    map.set(d, (map.get(d) || 0) + v);
  }

  const result: DailyLoad[] = [];
  for (const [date, load] of map.entries()) {
    result.push({ date, load });
  }

  result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return result;
}

// ===== FITNESS – FATIGUE – FORM (CTL / ATL / TSB) =====

export type FitnessFatigueFormPoint = {
  date: string;
  load: number;
  fitness: number; // CTL
  fatigue: number; // ATL
  form: number;    // TSB = CTL - ATL
};

interface FFFOptions {
  dailyLoads: DailyLoad[];
  ctlTau?: number; // default 42 hari
  atlTau?: number; // default 7 hari
}

/**
 * Hitung fitness (CTL), fatigue (ATL), dan form (TSB).
 * Model EWMA sederhana
 */
export function computeFitnessFatigueForm(options: FFFOptions): FitnessFatigueFormPoint[] {
  const { dailyLoads, ctlTau = 42, atlTau = 7 } = options;

  let ctlPrev = 0;
  let atlPrev = 0;

  const result: FitnessFatigueFormPoint[] = [];

  for (const d of dailyLoads) {
    const load = d.load || 0;

    const ctl = ctlPrev + (load - ctlPrev) * (1 / ctlTau);
    const atl = atlPrev + (load - atlPrev) * (1 / atlTau);
    const form = ctl - atl;

    result.push({
      date: d.date,
      load,
      fitness: ctl,
      fatigue: atl,
      form,
    });

    ctlPrev = ctl;
    atlPrev = atl;
  }

  return result;
}

// ===== ACWR (Acute:Chronic Workload Ratio) =====

export type ACWRPoint = {
  date: string;
  acute: number;     // rata-rata 7 hari
  chronic: number;   // rata-rata 28 hari
  ratio: number;     // acute / chronic
};

/**
 * Menghitung ACWR dari dailyLoads
 * Acute = rata-rata 7 hari terakhir
 * Chronic = rata-rata 28 hari terakhir
 */
export function computeACWR(dailyLoads: DailyLoad[]): ACWRPoint[] {
  const result: ACWRPoint[] = [];

  for (let i = 0; i < dailyLoads.length; i++) {
    const date = dailyLoads[i].date;

    const acuteWindow = dailyLoads.slice(Math.max(0, i - 6), i + 1);
    const chronicWindow = dailyLoads.slice(Math.max(0, i - 27), i + 1);

    const acute =
      acuteWindow.length > 0
        ? acuteWindow.reduce((sum, d) => sum + d.load, 0) / acuteWindow.length
        : 0;
    const chronic =
      chronicWindow.length > 0
        ? chronicWindow.reduce((sum, d) => sum + d.load, 0) / chronicWindow.length
        : 0;

    const ratio = chronic > 0 ? acute / chronic : 0;

    result.push({
      date,
      acute,
      chronic,
      ratio,
    });
  }

  return result;
}

// ===== READINESS SCORING =====

export type ReadinessResult = {
  vjScore: number;
  rhrScore: number;
  readinessScore: number;
  readinessZone: 'low' | 'moderate' | 'prime';
};

/**
 * Menghitung skor readiness dari VJ dan RHR
 */
export function computeReadinessScore(
  vj: number,
  rhr: number,
  baselineVj: number,
  baselineRhr: number
): ReadinessResult {
  // VJ Score: makin besar makin baik
  let vjScore = 0;
  if (baselineVj > 0) {
    const vjRatio = vj / baselineVj;
    vjScore = Math.round(Math.max(0, Math.min(1.2, vjRatio)) * 100);
    if (vjScore > 100) vjScore = 100;
  }

  // RHR Score: makin kecil RHR makin baik
  let rhrScore = 0;
  if (baselineRhr > 0) {
    const rhrRatio = baselineRhr / rhr;
    rhrScore = Math.round(Math.max(0, Math.min(1.2, rhrRatio)) * 100);
    if (rhrScore > 100) rhrScore = 100;
  }

  // Combined: 60% VJ, 40% RHR
  const readinessScore = Math.round(0.6 * vjScore + 0.4 * rhrScore);

  // Determine zone
  let readinessZone: 'low' | 'moderate' | 'prime';
  if (readinessScore <= 40) {
    readinessZone = 'low';
  } else if (readinessScore <= 70) {
    readinessZone = 'moderate';
  } else {
    readinessZone = 'prime';
  }

  return {
    vjScore,
    rhrScore,
    readinessScore,
    readinessZone,
  };
}
