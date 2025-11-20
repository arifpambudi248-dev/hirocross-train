// Automatic weekly training planning based on readiness and competition targets

import { differenceInWeeks, addWeeks, format } from "date-fns";

export type SessionPlan = {
  day: string;
  date: string;
  sessionName: string;
  recommendedRPE: number;
  recommendedDuration: number;
  focus: string;
  estimatedLoad: number;
};

export type WeeklyPlan = {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  totalPlannedLoad: number;
  sessions: SessionPlan[];
  phaseType: 'base' | 'build' | 'peak' | 'taper' | 'recovery';
  notes: string;
};

/**
 * Generate weekly training plan based on readiness, current load, and competition date
 */
export function generateWeeklyPlan(
  readinessScore: number,
  readinessZone: 'low' | 'moderate' | 'prime',
  previousWeekLoad: number,
  averageWeeklyLoad: number,
  competitionDate: Date,
  currentDate: Date = new Date()
): WeeklyPlan {
  
  const weeksToCompetition = differenceInWeeks(competitionDate, currentDate);
  const weekStart = currentDate;
  const weekEnd = addWeeks(currentDate, 1);
  
  // Determine phase based on weeks to competition
  let phaseType: 'base' | 'build' | 'peak' | 'taper' | 'recovery';
  let baseLoadMultiplier = 1.0;
  
  if (weeksToCompetition > 12) {
    phaseType = 'base';
    baseLoadMultiplier = 0.85;
  } else if (weeksToCompetition > 6) {
    phaseType = 'build';
    baseLoadMultiplier = 1.1;
  } else if (weeksToCompetition > 2) {
    phaseType = 'peak';
    baseLoadMultiplier = 1.2;
  } else if (weeksToCompetition > 0) {
    phaseType = 'taper';
    baseLoadMultiplier = 0.6;
  } else {
    phaseType = 'recovery';
    baseLoadMultiplier = 0.4;
  }
  
  // Adjust based on readiness
  let readinessMultiplier = 1.0;
  if (readinessZone === 'low') {
    readinessMultiplier = 0.7;
  } else if (readinessZone === 'moderate') {
    readinessMultiplier = 0.9;
  } else {
    readinessMultiplier = 1.0;
  }
  
  // Adjust based on previous week load
  const loadRatio = averageWeeklyLoad > 0 ? previousWeekLoad / averageWeeklyLoad : 1;
  let loadAdjustment = 1.0;
  if (loadRatio > 1.4) {
    loadAdjustment = 0.85; // Previous week was very high
  } else if (loadRatio < 0.7) {
    loadAdjustment = 1.1; // Previous week was low, can increase
  }
  
  // Calculate target weekly load
  const baseLoad = averageWeeklyLoad > 0 ? averageWeeklyLoad : 2000;
  const targetWeeklyLoad = Math.round(baseLoad * baseLoadMultiplier * readinessMultiplier * loadAdjustment);
  
  // Generate sessions based on phase
  const sessions = generateSessionsByPhase(phaseType, targetWeeklyLoad, weekStart);
  
  const totalPlannedLoad = sessions.reduce((sum, s) => sum + s.estimatedLoad, 0);
  
  let notes = '';
  if (phaseType === 'base') {
    notes = 'Fase Persiapan Umum: Fokus pada volume dan fondasi aerobik.';
  } else if (phaseType === 'build') {
    notes = 'Fase Build: Tingkatkan intensitas dan latihan spesifik cabang.';
  } else if (phaseType === 'peak') {
    notes = 'Fase Peak: Intensitas tinggi, latihan kompetitif.';
  } else if (phaseType === 'taper') {
    notes = 'Fase Taper: Kurangi volume, pertahankan intensitas untuk pemulihan pre-kompetisi.';
  } else {
    notes = 'Fase Recovery: Pemulihan aktif, volume dan intensitas rendah.';
  }
  
  if (readinessZone === 'low') {
    notes += ' [PERHATIAN: Readiness rendah - load sudah disesuaikan turun]';
  }
  
  return {
    weekNumber: Math.ceil(differenceInWeeks(currentDate, new Date(currentDate.getFullYear(), 0, 1))),
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    totalPlannedLoad,
    sessions,
    phaseType,
    notes
  };
}

function generateSessionsByPhase(
  phase: 'base' | 'build' | 'peak' | 'taper' | 'recovery',
  targetLoad: number,
  weekStart: Date
): SessionPlan[] {
  
  const sessions: SessionPlan[] = [];
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  
  if (phase === 'base') {
    // 5 sessions per week, moderate intensity
    const sessionLoads = [
      { day: 0, load: targetLoad * 0.18, rpe: 5, duration: 70, focus: 'Endurance Dasar' },
      { day: 1, load: targetLoad * 0.22, rpe: 6, duration: 80, focus: 'Threshold Work' },
      { day: 2, load: targetLoad * 0.15, rpe: 4, duration: 60, focus: 'Recovery Run' },
      { day: 4, load: targetLoad * 0.25, rpe: 6, duration: 90, focus: 'Long Endurance' },
      { day: 5, load: targetLoad * 0.20, rpe: 5, duration: 75, focus: 'Tempo Run' }
    ];
    
    sessionLoads.forEach(s => {
      const date = addWeeks(weekStart, 0);
      date.setDate(date.getDate() + s.day);
      sessions.push({
        day: days[s.day],
        date: format(date, 'yyyy-MM-dd'),
        sessionName: s.focus,
        recommendedRPE: s.rpe,
        recommendedDuration: s.duration,
        focus: s.focus,
        estimatedLoad: Math.round(s.load)
      });
    });
    
  } else if (phase === 'build') {
    // 6 sessions, higher intensity
    const sessionLoads = [
      { day: 0, load: targetLoad * 0.15, rpe: 7, duration: 60, focus: 'Interval Training' },
      { day: 1, load: targetLoad * 0.18, rpe: 6, duration: 75, focus: 'Tempo Run' },
      { day: 2, load: targetLoad * 0.12, rpe: 4, duration: 50, focus: 'Active Recovery' },
      { day: 3, load: targetLoad * 0.20, rpe: 7, duration: 70, focus: 'Speed Work' },
      { day: 4, load: targetLoad * 0.10, rpe: 3, duration: 45, focus: 'Easy Run' },
      { day: 5, load: targetLoad * 0.25, rpe: 6, duration: 100, focus: 'Long Run' }
    ];
    
    sessionLoads.forEach(s => {
      const date = addWeeks(weekStart, 0);
      date.setDate(date.getDate() + s.day);
      sessions.push({
        day: days[s.day],
        date: format(date, 'yyyy-MM-dd'),
        sessionName: s.focus,
        recommendedRPE: s.rpe,
        recommendedDuration: s.duration,
        focus: s.focus,
        estimatedLoad: Math.round(s.load)
      });
    });
    
  } else if (phase === 'peak') {
    // 5-6 sessions, very high intensity
    const sessionLoads = [
      { day: 0, load: targetLoad * 0.22, rpe: 8, duration: 65, focus: 'High Intensity Intervals' },
      { day: 1, load: targetLoad * 0.12, rpe: 4, duration: 50, focus: 'Recovery' },
      { day: 2, load: targetLoad * 0.25, rpe: 8, duration: 75, focus: 'Race Pace Work' },
      { day: 3, load: targetLoad * 0.10, rpe: 3, duration: 40, focus: 'Easy Run' },
      { day: 4, load: targetLoad * 0.20, rpe: 7, duration: 65, focus: 'Threshold + Strides' },
      { day: 5, load: targetLoad * 0.11, rpe: 5, duration: 55, focus: 'Aerobic Maintenance' }
    ];
    
    sessionLoads.forEach(s => {
      const date = addWeeks(weekStart, 0);
      date.setDate(date.getDate() + s.day);
      sessions.push({
        day: days[s.day],
        date: format(date, 'yyyy-MM-dd'),
        sessionName: s.focus,
        recommendedRPE: s.rpe,
        recommendedDuration: s.duration,
        focus: s.focus,
        estimatedLoad: Math.round(s.load)
      });
    });
    
  } else if (phase === 'taper') {
    // 4 sessions, maintain intensity but reduce volume
    const sessionLoads = [
      { day: 0, load: targetLoad * 0.25, rpe: 7, duration: 45, focus: 'Short Intervals' },
      { day: 2, load: targetLoad * 0.30, rpe: 6, duration: 50, focus: 'Race Pace' },
      { day: 4, load: targetLoad * 0.25, rpe: 5, duration: 40, focus: 'Easy + Strides' },
      { day: 5, load: targetLoad * 0.20, rpe: 4, duration: 30, focus: 'Shakeout Run' }
    ];
    
    sessionLoads.forEach(s => {
      const date = addWeeks(weekStart, 0);
      date.setDate(date.getDate() + s.day);
      sessions.push({
        day: days[s.day],
        date: format(date, 'yyyy-MM-dd'),
        sessionName: s.focus,
        recommendedRPE: s.rpe,
        recommendedDuration: s.duration,
        focus: s.focus,
        estimatedLoad: Math.round(s.load)
      });
    });
    
  } else {
    // Recovery phase - 3 very easy sessions
    const sessionLoads = [
      { day: 1, load: targetLoad * 0.35, rpe: 3, duration: 40, focus: 'Easy Recovery' },
      { day: 3, load: targetLoad * 0.35, rpe: 3, duration: 40, focus: 'Easy Recovery' },
      { day: 5, load: targetLoad * 0.30, rpe: 4, duration: 45, focus: 'Light Aerobic' }
    ];
    
    sessionLoads.forEach(s => {
      const date = addWeeks(weekStart, 0);
      date.setDate(date.getDate() + s.day);
      sessions.push({
        day: days[s.day],
        date: format(date, 'yyyy-MM-dd'),
        sessionName: s.focus,
        recommendedRPE: s.rpe,
        recommendedDuration: s.duration,
        focus: s.focus,
        estimatedLoad: Math.round(s.load)
      });
    });
  }
  
  return sessions;
}
