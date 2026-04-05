// Detailed body region mapping
export type BodyRegion = "chest" | "back" | "shoulders" | "arms" | "core" | "quads" | "hamstrings" | "calves";

const CHEST_KEYWORDS = [
  "bench", "push up", "pushup", "fly", "flye", "chest", "pec", "dada", "dumbbell press", "barbell press",
  "incline", "decline", "cable cross",
];

const BACK_KEYWORDS = [
  "row", "pull up", "pullup", "chin up", "lat", "back", "deadlift", "face pull",
  "cable row", "t-bar", "punggung", "tarik",
];

const SHOULDER_KEYWORDS = [
  "shoulder", "overhead", "military press", "arnold", "lateral raise", "front raise",
  "upright", "shrug", "delt", "bahu", "press behind",
];

const ARM_KEYWORDS = [
  "curl", "tricep", "bicep", "hammer", "preacher", "skull crusher", "dip",
  "extension", "kickback", "lengan", "angkat",
];

const CORE_KEYWORDS = [
  "plank", "sit up", "situp", "crunch", "abs", "core", "twist",
  "russian twist", "leg raise", "hanging", "ab wheel", "rollout",
  "side bend", "woodchop", "pallof", "bird dog", "dead bug", "perut",
];

const QUAD_KEYWORDS = [
  "squat", "leg press", "leg extension", "lunge", "bulgarian", "goblet",
  "front squat", "back squat", "step up", "box jump", "jump",
  "jongkok", "paha",
];

const HAMSTRING_KEYWORDS = [
  "leg curl", "hamstring", "romanian", "rdl", "good morning", "hip thrust",
  "glute", "sumo", "stiff leg", "pinggul",
];

const CALF_KEYWORDS = [
  "calf", "calf raise", "betis", "tibialis",
];

export function classifyExercise(exerciseName: string): BodyRegion {
  const name = exerciseName.toLowerCase();

  for (const kw of CALF_KEYWORDS) if (name.includes(kw)) return "calves";
  for (const kw of HAMSTRING_KEYWORDS) if (name.includes(kw)) return "hamstrings";
  for (const kw of QUAD_KEYWORDS) if (name.includes(kw)) return "quads";
  for (const kw of CORE_KEYWORDS) if (name.includes(kw)) return "core";
  for (const kw of CHEST_KEYWORDS) if (name.includes(kw)) return "chest";
  for (const kw of BACK_KEYWORDS) if (name.includes(kw)) return "back";
  for (const kw of SHOULDER_KEYWORDS) if (name.includes(kw)) return "shoulders";
  for (const kw of ARM_KEYWORDS) if (name.includes(kw)) return "arms";

  return "chest"; // default for unknown strength
}

export type DetailedBodyDistribution = {
  chest: number;
  back: number;
  shoulders: number;
  arms: number;
  core: number;
  quads: number;
  hamstrings: number;
  calves: number;
  total: number;
};

// Keep backward compat
export type BodyDistribution = {
  upper: number;
  lower: number;
  core: number;
  total: number;
};

export function calculateDetailedBodyDistribution(
  exercises: { exercise_name: string; sets?: number | null; reps?: number | null; weight_kg?: number | null }[]
): DetailedBodyDistribution {
  const dist: DetailedBodyDistribution = { chest: 0, back: 0, shoulders: 0, arms: 0, core: 0, quads: 0, hamstrings: 0, calves: 0, total: 0 };

  for (const ex of exercises) {
    const region = classifyExercise(ex.exercise_name);
    const volume = (ex.sets || 1) * (ex.reps || 1) * (ex.weight_kg || 1);
    dist[region] += volume;
  }

  dist.total = dist.chest + dist.back + dist.shoulders + dist.arms + dist.core + dist.quads + dist.hamstrings + dist.calves;
  return dist;
}

export function calculateBodyDistribution(
  exercises: { exercise_name: string; sets?: number | null; reps?: number | null; weight_kg?: number | null }[]
): BodyDistribution {
  const d = calculateDetailedBodyDistribution(exercises);
  return {
    upper: d.chest + d.back + d.shoulders + d.arms,
    lower: d.quads + d.hamstrings + d.calves,
    core: d.core,
    total: d.total,
  };
}
