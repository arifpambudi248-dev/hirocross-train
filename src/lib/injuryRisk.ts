// Injury risk analysis based on ACWR, readiness trends, and load spikes

export type InjuryRiskLevel = 'low' | 'moderate' | 'high' | 'very-high';

export type InjuryRiskFactor = {
  factor: string;
  severity: InjuryRiskLevel;
  value: number | string;
  description: string;
};

export type InjuryRiskAssessment = {
  overallRisk: InjuryRiskLevel;
  riskScore: number; // 0-100
  factors: InjuryRiskFactor[];
  recommendations: string[];
};

/**
 * Assess injury risk based on multiple factors
 */
export function assessInjuryRisk(
  acwr: number,
  readinessScores: number[], // Last 7 days
  weeklyLoads: number[], // Last 4 weeks
  currentWeekLoad: number
): InjuryRiskAssessment {
  
  const factors: InjuryRiskFactor[] = [];
  let totalRiskScore = 0;
  const recommendations: string[] = [];
  
  // 1. ACWR Analysis
  const acwrRisk = analyzeACWR(acwr);
  factors.push(acwrRisk);
  totalRiskScore += getRiskValue(acwrRisk.severity) * 25;
  
  // 2. Readiness Trend Analysis
  const readinessTrend = analyzeReadinessTrend(readinessScores);
  factors.push(readinessTrend);
  totalRiskScore += getRiskValue(readinessTrend.severity) * 25;
  
  // 3. Load Spike Analysis
  const loadSpike = analyzeLoadSpike(weeklyLoads, currentWeekLoad);
  factors.push(loadSpike);
  totalRiskScore += getRiskValue(loadSpike.severity) * 30;
  
  // 4. Weekly Load Variability
  const loadVariability = analyzeLoadVariability(weeklyLoads);
  factors.push(loadVariability);
  totalRiskScore += getRiskValue(loadVariability.severity) * 20;
  
  // Determine overall risk
  let overallRisk: InjuryRiskLevel;
  if (totalRiskScore >= 75) {
    overallRisk = 'very-high';
    recommendations.push('SEGERA kurangi volume latihan 30-50%');
    recommendations.push('Fokus pada pemulihan dan mobilitas');
    recommendations.push('Konsultasi dengan fisioterapis jika ada keluhan');
    recommendations.push('Hindari latihan intensitas tinggi hingga kondisi membaik');
  } else if (totalRiskScore >= 50) {
    overallRisk = 'high';
    recommendations.push('Kurangi volume latihan 20-30%');
    recommendations.push('Tambahkan sesi recovery aktif');
    recommendations.push('Monitor ketat tanda-tanda kelelahan atau nyeri');
    recommendations.push('Hindari peningkatan beban lebih lanjut');
  } else if (totalRiskScore >= 25) {
    overallRisk = 'moderate';
    recommendations.push('Pertahankan atau sedikit kurangi beban latihan');
    recommendations.push('Pastikan recovery adequat (tidur 7-9 jam)');
    recommendations.push('Perhatikan nutrisi dan hidrasi');
    recommendations.push('Lakukan regenerasi rutin (foam rolling, stretching)');
  } else {
    overallRisk = 'low';
    recommendations.push('Kondisi baik untuk melanjutkan program latihan');
    recommendations.push('Tetap monitor readiness dan beban harian');
    recommendations.push('Tingkatkan beban maksimal 10% per minggu');
  }
  
  return {
    overallRisk,
    riskScore: Math.round(totalRiskScore),
    factors,
    recommendations
  };
}

function analyzeACWR(acwr: number): InjuryRiskFactor {
  let severity: InjuryRiskLevel;
  let description: string;
  
  if (acwr < 0.8 || acwr > 1.5) {
    severity = 'very-high';
    description = 'ACWR di luar zona aman. Risiko cedera sangat tinggi.';
  } else if (acwr < 0.85 || acwr > 1.3) {
    severity = 'high';
    description = 'ACWR mendekati zona bahaya. Perlu penyesuaian beban.';
  } else if (acwr < 0.9 || acwr > 1.2) {
    severity = 'moderate';
    description = 'ACWR sedikit di luar optimal. Perhatikan beban minggu depan.';
  } else {
    severity = 'low';
    description = 'ACWR dalam zona optimal (0.9-1.2).';
  }
  
  return {
    factor: 'ACWR (Acute:Chronic Workload Ratio)',
    severity,
    value: acwr.toFixed(2),
    description
  };
}

function analyzeReadinessTrend(scores: number[]): InjuryRiskFactor {
  if (scores.length === 0) {
    return {
      factor: 'Tren Readiness',
      severity: 'moderate',
      value: 'Tidak ada data',
      description: 'Data readiness tidak cukup untuk analisis.'
    };
  }
  
  const avgReadiness = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Calculate trend (simple linear)
  let trend = 0;
  if (scores.length >= 3) {
    const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlier = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    trend = recent - earlier;
  }
  
  let severity: InjuryRiskLevel;
  let description: string;
  
  if (avgReadiness < -5 || trend < -10) {
    severity = 'very-high';
    description = 'Readiness sangat rendah atau menurun tajam. Tanda kelelahan akut.';
  } else if (avgReadiness < 0 || trend < -5) {
    severity = 'high';
    description = 'Readiness di bawah baseline atau tren menurun. Risiko overtraining.';
  } else if (avgReadiness < 3 || trend < 0) {
    severity = 'moderate';
    description = 'Readiness stabil namun di bawah optimal.';
  } else {
    severity = 'low';
    description = 'Readiness baik dengan tren positif atau stabil.';
  }
  
  return {
    factor: 'Tren Readiness (7 hari)',
    severity,
    value: `${avgReadiness.toFixed(1)}% (trend: ${trend > 0 ? '+' : ''}${trend.toFixed(1)})`,
    description
  };
}

function analyzeLoadSpike(weeklyLoads: number[], currentWeekLoad: number): InjuryRiskFactor {
  if (weeklyLoads.length === 0) {
    return {
      factor: 'Load Spike',
      severity: 'low',
      value: 'Tidak ada data',
      description: 'Data beban tidak cukup untuk analisis spike.'
    };
  }
  
  const avgLoad = weeklyLoads.reduce((a, b) => a + b, 0) / weeklyLoads.length;
  const previousWeek = weeklyLoads[weeklyLoads.length - 1] || avgLoad;
  
  const weekToWeekChange = previousWeek > 0 ? ((currentWeekLoad - previousWeek) / previousWeek) * 100 : 0;
  const vsAverageChange = avgLoad > 0 ? ((currentWeekLoad - avgLoad) / avgLoad) * 100 : 0;
  
  let severity: InjuryRiskLevel;
  let description: string;
  
  if (weekToWeekChange > 30 || vsAverageChange > 50) {
    severity = 'very-high';
    description = 'Lonjakan beban sangat tajam! Risiko cedera overuse tinggi.';
  } else if (weekToWeekChange > 20 || vsAverageChange > 30) {
    severity = 'high';
    description = 'Peningkatan beban terlalu cepat. Melebihi rekomendasi 10% per minggu.';
  } else if (weekToWeekChange > 10 || vsAverageChange > 15) {
    severity = 'moderate';
    description = 'Peningkatan beban cukup signifikan. Monitor recovery dengan ketat.';
  } else {
    severity = 'low';
    description = 'Progres beban dalam batas aman.';
  }
  
  return {
    factor: 'Load Spike',
    severity,
    value: `${weekToWeekChange > 0 ? '+' : ''}${weekToWeekChange.toFixed(1)}% vs minggu lalu`,
    description
  };
}

function analyzeLoadVariability(weeklyLoads: number[]): InjuryRiskFactor {
  if (weeklyLoads.length < 2) {
    return {
      factor: 'Variabilitas Load',
      severity: 'low',
      value: 'Tidak ada data',
      description: 'Data tidak cukup untuk analisis variabilitas.'
    };
  }
  
  const mean = weeklyLoads.reduce((a, b) => a + b, 0) / weeklyLoads.length;
  const variance = weeklyLoads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / weeklyLoads.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0; // Coefficient of variation
  
  let severity: InjuryRiskLevel;
  let description: string;
  
  if (cv > 40) {
    severity = 'high';
    description = 'Beban latihan sangat tidak konsisten. Risiko adaptasi buruk.';
  } else if (cv > 25) {
    severity = 'moderate';
    description = 'Variabilitas beban cukup tinggi. Usahakan lebih konsisten.';
  } else {
    severity = 'low';
    description = 'Konsistensi beban baik.';
  }
  
  return {
    factor: 'Variabilitas Load (4 minggu)',
    severity,
    value: `CV: ${cv.toFixed(1)}%`,
    description
  };
}

function getRiskValue(severity: InjuryRiskLevel): number {
  switch (severity) {
    case 'very-high': return 4;
    case 'high': return 3;
    case 'moderate': return 2;
    case 'low': return 1;
    default: return 1;
  }
}

export function getRiskColor(risk: InjuryRiskLevel): string {
  switch (risk) {
    case 'very-high': return 'text-red-600';
    case 'high': return 'text-orange-500';
    case 'moderate': return 'text-yellow-500';
    case 'low': return 'text-green-500';
    default: return 'text-muted-foreground';
  }
}

export function getRiskBgColor(risk: InjuryRiskLevel): string {
  switch (risk) {
    case 'very-high': return 'bg-red-500/10 border-red-500';
    case 'high': return 'bg-orange-500/10 border-orange-500';
    case 'moderate': return 'bg-yellow-500/10 border-yellow-500';
    case 'low': return 'bg-green-500/10 border-green-500';
    default: return 'bg-muted';
  }
}
