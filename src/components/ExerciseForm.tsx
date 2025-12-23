import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Dumbbell, Footprints, Target, Zap, Crosshair } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ExerciseType = "strength" | "cardio" | "skill" | "speed" | "technique";
export type ExercisePhase = "warmup" | "main" | "cooldown" | "recovery";

export type Exercise = {
  id: string;
  exercise_name: string;
  exercise_type: ExerciseType;
  exercise_phase: ExercisePhase;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  distance_meters?: number;
  duration_seconds?: number;
  repetitions?: number;
  total_volume?: number;
  notes?: string;
};

interface ExerciseFormProps {
  exercises: Exercise[];
  onChange: (exercises: Exercise[]) => void;
}

const EXERCISE_TEMPLATES: Record<ExerciseType, string[]> = {
  strength: [
    "Squat", "Deadlift", "Bench Press", "Overhead Press", "Barbell Row",
    "Pull Up", "Push Up", "Lunges", "Leg Press", "Lat Pulldown",
    "Bicep Curl", "Tricep Extension", "Shoulder Press", "Chest Fly",
    "Leg Curl", "Leg Extension", "Calf Raise", "Romanian Deadlift"
  ],
  cardio: [
    "Lari", "Jogging", "Cycling", "Swimming",
    "Rowing", "Jump Rope", "Stair Climbing", "Treadmill", "Interval Run"
  ],
  skill: [
    "Jab", "Cross", "Hook", "Uppercut", "Front Kick", "Roundhouse Kick",
    "Side Kick", "Back Kick", "Knee Strike", "Elbow Strike",
    "Combo 1-2", "Combo 1-2-3", "Shadow Boxing", "Pad Work", "Bag Work"
  ],
  speed: [
    "Sprint 50m", "Sprint 100m", "Sprint 200m", "Shuttle Run",
    "Agility Ladder", "Cone Drill", "Box Jump", "Burpees",
    "High Knees", "Mountain Climber", "Speed Skater", "T-Drill"
  ],
  technique: [
    "Form Drill", "Skill Practice", "Choreography", "Pattern Work",
    "Slow Motion Drill", "Mirror Work", "Video Analysis", "Positioning Drill",
    "Footwork Drill", "Hand Technique", "Kick Technique", "Defense Drill"
  ]
};

const PHASE_LABELS: Record<ExercisePhase, string> = {
  warmup: "Warm Up",
  main: "Inti",
  cooldown: "Cooling Down",
  recovery: "Recovery"
};

const PHASE_COLORS: Record<ExercisePhase, string> = {
  warmup: "bg-amber-500/20 border-amber-500/50 text-amber-400",
  main: "bg-primary/20 border-primary/50 text-primary",
  cooldown: "bg-cyan-500/20 border-cyan-500/50 text-cyan-400",
  recovery: "bg-purple-500/20 border-purple-500/50 text-purple-400"
};

export function ExerciseForm({ exercises, onChange }: ExerciseFormProps) {
  const [activePhase, setActivePhase] = useState<ExercisePhase>("main");
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>("strength");

  const addExercise = () => {
    const newExercise: Exercise = {
      id: `temp-${Date.now()}`,
      exercise_name: "",
      exercise_type: newExerciseType,
      exercise_phase: activePhase,
      sets: newExerciseType === "strength" ? 3 : undefined,
      reps: newExerciseType === "strength" ? 10 : undefined,
      weight_kg: newExerciseType === "strength" ? 0 : undefined,
      distance_meters: (newExerciseType === "cardio" || newExerciseType === "speed") ? 0 : undefined,
      duration_seconds: (newExerciseType === "cardio" || newExerciseType === "speed" || newExerciseType === "technique") ? 0 : undefined,
      repetitions: (newExerciseType === "skill" || newExerciseType === "technique") ? 0 : undefined,
    };
    onChange([...exercises, newExercise]);
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    const updated = exercises.map(ex => {
      if (ex.id !== id) return ex;
      
      const updatedExercise = { ...ex, ...updates };
      
      // Calculate total volume based on exercise type
      if (updatedExercise.exercise_type === "strength") {
        const sets = updatedExercise.sets || 0;
        const reps = updatedExercise.reps || 0;
        const weight = updatedExercise.weight_kg || 0;
        updatedExercise.total_volume = sets * reps * weight;
      } else if (updatedExercise.exercise_type === "cardio" || updatedExercise.exercise_type === "speed") {
        updatedExercise.total_volume = updatedExercise.distance_meters || 0;
      } else if (updatedExercise.exercise_type === "skill" || updatedExercise.exercise_type === "technique") {
        updatedExercise.total_volume = updatedExercise.repetitions || 0;
      }
      
      return updatedExercise;
    });
    onChange(updated);
  };

  const removeExercise = (id: string) => {
    onChange(exercises.filter(ex => ex.id !== id));
  };

  const getExerciseIcon = (type: ExerciseType) => {
    switch (type) {
      case "strength": return <Dumbbell className="w-4 h-4" />;
      case "cardio": return <Footprints className="w-4 h-4" />;
      case "skill": return <Target className="w-4 h-4" />;
      case "speed": return <Zap className="w-4 h-4" />;
      case "technique": return <Crosshair className="w-4 h-4" />;
    }
  };

  const getExerciseColor = (type: ExerciseType) => {
    switch (type) {
      case "strength": return "bg-blue-500/20 border-blue-500/50 text-blue-400";
      case "cardio": return "bg-green-500/20 border-green-500/50 text-green-400";
      case "skill": return "bg-orange-500/20 border-orange-500/50 text-orange-400";
      case "speed": return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
      case "technique": return "bg-pink-500/20 border-pink-500/50 text-pink-400";
    }
  };

  const formatVolume = (exercise: Exercise) => {
    if (exercise.exercise_type === "strength") {
      const total = (exercise.sets || 0) * (exercise.reps || 0) * (exercise.weight_kg || 0);
      return `${total.toLocaleString()} kg total`;
    } else if (exercise.exercise_type === "cardio" || exercise.exercise_type === "speed") {
      const meters = exercise.distance_meters || 0;
      if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} km`;
      }
      return `${meters} m`;
    } else {
      return `${exercise.repetitions || 0} repetisi`;
    }
  };

  const getExercisesForPhase = (phase: ExercisePhase) => {
    return exercises.filter(ex => ex.exercise_phase === phase);
  };

  const getPhaseCount = (phase: ExercisePhase) => {
    return exercises.filter(ex => ex.exercise_phase === phase).length;
  };

  const renderExerciseCard = (exercise: Exercise, index: number) => (
    <Card key={exercise.id} className={`border ${getExerciseColor(exercise.exercise_type)}`}>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${getExerciseColor(exercise.exercise_type)}`}>
            {getExerciseIcon(exercise.exercise_type)}
          </div>
          <span className="text-xs uppercase font-semibold text-slate-400">
            {exercise.exercise_type} #{index + 1}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={() => removeExercise(exercise.id)}
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </Button>
        </div>

        {/* Exercise Name - with autocomplete suggestions */}
        <div className="space-y-1">
          <Input
            placeholder="Nama latihan..."
            value={exercise.exercise_name}
            onChange={(e) => updateExercise(exercise.id, { exercise_name: e.target.value })}
            list={`exercise-list-${exercise.id}`}
            className="bg-slate-950 border-slate-700 h-8 text-sm"
          />
          <datalist id={`exercise-list-${exercise.id}`}>
            {EXERCISE_TEMPLATES[exercise.exercise_type].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        {/* Strength Exercise Fields */}
        {exercise.exercise_type === "strength" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Set</Label>
              <Input
                type="number"
                min="1"
                value={exercise.sets || ""}
                onChange={(e) => updateExercise(exercise.id, { sets: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-950 border-slate-700 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Rep</Label>
              <Input
                type="number"
                min="1"
                value={exercise.reps || ""}
                onChange={(e) => updateExercise(exercise.id, { reps: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-950 border-slate-700 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Beban (kg)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={exercise.weight_kg || ""}
                onChange={(e) => updateExercise(exercise.id, { weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-950 border-slate-700 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Cardio / Speed Exercise Fields */}
        {(exercise.exercise_type === "cardio" || exercise.exercise_type === "speed") && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Jarak (meter)</Label>
              <Input
                type="number"
                min="0"
                value={exercise.distance_meters || ""}
                onChange={(e) => updateExercise(exercise.id, { distance_meters: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-950 border-slate-700 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Durasi (detik)</Label>
              <Input
                type="number"
                min="0"
                value={exercise.duration_seconds || ""}
                onChange={(e) => updateExercise(exercise.id, { duration_seconds: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-950 border-slate-700 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Skill / Technique Exercise Fields */}
        {(exercise.exercise_type === "skill" || exercise.exercise_type === "technique") && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Jumlah Repetisi</Label>
              <Input
                type="number"
                min="0"
                value={exercise.repetitions || ""}
                onChange={(e) => updateExercise(exercise.id, { repetitions: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-950 border-slate-700 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Durasi (detik)</Label>
              <Input
                type="number"
                min="0"
                value={exercise.duration_seconds || ""}
                onChange={(e) => updateExercise(exercise.id, { duration_seconds: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-slate-950 border-slate-700 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Volume Summary */}
        {exercise.exercise_name && (
          <div className="text-xs text-slate-400 bg-slate-950 rounded px-2 py-1">
            Total: <span className="font-semibold text-white">{formatVolume(exercise)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Detail Latihan</Label>
      </div>

      {/* Phase Tabs */}
      <Tabs value={activePhase} onValueChange={(v) => setActivePhase(v as ExercisePhase)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-950 border border-slate-800">
          <TabsTrigger value="warmup" className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Warm Up {getPhaseCount("warmup") > 0 && `(${getPhaseCount("warmup")})`}
          </TabsTrigger>
          <TabsTrigger value="main" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Inti {getPhaseCount("main") > 0 && `(${getPhaseCount("main")})`}
          </TabsTrigger>
          <TabsTrigger value="cooldown" className="text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Cool Down {getPhaseCount("cooldown") > 0 && `(${getPhaseCount("cooldown")})`}
          </TabsTrigger>
          <TabsTrigger value="recovery" className="text-xs data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            Recovery {getPhaseCount("recovery") > 0 && `(${getPhaseCount("recovery")})`}
          </TabsTrigger>
        </TabsList>

        {(["warmup", "main", "cooldown", "recovery"] as ExercisePhase[]).map((phase) => (
          <TabsContent key={phase} value={phase} className="mt-3">
            <div className={`p-2 rounded-lg border ${PHASE_COLORS[phase]} mb-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{PHASE_LABELS[phase]}</span>
                <div className="flex gap-2">
                  <Select value={newExerciseType} onValueChange={(v) => setNewExerciseType(v as ExerciseType)}>
                    <SelectTrigger className="w-28 h-7 bg-slate-950 border-slate-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="skill">Skill</SelectItem>
                      <SelectItem value="speed">Speed</SelectItem>
                      <SelectItem value="technique">Teknik</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addExercise}>
                    <Plus className="w-3 h-3 mr-1" />
                    Tambah
                  </Button>
                </div>
              </div>
            </div>

            {getExercisesForPhase(phase).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-lg">
                Belum ada latihan di fase {PHASE_LABELS[phase].toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {getExercisesForPhase(phase).map((exercise, index) => 
                  renderExerciseCard(exercise, index)
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Total Summary */}
      {exercises.length > 0 && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Ringkasan Sesi:</p>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Strength:</span>
              <span className="ml-1 font-semibold text-blue-400">
                {exercises
                  .filter(e => e.exercise_type === "strength")
                  .reduce((sum, e) => sum + ((e.sets || 0) * (e.reps || 0) * (e.weight_kg || 0)), 0)
                  .toLocaleString()} kg
              </span>
            </div>
            <div>
              <span className="text-slate-500">Cardio:</span>
              <span className="ml-1 font-semibold text-green-400">
                {(exercises
                  .filter(e => e.exercise_type === "cardio")
                  .reduce((sum, e) => sum + (e.distance_meters || 0), 0) / 1000)
                  .toFixed(1)} km
              </span>
            </div>
            <div>
              <span className="text-slate-500">Speed:</span>
              <span className="ml-1 font-semibold text-yellow-400">
                {exercises
                  .filter(e => e.exercise_type === "speed")
                  .reduce((sum, e) => sum + (e.distance_meters || 0), 0)} m
              </span>
            </div>
            <div>
              <span className="text-slate-500">Skill:</span>
              <span className="ml-1 font-semibold text-orange-400">
                {exercises
                  .filter(e => e.exercise_type === "skill")
                  .reduce((sum, e) => sum + (e.repetitions || 0), 0)} rep
              </span>
            </div>
            <div>
              <span className="text-slate-500">Teknik:</span>
              <span className="ml-1 font-semibold text-pink-400">
                {exercises
                  .filter(e => e.exercise_type === "technique")
                  .reduce((sum, e) => sum + (e.repetitions || 0), 0)} rep
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
