import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BodyMapSVG } from "@/components/BodyMapSVG";
import { calculateBodyDistribution, classifyExercise } from "@/lib/exerciseBodyMapping";
import { Dumbbell, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

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

export function BodyMapSection({ exercises }: BodyMapSectionProps) {
  const strengthExercises = useMemo(
    () => exercises.filter((ex) => ex.exercise_type === "strength"),
    [exercises]
  );

  const distribution = useMemo(
    () => calculateBodyDistribution(strengthExercises),
    [strengthExercises]
  );

  const maxVolume = Math.max(distribution.upper, distribution.lower, distribution.core, 1);
  const upperIntensity = distribution.total > 0 ? distribution.upper / maxVolume : 0;
  const lowerIntensity = distribution.total > 0 ? distribution.lower / maxVolume : 0;
  const coreIntensity = distribution.total > 0 ? distribution.core / maxVolume : 0;

  if (distribution.total === 0) return null;

  const regions = [
    { label: "Upper Body", value: distribution.upper, total: distribution.total, icon: ArrowUp, color: "text-orange-500", barColor: "bg-orange-500" },
    { label: "Core", value: distribution.core, total: distribution.total, icon: Dumbbell, color: "text-yellow-500", barColor: "bg-yellow-500" },
    { label: "Lower Body", value: distribution.lower, total: distribution.total, icon: ArrowDown, color: "text-blue-500", barColor: "bg-blue-500" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          Body Map — Distribusi Strength
        </CardTitle>
        <CardDescription>Visualisasi area tubuh yang dilatih bulan ini</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-center">
            <BodyMapSVG
              upperIntensity={upperIntensity}
              lowerIntensity={lowerIntensity}
              coreIntensity={coreIntensity}
            />
          </div>
          <div className="space-y-4 flex flex-col justify-center">
            {regions.map((r) => {
              const pct = r.total > 0 ? Math.round((r.value / r.total) * 100) : 0;
              const Icon = r.icon;
              return (
                <div key={r.label} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${r.color}`} />
                      <span className="text-sm font-medium">{r.label}</span>
                    </div>
                    <Badge variant="secondary">{pct}%</Badge>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${r.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Volume: {Math.round(r.value).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
