import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BodyMapSVG, DetailedIntensities } from "@/components/BodyMapSVG";
import { calculateDetailedBodyDistribution } from "@/lib/exerciseBodyMapping";
import { Dumbbell } from "lucide-react";

interface SessionExercise {
  exercise_name: string;
  exercise_type: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
}

interface BodyMapSectionProps {
  exercises: SessionExercise[];
}

const REGION_META: { key: keyof DetailedIntensities; label: string; color: string }[] = [
  { key: "chest", label: "Chest", color: "bg-red-500" },
  { key: "back", label: "Back", color: "bg-blue-500" },
  { key: "shoulders", label: "Shoulders", color: "bg-orange-500" },
  { key: "arms", label: "Arms", color: "bg-purple-500" },
  { key: "core", label: "Core", color: "bg-yellow-500" },
  { key: "quads", label: "Quads", color: "bg-emerald-500" },
  { key: "hamstrings", label: "Hamstrings", color: "bg-cyan-500" },
  { key: "calves", label: "Calves", color: "bg-pink-500" },
];

export function BodyMapSection({ exercises }: BodyMapSectionProps) {
  const strengthExercises = useMemo(
    () => exercises.filter((ex) => ex.exercise_type === "strength"),
    [exercises]
  );

  const dist = useMemo(
    () => calculateDetailedBodyDistribution(strengthExercises),
    [strengthExercises]
  );

  const maxVolume = useMemo(() => {
    const vals = REGION_META.map(r => dist[r.key]);
    return Math.max(...vals, 1);
  }, [dist]);

  const intensities: DetailedIntensities = useMemo(() => {
    const result = {} as DetailedIntensities;
    for (const r of REGION_META) {
      result[r.key] = dist.total > 0 ? dist[r.key] / maxVolume : 0;
    }
    return result;
  }, [dist, maxVolume]);

  if (dist.total === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          Body Map — Distribusi Strength
        </CardTitle>
        <CardDescription>Visualisasi area otot yang dilatih bulan ini</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-center">
            <BodyMapSVG intensities={intensities} />
          </div>
          <div className="space-y-3 flex flex-col justify-center">
            {REGION_META.map((r) => {
              const pct = dist.total > 0 ? Math.round((dist[r.key] / dist.total) * 100) : 0;
              if (dist[r.key] === 0) return null;
              return (
                <div key={r.key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{r.label}</span>
                    <Badge variant="secondary">{pct}%</Badge>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${r.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Volume: {Math.round(dist[r.key]).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
