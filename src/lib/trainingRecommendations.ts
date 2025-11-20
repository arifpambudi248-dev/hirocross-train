// Training recommendation system based on readiness and training load

export type RecommendationLevel = 'light' | 'moderate' | 'normal' | 'high';

export type TrainingRecommendation = {
  level: RecommendationLevel;
  intensity: string;
  volume: string;
  description: string;
  color: string;
};

/**
 * Generate training recommendation based on readiness score and previous week's load
 * @param readinessScore - Current readiness score (-100 to 100)
 * @param readinessZone - Current readiness zone (low, moderate, prime)
 * @param previousWeekLoad - Total training load from previous week
 * @param averageWeeklyLoad - Average weekly load over past 4 weeks
 */
export function generateTrainingRecommendation(
  readinessScore: number,
  readinessZone: 'low' | 'moderate' | 'prime',
  previousWeekLoad: number,
  averageWeeklyLoad: number
): TrainingRecommendation {
  
  // Calculate load ratio (previous week vs average)
  const loadRatio = averageWeeklyLoad > 0 ? previousWeekLoad / averageWeeklyLoad : 1;
  
  // Determine recommendation based on readiness zone and load
  if (readinessZone === 'low') {
    // Low readiness - prioritize recovery regardless of load
    return {
      level: 'light',
      intensity: 'Rendah (RPE 3-4)',
      volume: '40-60 menit',
      description: 'Kesiapan rendah. Fokus pada pemulihan aktif dan teknik. Hindari latihan intensitas tinggi.',
      color: 'text-red-500'
    };
  } else if (readinessZone === 'moderate') {
    // Moderate readiness - adjust based on previous load
    if (loadRatio > 1.3) {
      // Previous week was very high load
      return {
        level: 'light',
        intensity: 'Rendah-Sedang (RPE 4-5)',
        volume: '50-70 menit',
        description: 'Beban minggu lalu tinggi dan kesiapan sedang. Kurangi intensitas untuk pemulihan optimal.',
        color: 'text-yellow-500'
      };
    } else {
      return {
        level: 'moderate',
        intensity: 'Sedang (RPE 5-6)',
        volume: '60-90 menit',
        description: 'Kesiapan sedang. Latihan volume sedang dengan intensitas terkontrol.',
        color: 'text-yellow-500'
      };
    }
  } else {
    // Prime readiness - can handle higher loads
    if (loadRatio > 1.4) {
      // Very high load last week - be cautious even with good readiness
      return {
        level: 'moderate',
        intensity: 'Sedang (RPE 6-7)',
        volume: '70-100 menit',
        description: 'Kesiapan baik namun beban minggu lalu sangat tinggi. Pertahankan intensitas sedang untuk mencegah overtraining.',
        color: 'text-green-500'
      };
    } else if (loadRatio < 0.7) {
      // Low load last week - can increase
      return {
        level: 'high',
        intensity: 'Tinggi (RPE 7-9)',
        volume: '90-120 menit',
        description: 'Kesiapan prima dan beban minggu lalu rendah. Optimal untuk latihan intensitas tinggi dan volume besar.',
        color: 'text-green-500'
      };
    } else {
      return {
        level: 'normal',
        intensity: 'Sedang-Tinggi (RPE 6-8)',
        volume: '80-110 menit',
        description: 'Kesiapan prima. Lanjutkan program latihan normal dengan progres bertahap.',
        color: 'text-green-500'
      };
    }
  }
}

/**
 * Get weekly load recommendation adjustment percentage
 */
export function getLoadAdjustment(
  readinessScore: number,
  readinessZone: 'low' | 'moderate' | 'prime',
  previousWeekLoad: number,
  averageWeeklyLoad: number
): { adjustment: number; reason: string } {
  
  const loadRatio = averageWeeklyLoad > 0 ? previousWeekLoad / averageWeeklyLoad : 1;
  
  if (readinessZone === 'low') {
    return {
      adjustment: -30,
      reason: 'Kesiapan rendah - kurangi beban untuk pemulihan'
    };
  } else if (readinessZone === 'moderate') {
    if (loadRatio > 1.3) {
      return {
        adjustment: -20,
        reason: 'Beban tinggi minggu lalu + kesiapan sedang - perlu recovery'
      };
    } else {
      return {
        adjustment: 0,
        reason: 'Kesiapan sedang - pertahankan beban normal'
      };
    }
  } else {
    // Prime
    if (loadRatio > 1.4) {
      return {
        adjustment: -10,
        reason: 'Beban sangat tinggi minggu lalu - sedikit kurangi meski kesiapan baik'
      };
    } else if (loadRatio < 0.7) {
      return {
        adjustment: +15,
        reason: 'Kesiapan prima + beban rendah minggu lalu - bisa tingkatkan'
      };
    } else {
      return {
        adjustment: +5,
        reason: 'Kesiapan prima - progres bertahap'
      };
    }
  }
}
