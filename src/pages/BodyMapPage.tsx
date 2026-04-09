import { useState, useEffect, useMemo } from "react";
import { SidebarNavigation } from "@/components/SidebarNavigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BodyMapSVG, DetailedIntensities } from "@/components/BodyMapSVG";
import { calculateDetailedBodyDistribution, classifyExercise } from "@/lib/exerciseBodyMapping";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Dumbbell, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

type TimeRange = "today" | "week" | "month";

export default function BodyMapPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");

  useEffect(() => {
    checkRoleAndInit();
  }, []);

  useEffect(() => {
    if (selectedAthleteId || !isCoach) {
      fetchExercises();
    }
  }, [timeRange, selectedAthleteId, isCoach]);

  const checkRoleAndInit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = roleData?.map(r => r.role) || [];
    const coach = roles.includes("coach");
    setIsCoach(coach);

    if (coach) {
      const { data: ca } = await supabase
        .from("coach_athletes")
        .select("athlete_id")
        .eq("coach_id", user.id)
        .eq("status", "accepted");

      if (ca && ca.length > 0) {
        const ids = ca.map(c => c.athlete_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, athlete_name")
          .in("id", ids);

        const list = (profiles || []).map(p => ({ id: p.id, name: p.athlete_name }));
        setAthletes(list);
        if (list.length > 0) setSelectedAthleteId(list[0].id);
      }
    } else {
      setSelectedAthleteId(user.id);
    }
  };

  const fetchExercises = async () => {
    setLoading(true);
    const today = new Date();
    let startDate: string;

    if (timeRange === "today") {
      startDate = format(today, "yyyy-MM-dd");
    } else if (timeRange === "week") {
      startDate = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    } else {
      startDate = format(subDays(today, 30), "yyyy-MM-dd");
    }

    const endDate = format(today, "yyyy-MM-dd");
    const userId = selectedAthleteId;
    if (!userId) { setLoading(false); return; }

    // Get sessions in date range for this athlete
    const { data: sessions } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (!sessions || sessions.length === 0) {
      setExercises([]);
      setLoading(false);
      return;
    }

    const sessionIds = sessions.map(s => s.id);
    const { data: exData } = await supabase
      .from("session_exercises")
      .select("exercise_name, exercise_type, sets, reps, weight_kg")
      .in("session_id", sessionIds)
      .eq("exercise_type", "strength");

    setExercises(exData || []);
    setLoading(false);
  };

  const dist = useMemo(() => calculateDetailedBodyDistribution(exercises), [exercises]);

  const REGIONS: (keyof DetailedIntensities)[] = ["chest", "back", "shoulders", "arms", "core", "quads", "hamstrings", "calves"];
  const maxVolume = useMemo(() => Math.max(...REGIONS.map(r => dist[r]), 1), [dist]);
  const intensities: DetailedIntensities = useMemo(() => {
    const result = {} as DetailedIntensities;
    for (const r of REGIONS) result[r] = dist.total > 0 ? dist[r] / maxVolume : 0;
    return result;
  }, [dist, maxVolume]);

  const timeRangeLabel = timeRange === "today" ? "Hari Ini" : timeRange === "week" ? "Minggu Ini" : "30 Hari";

  // Group exercises by body region for the list
  const exercisesByRegion = useMemo(() => {
    const grouped: Record<string, { name: string; sets: number; reps: number; weight: number }[]> = {
      upper: [], lower: [], core: []
    };
    for (const ex of exercises) {
      const region = classifyExercise(ex.exercise_name);
      grouped[region].push({
        name: ex.exercise_name,
        sets: ex.sets || 0,
        reps: ex.reps || 0,
        weight: ex.weight_kg || 0,
      });
    }
    return grouped;
  }, [exercises]);

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation />
      <main className="flex-1 p-4 md:p-6 pb-20 sm:pb-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-primary" />
                Body Map
              </h1>
              <p className="text-sm text-muted-foreground">
                Visualisasi distribusi latihan strength pada tubuh
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isCoach && athletes.length > 0 && (
                <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Pilih Atlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">30 Hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dist.total === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">
                  Belum ada data latihan strength untuk {timeRangeLabel.toLowerCase()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Buat sesi latihan dengan exercise bertipe "strength" terlebih dahulu
                </p>
                {/* Debug preview */}
                <div className="mt-6 max-w-[340px] mx-auto">
                  <BodyMapSVG intensities={{ chest: 0.9, back: 0.7, shoulders: 0.8, arms: 0.6, core: 0.5, quads: 0.85, hamstrings: 0.65, calves: 0.4 }} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Peta Tubuh — {timeRangeLabel}</CardTitle>
                  <CardDescription>
                    Semakin terang warna, semakin banyak volume latihan di area tersebut
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BodyMapSVG intensities={intensities} />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Distribusi Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {([
                      { key: "chest" as const, label: "Chest", color: "bg-red-500" },
                      { key: "back" as const, label: "Back", color: "bg-blue-500" },
                      { key: "shoulders" as const, label: "Shoulders", color: "bg-orange-500" },
                      { key: "arms" as const, label: "Arms", color: "bg-purple-500" },
                      { key: "core" as const, label: "Core", color: "bg-yellow-500" },
                      { key: "quads" as const, label: "Quads", color: "bg-emerald-500" },
                      { key: "hamstrings" as const, label: "Hamstrings", color: "bg-cyan-500" },
                      { key: "calves" as const, label: "Calves", color: "bg-pink-500" },
                    ]).map(r => {
                      const pct = dist.total > 0 ? Math.round((dist[r.key] / dist.total) * 100) : 0;
                      if (dist[r.key] === 0) return null;
                      return (
                        <div key={r.key} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{r.label}</span>
                            <Badge variant="secondary">{pct}%</Badge>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${r.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">Volume: {Math.round(dist[r.key]).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Detail Latihan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(exercisesByRegion).map(([region, exList]) => {
                      if (exList.length === 0) return null;
                      return (
                        <div key={region}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-muted-foreground">
                            {region}
                          </p>
                          {exList.map((ex, i) => (
                            <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                              <span className="text-foreground">{ex.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {ex.sets}×{ex.reps} {ex.weight > 0 && `@ ${ex.weight}kg`}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
