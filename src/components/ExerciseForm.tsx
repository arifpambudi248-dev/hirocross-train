import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Dumbbell, Footprints, Target } from "lucide-react";

export type ExerciseType = "strength" | "cardio" | "skill";

export type Exercise = {
  id: string;
  exercise_name: string;
  exercise_type: ExerciseType;
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

const EXERCISE_TEMPLATES = {
  strength: [
    "Squat", "Deadlift", "Bench Press", "Overhead Press", "Barbell Row",
    "Pull Up", "Push Up", "Lunges", "Leg Press", "Lat Pulldown",
    "Bicep Curl", "Tricep Extension", "Shoulder Press", "Chest Fly",
    "Leg Curl", "Leg Extension", "Calf Raise", "Romanian Deadlift"
  ],
  cardio: [
    "Lari", "Sprint", "Jogging", "Interval Run", "Cycling", "Swimming",
    "Rowing", "Jump Rope", "Stair Climbing", "Treadmill"
  ],
  skill: [
    "Jab", "Cross", "Hook", "Uppercut", "Front Kick", "Roundhouse Kick",
    "Side Kick", "Back Kick", "Knee Strike", "Elbow Strike",
    "Combo 1-2", "Combo 1-2-3", "Shadow Boxing", "Pad Work", "Bag Work"
  ]
};

export function ExerciseForm({ exercises, onChange }: ExerciseFormProps) {
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>("strength");

  const addExercise = () => {
    const newExercise: Exercise = {
      id: `temp-${Date.now()}`,
      exercise_name: "",
      exercise_type: newExerciseType,
      sets: newExerciseType === "strength" ? 3 : undefined,
      reps: newExerciseType === "strength" ? 10 : undefined,
      weight_kg: newExerciseType === "strength" ? 0 : undefined,
      distance_meters: newExerciseType === "cardio" ? 0 : undefined,
      duration_seconds: newExerciseType === "cardio" ? 0 : undefined,
      repetitions: newExerciseType === "skill" ? 0 : undefined,
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
      } else if (updatedExercise.exercise_type === "cardio") {
        updatedExercise.total_volume = updatedExercise.distance_meters || 0;
      } else if (updatedExercise.exercise_type === "skill") {
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
    }
  };

  const getExerciseColor = (type: ExerciseType) => {
    switch (type) {
      case "strength": return "bg-blue-500/20 border-blue-500/50 text-blue-400";
      case "cardio": return "bg-green-500/20 border-green-500/50 text-green-400";
      case "skill": return "bg-orange-500/20 border-orange-500/50 text-orange-400";
    }
  };

  const formatVolume = (exercise: Exercise) => {
    if (exercise.exercise_type === "strength") {
      const total = (exercise.sets || 0) * (exercise.reps || 0) * (exercise.weight_kg || 0);
      return `${total.toLocaleString()} kg total`;
    } else if (exercise.exercise_type === "cardio") {
      const meters = exercise.distance_meters || 0;
      if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} km`;
      }
      return `${meters} m`;
    } else {
      return `${exercise.repetitions || 0} repetisi`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Detail Latihan</Label>
        <div className="flex gap-2">
          <Select value={newExerciseType} onValueChange={(v) => setNewExerciseType(v as ExerciseType)}>
            <SelectTrigger className="w-32 h-8 bg-slate-950 border-slate-800 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="skill">Skill</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={addExercise}>
            <Plus className="w-4 h-4 mr-1" />
            Tambah
          </Button>
        </div>
      </div>

      {exercises.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-lg">
          Belum ada latihan. Klik "Tambah" untuk menambahkan detail latihan.
        </p>
      )}

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {exercises.map((exercise, index) => (
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

              {/* Cardio Exercise Fields */}
              {exercise.exercise_type === "cardio" && (
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

              {/* Skill Exercise Fields */}
              {exercise.exercise_type === "skill" && (
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
              )}

              {/* Volume Summary */}
              {exercise.exercise_name && (
                <div className="text-xs text-slate-400 bg-slate-950 rounded px-2 py-1">
                  Total: <span className="font-semibold text-white">{formatVolume(exercise)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Summary */}
      {exercises.length > 0 && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Ringkasan Sesi:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
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
              <span className="text-slate-500">Skill:</span>
              <span className="ml-1 font-semibold text-orange-400">
                {exercises
                  .filter(e => e.exercise_type === "skill")
                  .reduce((sum, e) => sum + (e.repetitions || 0), 0)} rep
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
