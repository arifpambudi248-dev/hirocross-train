// Utility functions for readiness score calculation

export function computeReadinessScore(
  vj: number,
  rhr: number,
  baselineVJ: number,
  baselineRHR: number
): { vjScore: number; rhrScore: number; readinessScore: number; zone: 'low' | 'moderate' | 'prime' } {
  // VJ Score: percentage change from baseline
  const vjScore = ((vj - baselineVJ) / baselineVJ) * 100;
  
  // RHR Score: inverse percentage change (lower is better)
  const rhrScore = ((baselineRHR - rhr) / baselineRHR) * 100;
  
  // Combined readiness score (50/50 weight)
  const readinessScore = (vjScore + rhrScore) / 2;
  
  // Determine zone
  let zone: 'low' | 'moderate' | 'prime';
  if (readinessScore < -5) {
    zone = 'low';
  } else if (readinessScore < 5) {
    zone = 'moderate';
  } else {
    zone = 'prime';
  }
  
  return {
    vjScore: Number(vjScore.toFixed(2)),
    rhrScore: Number(rhrScore.toFixed(2)),
    readinessScore: Number(readinessScore.toFixed(2)),
    zone
  };
}
