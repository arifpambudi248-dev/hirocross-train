// Temporary type definitions untuk tabel baru
// File ini akan bisa dihapus setelah Supabase types ter-regenerate

export type TrainingSession = {
  id?: string;
  athlete_id?: string;
  date: string;
  session_name: string;
  session_type: string;
  duration_min: number | null;
  rpe: number | null;
  load_auto: number;
  load_manual: number | null;
  load_final: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

export type PhysicalTest = {
  id?: string;
  athlete_id?: string;
  test_date: string;
  category: string;
  test_name: string;
  value: number;
  unit: string;
  notes: string;
  created_at?: string;
};

export type ReadinessLog = {
  id: string;
  athlete_id: string;
  date: string;
  rhr: number;
  vj: number;
  vj_score: number;
  rhr_score: number;
  readiness_score: number;
  readiness_zone: 'low' | 'moderate' | 'prime';
  notes: string;
  created_at: string;
};

export type Profile = {
  id: string;
  baseline_vj: number;
  baseline_rhr: number;
};

export type AthleteGoal = {
  id: string;
  athlete_id: string;
  goal_type: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  target_date: string;
  current_value: number;
  baseline_value: number;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
};
