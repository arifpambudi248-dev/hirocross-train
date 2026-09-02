import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine,
} from "recharts";
import { ArrowLeft, Activity, Heart, Dumbbell, AlertTriangle, Zap } from "lucide-react";
import {
  aggregateDailyLoad, computeFitnessFatigueForm, computeACWR,
} from "@/lib/trainingLoad";

type Profile = { id: string; athlete_name: string; avatar_url: string | null };

const RANGES: Record<string, { label: string; days: number }> = {
  "7": { label: "7 hari terakhir", days: 7 },
  "28": { label: "4 minggu (mesocycle)", days: 28 },
  "90": { label: "3 bulan", days: 90 },
  "180": { label: "6 bulan", days: 180 },
};

const CoachAthleteDetail = () => {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [range, setRange] = useState("28");
  const [sessions, setSessions] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any[]>([]);
  const [vbtSets, setVbtSets] = useState<any[]>([]);
  const [vbtExercise, setVbtExercise] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!athleteId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: link } = await supabase
        .from("coach_athletes")
        .select("id")
        .eq("coach_id", user.id)
        .eq("athlete_id", athleteId)
        .eq("status", "accepted")
        .maybeSingle();
      setAuthorized(!!link);
      if (!link) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("id, athlete_name, avatar_url")
        .eq("id", athleteId)
        .maybeSingle();
      setProfile(p);
    })();
  }, [athleteId]);

  useEffect(() => {
    if (!authorized || !athleteId) return;
    loadData();
  }, [authorized, athleteId, range]);

  async function loadData() {
    setLoading(true);
    const days = RANGES[range].days;
    // Pull extra 28 days before window so CTL warm-up is meaningful
    const startDate = format(subDays(new Date(), days + 28), "yyyy-MM-dd");

    const { data: s } = await supabase
      .from("training_sessions")
      .select("date, load_final, load_auto, is_assigned, rpe, session_name")
      .eq("user_id", athleteId)
      .gte("date", startDate)
      .order("date", { ascending: true });

    const { data: r } = await supabase
      .from("readiness_logs")
      .select("date, readiness_score, readiness_zone, vj, rhr")
      .eq("athlete_id", athleteId)
      .gte("date", startDate)
      .order("date", { ascending: true });

    const { data: v } = await supabase
      .from("vbt_sets")
      .select("id, date, exercise, load_kg, method, reps, mean_velocity, best_velocity, velocity_loss_pct, zone, est_1rm")
      .eq("athlete_id", athleteId)
      .gte("date", startDate)
      .order("date", { ascending: true });

    setSessions(s || []);
    setReadiness(r || []);
    setVbtSets(v || []);
    setLoading(false);
  }

  const cutoffDate = useMemo(
    () => format(subDays(new Date(), RANGES[range].days), "yyyy-MM-dd"),
    [range]
  );

  // Planned vs Actual: planned = is_assigned true; actual = is_assigned false/null
  const plannedActual = useMemo(() => {
    const map = new Map<string, { date: string; planned: number; actual: number }>();
    for (const s of sessions) {
      if (s.date < cutoffDate) continue;
      const entry = map.get(s.date) || { date: s.date, planned: 0, actual: 0 };
      const load = s.load_final ?? s.load_auto ?? 0;
      if (s.is_assigned) entry.planned += load;
      else entry.actual += load;
      map.set(s.date, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, cutoffDate]);

  const fff = useMemo(() => {
    const actualSessions = sessions
      .filter((s) => !s.is_assigned)
      .map((s) => ({ date: s.date, load_final: s.load_final ?? s.load_auto ?? 0 }));
    const daily = aggregateDailyLoad(actualSessions);
    const series = computeFitnessFatigueForm({ dailyLoads: daily });
    return series.filter((p) => p.date >= cutoffDate).map((p) => ({
      ...p,
      fitness: Math.round(p.fitness * 10) / 10,
      fatigue: Math.round(p.fatigue * 10) / 10,
      form: Math.round(p.form * 10) / 10,
    }));
  }, [sessions, cutoffDate]);

  const acwr = useMemo(() => {
    const actualSessions = sessions
      .filter((s) => !s.is_assigned)
      .map((s) => ({ date: s.date, load_final: s.load_final ?? s.load_auto ?? 0 }));
    const daily = aggregateDailyLoad(actualSessions);
    const series = computeACWR(daily);
    return series.filter((p) => p.date >= cutoffDate).map((p) => ({
      date: p.date,
      ratio: Math.round(p.ratio * 100) / 100,
    }));
  }, [sessions, cutoffDate]);

  const readinessFiltered = useMemo(
    () => readiness.filter((r) => r.date >= cutoffDate),
    [readiness, cutoffDate]
  );

  const vbtFiltered = useMemo(
    () => vbtSets.filter((v) => v.date >= cutoffDate && (vbtExercise === "all" || v.exercise === vbtExercise)),
    [vbtSets, cutoffDate, vbtExercise]
  );

  const vbtExercises = useMemo(
    () => Array.from(new Set(vbtSets.map((v) => v.exercise))).sort(),
    [vbtSets]
  );

  const vbtTrend = useMemo(
    () =>
      vbtFiltered.map((v) => ({
        date: v.date,
        mean_velocity: v.mean_velocity ? Math.round(v.mean_velocity * 100) / 100 : null,
        best_velocity: v.best_velocity ? Math.round(v.best_velocity * 100) / 100 : null,
        est_1rm: v.est_1rm ?? null,
      })),
    [vbtFiltered]
  );



  const totals = useMemo(() => {
    const planned = plannedActual.reduce((s, d) => s + d.planned, 0);
    const actual = plannedActual.reduce((s, d) => s + d.actual, 0);
    const compliance = planned > 0 ? Math.round((actual / planned) * 100) : 0;
    const avgReadiness = readinessFiltered.length
      ? Math.round(readinessFiltered.reduce((s, r) => s + (r.readiness_score || 0), 0) / readinessFiltered.length)
      : 0;
    const latestACWR = acwr.length ? acwr[acwr.length - 1].ratio : 0;
    return { planned, actual, compliance, avgReadiness, latestACWR };
  }, [plannedActual, readinessFiltered, acwr]);

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background pb-bottom-nav">
        <Navigation />
        <div className="container mx-auto p-6">
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Anda tidak memiliki akses ke atlet ini.
          </CardContent></Card>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Dashboard
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{profile?.athlete_name?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{profile?.athlete_name || "Atlet"}</h1>
              <p className="text-xs text-muted-foreground">Detail performa & beban latihan</p>
            </div>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RANGES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Planned Load</p>
            <p className="text-2xl font-bold">{totals.planned.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actual Load</p>
            <p className="text-2xl font-bold">{totals.actual.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Kepatuhan</p>
            <p className="text-2xl font-bold">{totals.compliance}%</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ACWR Terkini</p>
            <p className={`text-2xl font-bold ${
              totals.latestACWR > 1.5 || totals.latestACWR < 0.8 ? "text-red-500" :
              totals.latestACWR > 1.3 ? "text-yellow-500" : "text-green-500"
            }`}>{totals.latestACWR.toFixed(2)}</p>
          </CardContent></Card>
        </div>

        {/* Planned vs Actual */}
        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" /> Planned vs Actual Load
          </CardTitle></CardHeader>
          <CardContent>
            {plannedActual.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data pada periode ini</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={plannedActual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "d/M")} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="planned" name="Planned" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* CTL / ATL / TSB */}
        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Fitness (CTL) · Fatigue (ATL) · Form (TSB)
          </CardTitle></CardHeader>
          <CardContent>
            {fff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada cukup data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={fff}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "d/M")} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
                  <Line type="monotone" dataKey="fitness" name="Fitness (CTL)" stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="fatigue" name="Fatigue (ATL)" stroke="hsl(0 84% 60%)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="form" name="Form (TSB)" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ACWR */}
        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> ACWR (Acute:Chronic Workload Ratio)
          </CardTitle></CardHeader>
          <CardContent>
            {acwr.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={acwr}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "d/M")} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 2]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <ReferenceArea y1={0.8} y2={1.3} fill="hsl(142 71% 45%)" fillOpacity={0.08} />
                  <ReferenceLine y={1.5} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" label={{ value: "Danger", fontSize: 10, fill: "hsl(0 84% 60%)" }} />
                  <ReferenceLine y={0.8} stroke="hsl(45 93% 47%)" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="ratio" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              Sweet spot 0.8–1.3. Di atas 1.5 = risiko cedera meningkat.
            </p>
          </CardContent>
        </Card>

        {/* Daily Readiness Summary */}
        <Card className="mb-4">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" /> Ringkasan Kesiapan Harian
          </CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-muted-foreground">Rata-rata</p><p className="text-xl font-bold">{totals.avgReadiness}%</p></div>
              <div><p className="text-xs text-muted-foreground">Catatan</p><p className="text-xl font-bold">{readinessFiltered.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Terbaru</p>
                <p className="text-xl font-bold">{readinessFiltered.length ? `${readinessFiltered[readinessFiltered.length - 1].readiness_score}%` : "-"}</p>
              </div>
            </div>
            {readinessFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada log readiness</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={readinessFiltered}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "d/M")} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <ReferenceLine y={70} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" />
                    <ReferenceLine y={40} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="readiness_score" name="Readiness" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                  {[...readinessFiltered].reverse().slice(0, 8).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs border-b border-border py-1">
                      <span className="text-muted-foreground">{format(parseISO(r.date), "EEE, d MMM", { locale: idLocale })}</span>
                      <div className="flex items-center gap-2">
                        <span>VJ {r.vj} · RHR {r.rhr}</span>
                        <Badge variant="outline" className={`capitalize ${
                          r.readiness_zone === "prime" ? "border-green-500 text-green-500" :
                          r.readiness_zone === "moderate" ? "border-yellow-500 text-yellow-500" :
                          "border-red-500 text-red-500"
                        }`}>{r.readiness_score}% · {r.readiness_zone}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* VBT — riwayat & tren kecepatan */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" /> VBT — Riwayat & Tren Kecepatan
              </CardTitle>
              {vbtExercises.length > 0 && (
                <Select value={vbtExercise} onValueChange={setVbtExercise}>
                  <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua latihan</SelectItem>
                    {vbtExercises.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {vbtFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data VBT pada periode ini</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={vbtTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "d/M")} />
                    <YAxis yAxisId="v" tick={{ fontSize: 10 }} unit=" m/s" />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} unit=" kg" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="v" type="monotone" dataKey="mean_velocity" name="Mean Velocity (m/s)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    <Line yAxisId="v" type="monotone" dataKey="best_velocity" name="Best Velocity (m/s)" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} connectNulls />
                    <Line yAxisId="r" type="monotone" dataKey="est_1rm" name="Estimasi 1RM (kg)" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                  {[...vbtFiltered].reverse().map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 text-xs border-b border-border py-1.5">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{v.exercise}</p>
                        <p className="text-muted-foreground">
                          {format(parseISO(v.date), "d MMM yyyy", { locale: idLocale })} · {v.load_kg ? `${v.load_kg} kg` : "BW"} · {v.reps} rep · {v.method}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">
                          {v.mean_velocity ? `${v.mean_velocity.toFixed(2)} m/s` : "-"}
                          {v.velocity_loss_pct != null && ` · VL ${v.velocity_loss_pct}%`}
                          {v.est_1rm ? ` · 1RM ${v.est_1rm} kg` : ""}
                        </span>
                        {v.zone && <Badge variant="outline" className="capitalize">{v.zone.replace(/_/g, " ")}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default CoachAthleteDetail;
