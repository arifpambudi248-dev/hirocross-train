// Utility functions for readiness score calculation
// Readiness = (VJtoday / VJbaseline) + (HRbaseline / HRtoday)
// Perfect readiness = 2.0 (when today == baseline for both)

export function computeReadinessScore(
  vj: number,
  rhr: number,
  baselineVJ: number,
  baselineRHR: number
): { vjScore: number; rhrScore: number; readinessScore: number; zone: 'low' | 'moderate' | 'prime' } {
  // VJ ratio: VJtoday / VJbaseline
  const vjScore = vj / baselineVJ;
  
  // RHR ratio: HRbaseline / HRtoday
  const rhrScore = baselineRHR / rhr;
  
  // Combined readiness score (sum of ratios, perfect = 2.0)
  const readinessScore = vjScore + rhrScore;
  
  // Determine zone based on readiness score
  // 2.0 = perfect, <1.9 = low, 1.9-2.0 = moderate, >=2.0 = prime
  let zone: 'low' | 'moderate' | 'prime';
  if (readinessScore < 1.9) {
    zone = 'low';
  } else if (readinessScore < 2.0) {
    zone = 'moderate';
  } else {
    zone = 'prime';
  }
  
  return {
    vjScore: Number(vjScore.toFixed(3)),
    rhrScore: Number(rhrScore.toFixed(3)),
    readinessScore: Number(readinessScore.toFixed(3)),
    zone
  };
}
