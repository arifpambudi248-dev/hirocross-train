// Detailed body region mapping.
// Exercise → primary muscle region mapping based on Frédéric Delavier's
// "Strength Training Anatomy" (3rd ed.) chapter assignments:
//   Ch.1 Arms  •  Ch.2 Shoulders  •  Ch.3 Chest  •  Ch.4 Back
//   Ch.5 Legs  •  Ch.6 Buttocks   •  Ch.7 Abdomen
// Keywords cover both Indonesian and English exercise names used in the app.

export type BodyRegion =
  | "chest" | "back" | "shoulders" | "arms"
  | "core" | "quads" | "hamstrings" | "calves";

// ===== Ch.3 Chest =====
const CHEST_KEYWORDS = [
  "bench press", "bench", "barbell press", "dumbbell press", "db press",
  "incline press", "decline press", "incline bench", "decline bench",
  "incline dumbbell", "decline dumbbell", "incline db", "decline db",
  "chest press", "machine press", "smith press",
  "push up", "pushup", "push-up", "press up",
  "dumbbell fly", "db fly", "fly", "flye", "flyes", "pec deck", "pec-deck",
  "cable cross", "cable crossover", "crossover",
  "dips chest", "chest dip", "parallel bar dip", "chest", "pec", "pectoral",
  "dada", "dorongan dada", "svend press",
  "landmine press", "floor press", "guillotine press",
];

// ===== Ch.4 Back =====
const BACK_KEYWORDS = [
  "row", "barbell row", "dumbbell row", "db row", "bent over row", "bent-over row",
  "pendlay row", "yates row", "t-bar", "t bar row", "seal row",
  "cable row", "seated row", "low row", "high row", "chest supported row",
  "pull up", "pullup", "pull-up", "chin up", "chinup", "chin-up",
  "lat pulldown", "pulldown", "pull-down", "lat pull",
  "straight arm pulldown", "straight-arm pulldown",
  "deadlift", "conventional deadlift", "sumo deadlift", "trap bar deadlift",
  "rack pull", "snatch grip deadlift",
  "good morning", "hyperextension", "back extension", "reverse hyper",
  "face pull", "shrug", "barbell shrug", "dumbbell shrug",
  "lat", "lats", "punggung", "tarik", "rhomboid", "trapezius", "back",
  "renegade row", "inverted row", "meadows row", "kroc row",
];

// ===== Ch.2 Shoulders =====
const SHOULDER_KEYWORDS = [
  "overhead press", "ohp", "military press", "shoulder press",
  "arnold press", "push press", "behind the neck press", "press behind",
  "seated dumbbell press", "seated barbell press", "z press",
  "lateral raise", "side lateral", "side raise", "cable lateral",
  "front raise", "plate raise",
  "rear delt", "reverse fly", "reverse flye", "rear fly", "bent over fly",
  "rear lateral", "face pull seated",
  "upright row", "high pull",
  "landmine lateral", "landmine shoulder",
  "delt", "deltoid", "shoulder", "bahu",
];

// ===== Ch.1 Arms =====
const ARM_KEYWORDS = [
  // Biceps
  "bicep curl", "biceps curl", "barbell curl", "dumbbell curl", "db curl",
  "hammer curl", "preacher curl", "spider curl", "concentration curl",
  "cable curl", "ez curl", "ez-bar curl", "incline curl", "zottman",
  "reverse curl", "drag curl", "21s",
  "biceps", "bicep", "lengan", "curl",
  // Triceps
  "tricep", "triceps", "skull crusher", "skullcrusher", "lying triceps",
  "french press", "overhead extension", "overhead tricep",
  "triceps pushdown", "tricep pushdown", "rope pushdown", "cable pushdown",
  "kickback", "tricep kickback", "close grip bench", "close-grip bench",
  "diamond push up", "tricep dip", "bench dip", "triceps extension",
  // Forearms
  "wrist curl", "reverse wrist curl", "farmer", "farmers walk", "farmer's walk",
];

// ===== Ch.7 Abdomen / Core =====
const CORE_KEYWORDS = [
  "plank", "side plank", "rkc plank", "elbow plank",
  "sit up", "situp", "sit-up", "crunch", "reverse crunch", "cable crunch",
  "decline sit", "weighted crunch", "bicycle crunch",
  "abs", "ab wheel", "rollout", "ab rollout", "core", "perut",
  "leg raise", "hanging leg raise", "hanging knee raise", "lying leg raise",
  "knee raise", "toes to bar", "v-up", "vup", "v up", "tuck up",
  "russian twist", "twist", "side bend", "weighted side bend",
  "woodchop", "wood chop", "cable chop", "pallof press", "pallof",
  "bird dog", "dead bug", "dragon flag", "hollow hold", "hollow body",
  "mountain climber", "windshield wiper", "oblique", "obliques",
];

// ===== Ch.5 Legs — Quadriceps =====
const QUAD_KEYWORDS = [
  "back squat", "front squat", "high bar squat", "low bar squat", "squat",
  "goblet squat", "box squat", "pause squat", "pin squat", "zercher squat",
  "hack squat", "smith squat", "split squat", "bulgarian split squat",
  "leg press", "sled press", "leg extension", "quad extension",
  "lunge", "walking lunge", "reverse lunge", "forward lunge", "step up", "step-up",
  "wall sit", "sissy squat", "pistol squat", "box jump", "jump squat",
  "jongkok", "paha", "quad", "quads", "quadriceps", "vmo",
];

// ===== Ch.5 Legs — Hamstrings / Ch.6 Buttocks =====
const HAMSTRING_KEYWORDS = [
  "leg curl", "seated leg curl", "lying leg curl", "standing leg curl",
  "hamstring curl", "nordic curl", "nordic hamstring",
  "romanian deadlift", "rdl", "stiff leg deadlift", "stiff-leg deadlift",
  "single leg rdl", "single-leg rdl", "dumbbell rdl", "db rdl",
  "good morning", "hip thrust", "barbell hip thrust", "single leg hip thrust",
  "glute bridge", "glute kickback", "cable kickback", "donkey kick",
  "sumo deadlift", "kettlebell swing", "kb swing",
  "hamstring", "hamstrings", "glute", "glutes", "pinggul", "bokong",
];

// ===== Ch.5 Legs — Calves =====
const CALF_KEYWORDS = [
  "calf raise", "standing calf", "seated calf", "donkey calf",
  "smith calf", "leg press calf", "calf press",
  "tibialis", "tibialis raise",
  "calf", "calves", "betis", "jinjit",
];

const REGION_KEYWORDS: { region: BodyRegion; keywords: string[] }[] = [
  // Order: most specific multi-word first, but classifyExercise uses includes()
  // so we keep specific groups (calves/hamstrings/quads) before generic ones.
  { region: "calves", keywords: CALF_KEYWORDS },
  { region: "hamstrings", keywords: HAMSTRING_KEYWORDS },
  { region: "quads", keywords: QUAD_KEYWORDS },
  { region: "core", keywords: CORE_KEYWORDS },
  { region: "chest", keywords: CHEST_KEYWORDS },
  { region: "back", keywords: BACK_KEYWORDS },
  { region: "shoulders", keywords: SHOULDER_KEYWORDS },
  { region: "arms", keywords: ARM_KEYWORDS },
];

export function classifyExercise(exerciseName: string): BodyRegion {
  const name = exerciseName.toLowerCase().trim();
  if (!name) return "chest";

  // First pass: prefer multi-word matches (more specific)
  let bestRegion: BodyRegion = "chest";
  let bestLen = 0;
  for (const { region, keywords } of REGION_KEYWORDS) {
    for (const kw of keywords) {
      if (kw.length > bestLen && name.includes(kw)) {
        bestRegion = region;
        bestLen = kw.length;
      }
    }
  }
  return bestRegion;
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
