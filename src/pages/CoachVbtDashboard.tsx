import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Zap, Gauge, Target } from "lucide-react";
import { classifyExercise, type BodyRegion } from "@/lib/exerciseBodyMapping";

const REGION_LABEL: Record<BodyRegion, string> = {
  chest: "Dada",
  back: "Punggung",
  shoulders: "Bahu",
  arms: "Lengan",
  core: "Core",
  quads: "Paha Depan",
  hamstrings: "Paha Belakang",
  calves: "Betis",
};

const REGION_COLOR: Record<BodyRegion, string> = {
  chest: "hsl(0 75% 55%)",
  back: "hsl(210 80% 55%)",
  shoulders: "hsl(45 90% 50%)",
  arms: "hsl(280 60% 60%)",
  core: "hsl(150 70% 45%)",
  quads: "hsl(25 90% 55%)",
  hamstrings: "hsl(190 90% 50%)",
  calves: "hsl(320 60% 55%)",
};

const REGIONS = Object.keys(REGION_LABEL) as BodyRegion[];

const RANGES: Record<string, { label: string; days: number }> = {
  "28": { label: "4 minggu", days: 28 },
  "90": { label: "3 bulan", days: 90 },
  "180": { label: "6 bulan", days: 180 },
  "365": { label: "1 tahun", days: 365 },
};

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
const num = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? null : n;
};

export default function CoachVbtDashboard() {
  const [athletes, setAthletes] = useState<{ id: string; athlete_name: string }[]>([]);
  const [athleteId, setAthleteId] = useState<string>("");
  const [range, setRange] = useState("90");
  const [metric, setMetric] = useState<"velocity" | "power">("velocity");
  const [sets, setSets] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: links } = await supabase
        .from("coach_athletes")
        .select("athlete_id")
        .eq("coach_id", user.id)
        .eq("status", "accepted");
      const ids = (links || []).map((l: any) => l.athlete_id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, athlete_name")
        .in("id", ids);
      const list = (profiles || []) as any[];
      setAthletes(list);
      if (list.length) setAthleteId(list[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      setLoading(true);
      const cutoff = format(subDays(new Date(), RANGES[range].days), "yyyy-MM-dd");
      const [{ data: vbt }, { data: sess }] = await Promise.all([
        supabase.from("vbt_sets" as any).select("*").eq("athlete_id", athleteId).gte("date", cutoff).order("date"),
        supabase.from("training_sessions").select("id, date, session_name").eq("user_id", athleteId).gte("date", cutoff),
      ]);
      setSets((vbt as any[]) || []);
      setSessions((sess as any[]) || []);
      setLoading(false);
    })();
  }, [athleteId, range]);

  const enriched = useMemo(
    () =>
      sets.map((s) => ({
        ...s,
        region: classifyExercise(s.exercise || "") as BodyRegion,
        velocity: num(s.avg_velocity ?? s.mean_velocity),
        peakVelocity: num(s.peak_velocity ?? s.best_velocity),
        power: num(s.mean_power),
        peakPower: num(s.peak_power),
      })),
    [sets]
  );

  const activeRegions = useMemo(
    () => REGIONS.filter((r) => enriched.some((e) => e.region === r)),
    [enriched]
  );

  // Trend per otot: rata-rata per tanggal
  const trendData = useMemo(() => {
    const byDate: Record<string, any> = {};
    for (const e of enriched) {
      byDate[e.date] ||= { date: e.date };
      const bucket = (byDate[e.date][`_${e.region}`] ||= []);
      const value = metric === "velocity" ? e.velocity : e.power;
      if (value !== null) bucket.push(value);
    }
    return Object.values(byDate)
      .map((row: any) => {
        const out: any = { date: format(parseISO(row.date), "d MMM", { locale: idLocale }) };
        for (const r of REGIONS) {
          const a = avg(row[`_${r}`] || []);
          if (a !== null) out[r] = metric === "velocity" ? Math.round(a * 100) / 100 : Math.round(a);
        }
        return { ...out, _sort: row.date };
      })
      .sort((a: any, b: any) => (a._sort < b._sort ? -1 : 1));
  }, [enriched, metric]);

  const regionSummary = useMemo(
    () =>
      activeRegions.map((r) => {
        const rows = enriched.filter((e) => e.region === r);
        return {
          region: r,
          label: REGION_LABEL[r],
          velocity: Math.round((avg(rows.map((x) => x.velocity).filter((v): v is number => v !== null)) || 0) * 100) / 100,
          power: Math.round(avg(rows.map((x) => x.power).filter((v): v is number => v !== null)) || 0),
          sets: rows.length,
        };
      }),
    [enriched, activeRegions]
  );

  // Perbandingan sesi vs target kecepatan
  const sessionComparison = useMemo(() => {
    const byKey: Record<string, any> = {};
    for (const e of enriched) {
      const tMin = num(e.target_velocity_min);
      const tMax = num(e.target_velocity_max);
      if (tMin === null && tMax === null) continue;
      const key = `${e.session_id || e.date}-${e.exercise}`;
      byKey[key] ||= {
        key,
        date: e.date,
        exercise: e.exercise,
        region: e.region,
        sessionName: sessions.find((s) => s.id === e.session_id)?.session_name || "Sesi Latihan",
        targetMin: tMin,
        targetMax: tMax,
        velocities: [] as number[],
        inTarget: 0,
        total: 0,
      };
      const row = byKey[key];
      if (e.velocity !== null) {
        row.velocities.push(e.velocity);
        row.total += 1;
        const okMin = tMin === null || e.velocity >= tMin;
        const okMax = tMax === null || e.velocity <= tMax;
        if (okMin && okMax) row.inTarget += 1;
      }
    }
    return Object.values(byKey)
      .map((r: any) => {
        const achieved = avg(r.velocities);
        const target = avg([r.targetMin, r.targetMax].filter((v) => v !== null) as number[]);
        return {
          ...r,
          achieved: achieved === null ? null : Math.round(achieved * 100) / 100,
          targetMid: target === null ? null : Math.round(target * 100) / 100,
          compliance: r.total ? Math.round((r.inTarget / r.total) * 100) : 0,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [enriched, sessions]);

  const comparisonChart = useMemo(
    () =>
      [...sessionComparison]
        .reverse()
        .slice(-12)
        .map((r) => ({
          name: `${format(parseISO(r.date), "d/M")} ${r.exercise.slice(0, 12)}`,
          Target: r.targetMid,
          Tercapai: r.achieved,
        })),
    [sessionComparison]
  );

  const kpi = useMemo(() => {
    const vel = avg(enriched.map((e) => e.velocity).filter((v): v is number => v !== null));
    const pow = avg(enriched.map((e) => e.power).filter((v): v is number => v !== null));
    const comp = avg(sessionComparison.map((r) => r.compliance));
    return {
      sets: enriched.length,
      velocity: vel === null ? "—" : vel.toFixed(2),
      power: pow === null ? "—" : Math.round(pow).toLocaleString(),
      compliance: comp === null ? "—" : `${Math.round(comp)}%`,
    };
  }, [enriched, sessionComparison]);

  return (
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Dashboard VBT Pelatih
            </h1>
            <p className="text-xs text-muted-foreground">
              Tren kecepatan &amp; power per kelompok otot dan kepatuhan target kecepatan
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={athleteId} onValueChange={setAthleteId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih atlet" /></SelectTrigger>
              <SelectContent>
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.athlete_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RANGES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={metric} onValueChange={(v) => setMetric(v as "velocity" | "power")}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="velocity">Kecepatan (m/s)</SelectItem>
                <SelectItem value="power">Power (W)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {athletes.length === 0 && !loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Belum ada atlet yang terhubung dengan akun Anda.
          </CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Set VBT", value: kpi.sets, icon: Zap },
                { label: "Rata-rata Kecepatan", value: `${kpi.velocity} m/s`, icon: Gauge },
                { label: "Rata-rata Power", value: `${kpi.power} W`, icon: Gauge },
                { label: "Kepatuhan Target", value: kpi.compliance, icon: Target },
              ].map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <k.icon className="h-3.5 w-3.5" /> {k.label}
                    </p>
                    <p className="text-xl font-bold mt-1">{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  Tren {metric === "velocity" ? "Kecepatan" : "Power"} per Kelompok Otot
                </CardTitle>
                <CardDescription>Rata-rata per hari latihan — {RANGES[range].label}</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada data VBT pada periode ini.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          metric === "velocity" ? `${value} m/s` : `${value} W`,
                          REGION_LABEL[name as BodyRegion] || name,
                        ]}
                      />
                      <Legend formatter={(v: any) => REGION_LABEL[v as BodyRegion] || v} />
                      {activeRegions.map((r) => (
                        <Line
                          key={r}
                          type="monotone"
                          dataKey={r}
                          stroke={REGION_COLOR[r]}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ringkasan per Kelompok Otot</CardTitle>
                <CardDescription>Rata-rata kecepatan dan power tiap otot</CardDescription>
              </CardHeader>
              <CardContent>
                {regionSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={regionSummary}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="velocity" name="Kecepatan (m/s)" fill="hsl(190 90% 50%)" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="power" name="Power (W)" fill="hsl(0 75% 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Perbandingan Sesi vs Target Kecepatan</CardTitle>
                <CardDescription>12 latihan terakhir yang memiliki target kecepatan</CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada latihan dengan target kecepatan pada periode ini.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={comparisonChart}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 11 }} unit=" m/s" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Target" fill="hsl(45 90% 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Tercapai" fill="hsl(150 70% 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Detail Kepatuhan Target</CardTitle>
                <CardDescription>Per latihan: target pelatih vs kecepatan yang dicapai atlet</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {sessionComparison.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada data target kecepatan.</p>
                ) : (
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Tanggal</th>
                        <th className="text-left py-2 pr-3 font-medium">Sesi</th>
                        <th className="text-left py-2 pr-3 font-medium">Latihan</th>
                        <th className="text-left py-2 pr-3 font-medium">Otot</th>
                        <th className="text-right py-2 pr-3 font-medium">Target (m/s)</th>
                        <th className="text-right py-2 pr-3 font-medium">Tercapai (m/s)</th>
                        <th className="text-right py-2 font-medium">Kepatuhan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionComparison.map((r: any) => (
                        <tr key={r.key} className="border-b border-border/50">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {format(parseISO(r.date), "d MMM yyyy", { locale: idLocale })}
                          </td>
                          <td className="py-2 pr-3">{r.sessionName}</td>
                          <td className="py-2 pr-3">{r.exercise}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{REGION_LABEL[r.region as BodyRegion]}</td>
                          <td className="py-2 pr-3 text-right">
                            {r.targetMin ?? "—"} – {r.targetMax ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-right font-medium">{r.achieved ?? "—"}</td>
                          <td className="py-2 text-right">
                            <Badge variant={r.compliance >= 70 ? "default" : r.compliance >= 40 ? "secondary" : "destructive"}>
                              {r.compliance}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
}
