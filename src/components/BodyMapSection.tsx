import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BodyMapSVG, DetailedIntensities } from "@/components/BodyMapSVG";
import { calculateDetailedBodyDistribution } from "@/lib/exerciseBodyMapping";
import { Dumbbell, PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SessionExercise {
  exercise_name: string;
  exercise_type: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
}

interface BodyMapSectionProps {
  exercises: SessionExercise[];
  /** Total load_final sesi pada periode terpilih, dipakai untuk indikator intensitas per otot */
  totalLoad?: number;
  /** Label periode yang sedang ditampilkan */
  periodLabel?: string;
}

const intensityLabel = (ratio: number) => {
  if (ratio >= 0.75) return { label: "Sangat Tinggi", cls: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (ratio >= 0.5) return { label: "Tinggi", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
  if (ratio >= 0.25) return { label: "Sedang", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" };
  return { label: "Rendah", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
};


const REGION_META: { key: keyof DetailedIntensities; label: string; color: string; hex: string }[] = [
  { key: "chest", hex: "#ef4444", label: "Chest", color: "bg-red-500" },
  { key: "back", hex: "#3b82f6", label: "Back", color: "bg-blue-500" },
  { key: "shoulders", hex: "#f97316", label: "Shoulders", color: "bg-orange-500" },
  { key: "arms", hex: "#a855f7", label: "Arms", color: "bg-purple-500" },
  { key: "core", hex: "#eab308", label: "Core", color: "bg-yellow-500" },
  { key: "quads", hex: "#10b981", label: "Quads", color: "bg-emerald-500" },
  { key: "hamstrings", hex: "#06b6d4", label: "Hamstrings", color: "bg-cyan-500" },
  { key: "calves", hex: "#ec4899", label: "Calves", color: "bg-pink-500" },
];

export function BodyMapSection({ exercises, totalLoad = 0, periodLabel }: BodyMapSectionProps) {
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

  const donutData = useMemo(
    () =>
      REGION_META
        .map(r => ({ name: r.label, value: Math.round(dist[r.key]), hex: r.hex }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [dist]
  );

  const dominant = donutData[0];

  if (dist.total === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          Body Map — Distribusi Strength
        </CardTitle>
        <CardDescription>
          Visualisasi area otot yang dilatih
          {periodLabel && ` — ${periodLabel}`}
          {totalLoad > 0 && ` — total load periode ini: ${Math.round(totalLoad).toLocaleString()} AU`}
        </CardDescription>
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
              const ratio = intensities[r.key];
              const ind = intensityLabel(ratio);
              const regionLoad = totalLoad > 0 && dist.total > 0 ? (dist[r.key] / dist.total) * totalLoad : 0;
              return (
                <div key={r.key} className="space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-medium">{r.label}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${ind.cls}`}>{ind.label}</Badge>
                      <Badge variant="secondary">{pct}%</Badge>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${r.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Volume: {Math.round(dist[r.key]).toLocaleString()}
                    {regionLoad > 0 && ` · Load: ${Math.round(regionLoad).toLocaleString()} AU`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <PieIcon className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Dominasi Otot</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {dominant
              ? `Latihan pada periode ini paling didominasi oleh ${dominant.name} (${Math.round((dominant.value / dist.total) * 100)}% dari total volume).`
              : "Belum ada data volume."}
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="80%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.hex} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    `${Math.round(value).toLocaleString()} (${Math.round((value / dist.total) * 100)}%)`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
