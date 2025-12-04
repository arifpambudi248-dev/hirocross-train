// Utility functions for VO2max and Power predictions

/**
 * Predicts VO2max from Resting Heart Rate (RHR) using the Uth-Sørensen-Overgaard-Pedersen estimation
 * Formula: VO2max = 15.3 × (HRmax / RHR)
 * HRmax = 220 - age
 * 
 * @param rhr - Resting Heart Rate (bpm)
 * @param age - Athlete's age in years
 * @returns Predicted VO2max in ml/kg/min
 */
export function predictVO2maxFromRHR(rhr: number, age: number): number {
  if (!rhr || !age || rhr <= 0 || age <= 0) return 0;
  
  const hrMax = 220 - age;
  const vo2max = 15.3 * (hrMax / rhr);
  
  return Number(vo2max.toFixed(1));
}

/**
 * Get VO2max fitness level classification
 * Based on standard VO2max norms for adults
 */
export function getVO2maxLevel(vo2max: number, age: number, gender: 'male' | 'female' = 'male'): {
  level: string;
  color: string;
} {
  if (!vo2max || vo2max <= 0) return { level: 'N/A', color: 'text-muted-foreground' };
  
  // Simplified norms (using male norms as default)
  if (vo2max >= 55) return { level: 'Excellent', color: 'text-green-500' };
  if (vo2max >= 45) return { level: 'Good', color: 'text-blue-500' };
  if (vo2max >= 35) return { level: 'Average', color: 'text-yellow-500' };
  if (vo2max >= 25) return { level: 'Below Average', color: 'text-orange-500' };
  return { level: 'Poor', color: 'text-red-500' };
}

/**
 * Predicts Power output from Vertical Jump using the Lewis formula
 * Formula: Power (W) = √4.9 × body_mass × √(jump_height_m × 9.81)
 * 
 * Since body mass may not be available, we use a normalized power index
 * or estimate based on typical body mass
 * 
 * @param verticalJump - Vertical jump height in cm
 * @param bodyMass - Body mass in kg (default 70kg if not provided)
 * @returns Predicted peak power in Watts
 */
export function predictPowerFromVJ(verticalJump: number, bodyMass: number = 70): number {
  if (!verticalJump || verticalJump <= 0) return 0;
  
  // Convert cm to meters
  const jumpHeightM = verticalJump / 100;
  
  // Lewis formula
  const power = Math.sqrt(4.9) * bodyMass * Math.sqrt(jumpHeightM * 9.81);
  
  return Math.round(power);
}

/**
 * Alternative: Sayers Power Equation (Peak Power)
 * Peak Power (W) = 60.7 × jump_height_cm + 45.3 × body_mass_kg - 2055
 */
export function predictPeakPowerSayers(verticalJump: number, bodyMass: number = 70): number {
  if (!verticalJump || verticalJump <= 0) return 0;
  
  const peakPower = (60.7 * verticalJump) + (45.3 * bodyMass) - 2055;
  
  return Math.max(0, Math.round(peakPower));
}

/**
 * Calculate relative power (W/kg) - useful for comparing athletes of different sizes
 */
export function calculateRelativePower(power: number, bodyMass: number = 70): number {
  if (!power || !bodyMass || bodyMass <= 0) return 0;
  return Number((power / bodyMass).toFixed(1));
}

/**
 * Get Power level classification based on relative power (W/kg)
 */
export function getPowerLevel(relativePower: number): {
  level: string;
  color: string;
} {
  if (!relativePower || relativePower <= 0) return { level: 'N/A', color: 'text-muted-foreground' };
  
  // Based on typical athletic norms
  if (relativePower >= 65) return { level: 'Elite', color: 'text-green-500' };
  if (relativePower >= 55) return { level: 'Excellent', color: 'text-blue-500' };
  if (relativePower >= 45) return { level: 'Good', color: 'text-cyan-500' };
  if (relativePower >= 35) return { level: 'Average', color: 'text-yellow-500' };
  return { level: 'Below Average', color: 'text-orange-500' };
}

/**
 * Estimate jump power category based on vertical jump height alone
 */
export function getJumpPowerCategory(verticalJump: number): {
  level: string;
  color: string;
} {
  if (!verticalJump || verticalJump <= 0) return { level: 'N/A', color: 'text-muted-foreground' };
  
  // Based on general vertical jump norms (cm)
  if (verticalJump >= 70) return { level: 'Elite', color: 'text-green-500' };
  if (verticalJump >= 55) return { level: 'Excellent', color: 'text-blue-500' };
  if (verticalJump >= 45) return { level: 'Good', color: 'text-cyan-500' };
  if (verticalJump >= 35) return { level: 'Average', color: 'text-yellow-500' };
  return { level: 'Below Average', color: 'text-orange-500' };
}
