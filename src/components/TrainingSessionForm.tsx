import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Flame, Dumbbell, Snowflake, Sparkles, Pencil } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export type ExerciseType = "strength" | "endurance" | "skill" | "speed" | "technique" | "tactics";

export type MainExercise = {
  id: string;
  exercise_name: string;
  exercise_type: ExerciseType;
  sets?: number;
  reps?: number;
  weight_or_distance?: number;
  use_vbt?: boolean;
  target_velocity_min?: number;
  target_velocity_max?: number;
};

export type SessionFormData = {
  date: string;
  sessionType: string;
  isCompleted: boolean;
  warmupNotes: string;
  mainExercises: MainExercise[];
  cooldownNotes: string;
  recoveryNotes: string;
  durationMinutes: number;
  rpe: number;
  notes: string;
};

interface TrainingSessionFormProps {
  selectedDate: string;
  initialData?: Partial<SessionFormData>;
  onSubmit: (data: SessionFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const SESSION_TYPES = [
  { value: "rest", label: "REST" },
  { value: "strength", label: "STRENGTH" },
  { value: "endurance", label: "ENDURANCE" },
  { value: "skill", label: "SKILL" },
  { value: "speed", label: "SPEED" },
  { value: "technique", label: "TEKNIK" },
  { value: "tactics", label: "TAKTIK" },
  { value: "mixed", label: "CAMPURAN" },
];

const EXERCISE_TYPE_OPTIONS = [
  { value: "strength", label: "Kuat (kg)" },
  { value: "endurance", label: "Endurance (m)" },
  { value: "skill", label: "Skill" },
  { value: "speed", label: "Speed (m)" },
  { value: "technique", label: "Teknik" },
  { value: "tactics", label: "Taktik" },
];

export function TrainingSessionForm({ selectedDate, initialData, onSubmit, onCancel, isEditing = false }: TrainingSessionFormProps) {
  const [formData, setFormData] = useState<SessionFormData>({
    date: selectedDate,
    sessionType: initialData?.sessionType || "rest",
    isCompleted: initialData?.isCompleted || false,
    warmupNotes: initialData?.warmupNotes || "",
    mainExercises: initialData?.mainExercises || [],
    cooldownNotes: initialData?.cooldownNotes || "",
    recoveryNotes: initialData?.recoveryNotes || "",
    durationMinutes: initialData?.durationMinutes || 60,
    rpe: initialData?.rpe || 5,
    notes: initialData?.notes || "",
  });

  // Format header date
  const dateObj = new Date(selectedDate);
  const weekNumber = Math.ceil((dateObj.getDate() + new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getDay()) / 7);
  const dayName = format(dateObj, "EEEE", { locale: localeId });
  const dayDate = format(dateObj, "d MMM", { locale: localeId });
  const headerTitle = `W${weekNumber} ${dayName} (${dayDate})`;

  const addMainExercise = () => {
    const newExercise: MainExercise = {
      id: `temp-${Date.now()}`,
      exercise_name: "",
      exercise_type: "strength",
      sets: 3,
      reps: 10,
      weight_or_distance: 0,
    };
    setFormData(prev => ({
      ...prev,
      mainExercises: [...prev.mainExercises, newExercise]
    }));
  };

  const updateMainExercise = (id: string, updates: Partial<MainExercise>) => {
    setFormData(prev => ({
      ...prev,
      mainExercises: prev.mainExercises.map(ex =>
        ex.id === id ? { ...ex, ...updates } : ex
      )
    }));
  };

  const removeMainExercise = (id: string) => {
    setFormData(prev => ({
      ...prev,
      mainExercises: prev.mainExercises.filter(ex => ex.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with date, checkbox and session type */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          {isEditing && <Pencil className="w-4 h-4 text-muted-foreground" />}
          <h2 className="text-xl font-bold text-foreground">{headerTitle}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-completed"
              checked={formData.isCompleted}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isCompleted: !!checked }))}
            />
            <Label htmlFor="is-completed" className="text-sm font-medium text-primary cursor-pointer">
              SELESAI
            </Label>
          </div>
          <Select
            value={formData.sessionType}
            onValueChange={(val) => setFormData(prev => ({ ...prev, sessionType: val }))}
          >
            <SelectTrigger className="w-36 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Warm Up Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          <Label className="text-sm font-semibold text-amber-500 uppercase">Warm Up</Label>
        </div>
        <Textarea
          placeholder="Contoh: Jogging 10 menit..."
          value={formData.warmupNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, warmupNotes: e.target.value }))}
          className="min-h-[80px] bg-background border-border resize-y"
        />
      </div>

      {/* Main Set Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-primary uppercase">Main Set</Label>
        </div>
        
        {/* Exercise List */}
        <div className="space-y-3">
          {formData.mainExercises.map((exercise) => (
            <div key={exercise.id} className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Nama Latihan"
                  value={exercise.exercise_name}
                  onChange={(e) => updateMainExercise(exercise.id, { exercise_name: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <Select
                value={exercise.exercise_type}
                onValueChange={(val) => updateMainExercise(exercise.id, { exercise_type: val as ExerciseType })}
              >
                <SelectTrigger className="w-36 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Set"
                value={exercise.sets || ""}
                onChange={(e) => updateMainExercise(exercise.id, { sets: e.target.value ? Number(e.target.value) : undefined })}
                className="w-16 bg-background border-border text-center"
              />
              <Input
                type="number"
                placeholder="Rep"
                value={exercise.reps || ""}
                onChange={(e) => updateMainExercise(exercise.id, { reps: e.target.value ? Number(e.target.value) : undefined })}
                className="w-16 bg-background border-border text-center"
              />
              <Input
                type="number"
                placeholder="Beban/Jarak"
                value={exercise.weight_or_distance || ""}
                onChange={(e) => updateMainExercise(exercise.id, { weight_or_distance: e.target.value ? Number(e.target.value) : undefined })}
                className="w-24 bg-background border-border text-center"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMainExercise(exercise.id)}
                className="h-9 w-9 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              </div>

              {/* VBT target kecepatan (khusus latihan kekuatan) */}
              {exercise.exercise_type === "strength" && (
                <div className="flex flex-wrap items-center gap-3 pl-1 pt-1 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`vbt-${exercise.id}`}
                      checked={!!exercise.use_vbt}
                      onCheckedChange={(checked) => updateMainExercise(exercise.id, { use_vbt: !!checked })}
                    />
                    <Label htmlFor={`vbt-${exercise.id}`} className="text-xs font-medium cursor-pointer">
                      Pakai VBT
                    </Label>
                  </div>
                  {exercise.use_vbt && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Target kecepatan (m/s)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Min"
                        value={exercise.target_velocity_min ?? ""}
                        onChange={(e) =>
                          updateMainExercise(exercise.id, {
                            target_velocity_min: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-20 bg-background border-border text-center"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Maks"
                        value={exercise.target_velocity_max ?? ""}
                        onChange={(e) =>
                          updateMainExercise(exercise.id, {
                            target_velocity_max: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-20 bg-background border-border text-center"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={addMainExercise}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          Tambah Item
        </Button>
      </div>

      {/* Cooling Down Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Snowflake className="w-4 h-4 text-cyan-500" />
          <Label className="text-sm font-semibold text-cyan-500 uppercase">Cooling Down</Label>
        </div>
        <Textarea
          placeholder="Contoh: Static stretching..."
          value={formData.cooldownNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, cooldownNotes: e.target.value }))}
          className="min-h-[80px] bg-background border-border resize-y"
        />
      </div>

      {/* Recovery & Notes Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <Label className="text-sm font-semibold text-emerald-500 uppercase">Recovery & Notes</Label>
        </div>
        <Textarea
          placeholder="Catatan recovery, nutrisi, istirahat..."
          value={formData.recoveryNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, recoveryNotes: e.target.value }))}
          className="min-h-[80px] bg-background border-emerald-500/30 resize-y"
        />
      </div>

      {/* Duration, RPE, and Notes Section */}
      <div className="pt-4 border-t border-border space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-medium">Durasi (menit)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.durationMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rpe" className="text-sm font-medium">RPE (1-10)</Label>
            <Input
              id="rpe"
              type="number"
              min="1"
              max="10"
              value={formData.rpe}
              onChange={(e) => setFormData(prev => ({ ...prev, rpe: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="additional-notes" className="text-sm font-medium">Catatan Tambahan</Label>
          <Textarea
            id="additional-notes"
            placeholder="Catatan tambahan untuk sesi ini..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="bg-background border-border resize-y"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Batal
        </Button>
        <Button type="submit" className="flex-1">
          {isEditing ? "Update Sesi" : "Simpan Sesi"}
        </Button>
      </div>
    </form>
  );
}
