import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from "recharts";
import { 
  aggregateDailyLoad, 
  computeFitnessFatigueForm, 
  computeACWR 
} from "@/lib/trainingLoad";
import type { TrainingSession, ReadinessLog, PhysicalTest } from "@/types/database";

export default function Laporan() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [readinessLogs, setReadinessLogs] = useState<ReadinessLog[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);
    setLoading(true);

    // Load all data in parallel
    const [sessionsRes, readinessRes, testsRes] = await Promise.all([
      supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true }),
      supabase
        .from("readiness_logs")
        .select("*")
        .eq("athlete_id", user.id)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("physical_tests")
        .select("*")
        .eq("athlete_id", user.id)
        .order("test_date", { ascending: false })
        .limit(20)
    ]);

    if (sessionsRes.error) {
      toast.error("Gagal memuat data sesi latihan");
    } else {
      setSessions((sessionsRes.data as any[]) || []);
    }

    if (readinessRes.error) {
      toast.error("Gagal memuat data readiness");
    } else {
      setReadinessLogs((readinessRes.data as any[]) || []);
    }

    if (testsRes.error) {
      toast.error("Gagal memuat data tes fisik");
    } else {
      setPhysicalTests((testsRes.data as any[]) || []);
    }

    setLoading(false);
  };

  // Calculate training load metrics
  const dailyLoads = aggregateDailyLoad(sessions);
  const last90Days = dailyLoads.slice(-90);
  const fitnessData = computeFitnessFatigueForm({ dailyLoads: last90Days });
  const acwrData = computeACWR(last90Days);

  // Latest metrics
  const latestFitness = fitnessData[fitnessData.length - 1];
  const latestACWR = acwrData[acwrData.length - 1];
  const latestReadiness = readinessLogs[0];

  // Weekly summary
  const last7Days = dailyLoads.slice(-7);
  const weeklyLoad = last7Days.reduce((sum, d) => sum + d.load, 0);
  const avgDailyLoad = weeklyLoad / 7;

  // Test categories summary
  const testsByCategory = physicalTests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, PhysicalTest[]>);

  const getZoneBadge = (zone: string) => {
    if (zone === "prime") {
      return <Badge className="bg-success text-white">Prima</Badge>;
    } else if (zone === "moderate") {
      return <Badge className="bg-warning text-white">Sedang</Badge>;
    } else {
      return <Badge variant="destructive">Kurang</Badge>;
    }
  };

  const getACWRBadge = (acwr: number) => {
    if (acwr >= 0.8 && acwr <= 1.3) {
      return <Badge className="bg-success text-white">Optimal</Badge>;
    } else if (acwr < 0.8) {
      return <Badge className="bg-warning text-white">Underload</Badge>;
    } else {
      return <Badge variant="destructive">Overload</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Laporan Komprehensif</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Beban Latihan 7 Hari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{weeklyLoad.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Rata-rata harian: {avgDailyLoad.toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fitness (CTL)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {latestFitness?.fitness.toFixed(0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                TSB: {latestFitness?.form.toFixed(0) || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ACWR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {latestACWR?.ratio.toFixed(2) || 0}
              </div>
              <div className="mt-2">
                {latestACWR && getACWRBadge(latestACWR.ratio)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Readiness Terkini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {latestReadiness?.readiness_score || 0}
              </div>
              <div className="mt-2">
                {latestReadiness && getZoneBadge(latestReadiness.readiness_zone)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fitness-Fatigue-Form Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fitness-Fatigue-Form (CTL/ATL/TSB)</CardTitle>
          </CardHeader>
          <CardContent>
            {fitnessData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fitnessData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="fitness"
                      stroke="hsl(var(--primary))"
                      name="CTL (Fitness)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="fatigue"
                      stroke="hsl(var(--destructive))"
                      name="ATL (Fatigue)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="form"
                      stroke="hsl(var(--success))"
                      name="TSB (Form)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data latihan untuk ditampilkan
              </p>
            )}
          </CardContent>
        </Card>

        {/* ACWR Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Acute:Chronic Workload Ratio (ACWR)</CardTitle>
          </CardHeader>
          <CardContent>
            {acwrData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={acwrData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 2]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <ReferenceLine y={0.8} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
                    <ReferenceLine y={1.3} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="ratio"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="ACWR"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data untuk ACWR
              </p>
            )}
          </CardContent>
        </Card>

        {/* Readiness Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tren Readiness 30 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {readinessLogs.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...readinessLogs].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <ReferenceLine y={40} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Low" />
                    <ReferenceLine y={70} stroke="hsl(var(--warning))" strokeDasharray="3 3" label="Moderate" />
                    <Line
                      type="monotone"
                      dataKey="readiness_score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Readiness Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data readiness
              </p>
            )}
          </CardContent>
        </Card>

        {/* Physical Tests Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Hasil Tes Fisik Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            {physicalTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(testsByCategory).map(([category, tests]) => {
                  const latestTest = tests[0];
                  return (
                    <div key={category} className="p-4 border border-border rounded-lg">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">{latestTest.test_name}</p>
                          <p className="text-lg font-bold text-primary">
                            {latestTest.value} {latestTest.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">{latestTest.test_date}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data tes fisik
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Training Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Sesi Latihan Terkini (7 Hari)</CardTitle>
          </CardHeader>
          <CardContent>
            {last7Days.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="load" fill="hsl(var(--primary))" name="Beban Harian" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data latihan minggu ini
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
