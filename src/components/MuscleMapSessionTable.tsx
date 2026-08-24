import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListOrdered } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { calculateDetailedBodyDistribution } from "@/lib/exerciseBodyMapping";

export interface MuscleMapSession {
  id: string;
  date: string;
  session_name: string | null;
  session_type?: string | null;
  load_final?: number | null;
  duration_min?: number | null;
  rpe?: number | null;
  exercises?: {
    exercise_name: string;
    exercise_type: string;
    sets: number | null;
    reps: number | null;
    weight_kg: number | null;
  }[];
}

const REGION_LABEL: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

const REGION_KEYS = Object.keys(REGION_LABEL) as (keyof typeof REGION_LABEL)[];

function dominantMuscle(exercises: MuscleMapSession["exercises"]) {
  const strength = (exercises || []).filter((e) => e.exercise_type === "strength");
  if (strength.length === 0) return null;
  const dist = calculateDetailedBodyDistribution(strength);
  if (dist.total === 0) return null;
  let best = REGION_KEYS[0];
  for (const k of REGION_KEYS) {
    if ((dist as never as Record<string, number>)[k] > (dist as never as Record<string, number>)[best]) best = k;
  }
  const value = (dist as never as Record<string, number>)[best];
  return { label: REGION_LABEL[best], pct: Math.round((value / dist.total) * 100) };
}

interface Props {
  sessions: MuscleMapSession[];
  periodLabel?: string;
}

export function MuscleMapSessionTable({ sessions, periodLabel }: Props) {
  const rows = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .map((s) => ({ ...s, dominant: dominantMuscle(s.exercises) })),
    [sessions]
  );

  const totalLoad = rows.reduce((sum, r) => sum + (r.load_final || 0), 0);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-primary" />
          Daftar Latihan Periode Ini
        </CardTitle>
        <CardDescription>
          {rows.length} sesi{periodLabel ? ` — ${periodLabel}` : ""}
          {totalLoad > 0 && ` — total load ${Math.round(totalLoad).toLocaleString()} AU`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada sesi latihan pada periode ini.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 sm:hidden">
              {rows.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{r.session_name || "Sesi Latihan"}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {Math.round(r.load_final || 0).toLocaleString()} AU
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.date), "EEE, d MMM yyyy", { locale: localeId })}
                    {r.duration_min ? ` · ${r.duration_min} min` : ""}
                    {r.rpe ? ` · RPE ${r.rpe}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Otot dominan:{" "}
                    {r.dominant ? (
                      <span className="text-foreground font-medium">
                        {r.dominant.label} ({r.dominant.pct}%)
                      </span>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-3 font-medium">Tanggal</th>
                    <th className="text-left py-2 pr-3 font-medium">Sesi</th>
                    <th className="text-left py-2 pr-3 font-medium">Tipe</th>
                    <th className="text-right py-2 pr-3 font-medium">Durasi</th>
                    <th className="text-right py-2 pr-3 font-medium">RPE</th>
                    <th className="text-right py-2 pr-3 font-medium">Load (AU)</th>
                    <th className="text-left py-2 font-medium">Otot Dominan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {format(new Date(r.date), "d MMM yyyy", { locale: localeId })}
                      </td>
                      <td className="py-2 pr-3">{r.session_name || "Sesi Latihan"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.session_type || "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.duration_min ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.rpe ?? "—"}</td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {Math.round(r.load_final || 0).toLocaleString()}
                      </td>
                      <td className="py-2">
                        {r.dominant ? (
                          <Badge variant="outline" className="text-[10px]">
                            {r.dominant.label} · {r.dominant.pct}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
