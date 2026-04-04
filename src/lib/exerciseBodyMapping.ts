// Maps exercise names (lowercase keywords) to body regions
type BodyRegion = "upper" | "lower" | "core";

const UPPER_KEYWORDS = [
  "bench", "press", "push up", "pushup", "pull up", "pullup", "chin up",
  "row", "curl", "fly", "flye", "tricep", "bicep", "shoulder", "overhead",
  "lateral raise", "front raise", "dip", "chest", "back", "lat",
  "dumbbell press", "barbell press", "military press", "arnold",
  "shrug", "upright", "face pull", "cable", "pec",
  // Indonesian
  "angkat", "tarik", "dorong", "dada", "bahu", "lengan", "punggung",
];

const LOWER_KEYWORDS = [
  "squat", "deadlift", "lunge", "leg press", "leg curl", "leg extension",
  "calf", "hip thrust", "glute", "hamstring", "quad", "step up",
  "bulgarian", "romanian", "sumo", "goblet", "front squat", "back squat",
  "box jump", "jump", "sprint", "run", "jalan", "lari",
  // Indonesian
  "kaki", "paha", "betis", "pinggul", "jongkok",
];

const CORE_KEYWORDS = [
  "plank", "sit up", "situp", "crunch", "abs", "core", "twist",
  "russian twist", "leg raise", "hanging", "ab wheel", "rollout",
  "side bend", "woodchop", "pallof", "bird dog", "dead bug",
  // Indonesian
  "perut",
];

export function classifyExercise(exerciseName: string): BodyRegion {
  const name = exerciseName.toLowerCase();
  
  for (const kw of LOWER_KEYWORDS) {
    if (name.includes(kw)) return "lower";
  }
  for (const kw of CORE_KEYWORDS) {
    if (name.includes(kw)) return "core";
  }
  for (const kw of UPPER_KEYWORDS) {
    if (name.includes(kw)) return "upper";
  }
  
  // Default: upper for strength exercises
  return "upper";
}

export type BodyDistribution = {
  upper: number;
  lower: number;
  core: number;
  total: number;
};

export function calculateBodyDistribution(
  exercises: { exercise_name: string; sets?: number | null; reps?: number | null; weight_kg?: number | null }[]
): BodyDistribution {
  let upper = 0, lower = 0, core = 0;

  for (const ex of exercises) {
    const region = classifyExercise(ex.exercise_name);
    const volume = (ex.sets || 1) * (ex.reps || 1) * (ex.weight_kg || 1);
    
    if (region === "upper") upper += volume;
    else if (region === "lower") lower += volume;
    else core += volume;
  }

  const total = upper + lower + core;
  return { upper, lower, core, total };
}
