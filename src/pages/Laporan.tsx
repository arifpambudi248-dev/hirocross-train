import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileDown, Users } from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ComposedChart
} from "recharts";
import { 
  aggregateDailyLoad, 
  computeFitnessFatigueForm, 
  computeACWR 
} from "@/lib/trainingLoad";
import type { TrainingSession, ReadinessLog, PhysicalTest } from "@/types/database";
import { exportToPDF, exportToExcel, exportComparisonToPDF, exportComparisonToExcel, type ExportData, type AthleteComparisonData } from "@/lib/exportUtils";

export default function Laporan() {
  const [userId, setUserId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>("");
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [readinessLogs, setReadinessLogs] = useState<ReadinessLog[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [allAthletes, setAllAthletes] = useState<AthleteComparisonData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);
    setLoading(true);

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("athlete_name")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      setAthleteName(profile.athlete_name);
    }

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

  const loadComparisonData = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, athlete_name");
    
    if (!profiles || profiles.length === 0) {
      toast.error("Tidak ada data atlet untuk dibandingkan");
      return;
    }

    const athletesData: AthleteComparisonData[] = [];

    for (const profile of profiles) {
      const [sessionsRes, readinessRes] = await Promise.all([
        supabase
          .from("training_sessions")
          .select("*")
          .eq("user_id", profile.id)
          .order("date", { ascending: true }),
        supabase
          .from("readiness_logs")
          .select("*")
          .eq("athlete_id", profile.id)
          .order("date", { ascending: false })
          .limit(1)
      ]);

      const sessions = (sessionsRes.data as any[]) || [];
      const readinessLog = (readinessRes.data as any[])?.[0];

      const dailyLoads = aggregateDailyLoad(sessions);
      const last90Days = dailyLoads.slice(-90);
      const last7Days = dailyLoads.slice(-7);
      const fitnessData = computeFitnessFatigueForm({ dailyLoads: last90Days });
      const acwrData = computeACWR(last90Days);

      const latestFitness = fitnessData[fitnessData.length - 1];
      const latestACWR = acwrData[acwrData.length - 1];
      const weeklyLoad = last7Days.reduce((sum, d) => sum + d.load, 0);

      athletesData.push({
        athleteId: profile.id,
        athleteName: profile.athlete_name,
        weeklyLoad,
        fitness: latestFitness?.fitness || 0,
        fatigue: latestFitness?.fatigue || 0,
        form: latestFitness?.form || 0,
        acwr: latestACWR?.ratio || 0,
        readiness: readinessLog?.readiness_score || 0,
        readinessZone: readinessLog?.readiness_zone || "N/A",
      });
    }

    setAllAthletes(athletesData);
    setShowComparison(true);
  };

  const handleExportPDF = () => {
    const exportData: ExportData = {
      athleteName,
      weeklyLoad,
      avgDailyLoad,
      latestFitness: latestFitness?.fitness || 0,
      latestFatigue: latestFitness?.fatigue || 0,
      latestForm: latestFitness?.form || 0,
      latestACWR: latestACWR?.ratio || 0,
      latestReadiness: latestReadiness?.readiness_score || 0,
      readinessZone: latestReadiness?.readiness_zone || "N/A",
      sessions,
      readinessLogs,
      physicalTests,
    };
    
    exportToPDF(exportData);
    toast.success("Laporan PDF berhasil diekspor");
  };

  const handleExportExcel = () => {
    const exportData: ExportData = {
      athleteName,
      weeklyLoad,
      avgDailyLoad,
      latestFitness: latestFitness?.fitness || 0,
      latestFatigue: latestFitness?.fatigue || 0,
      latestForm: latestFitness?.form || 0,
      latestACWR: latestACWR?.ratio || 0,
      latestReadiness: latestReadiness?.readiness_score || 0,
      readinessZone: latestReadiness?.readiness_zone || "N/A",
      sessions,
      readinessLogs,
      physicalTests,
    };
    
    exportToExcel(exportData);
    toast.success("Laporan Excel berhasil diekspor");
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-foreground">Laporan Komprehensif</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Ekspor PDF
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Ekspor Excel
            </Button>
            <Button
              onClick={loadComparisonData}
              variant="default"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Bandingkan Atlet
            </Button>
          </div>
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
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Fitness-Fatigue-Form Analysis</CardTitle>
                <CardDescription className="mt-1">
                  {fitnessData.length > 0 && `${Math.floor(fitnessData.length / 7)} weeks ${fitnessData.length % 7} days`}
                </CardDescription>
              </div>
              {latestFitness && (
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-muted-foreground">Fitness</p>
                    <p className="text-3xl font-bold text-cyan-400">{latestFitness.fitness.toFixed(0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Fatigue</p>
                    <p className="text-3xl font-bold text-purple-400">{latestFitness.fatigue.toFixed(0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Form</p>
                    <p className="text-3xl font-bold text-yellow-400">{latestFitness.form.toFixed(0)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Ramp</p>
                    <p className="text-3xl font-bold text-foreground">
                      {fitnessData.length > 1 
                        ? ((fitnessData[fitnessData.length - 1].load - fitnessData[fitnessData.length - 2].load) / 
                           fitnessData[fitnessData.length - 2].load * 100).toFixed(1)
                        : "0.0"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fitnessData.length > 0 ? (
              <div className="space-y-1">
                {/* Top Chart - Training Load with Fitness/Fatigue Lines */}
                <div className="h-80 border-b border-border/50">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fitnessData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Training load per day', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="load" fill="#eab308" opacity={0.6} name="Daily Load" />
                      <Line
                        type="monotone"
                        dataKey="fitness"
                        stroke="#06b6d4"
                        name="Fitness (CTL)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="fatigue"
                        stroke="#a855f7"
                        name="Fatigue (ATL)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Chart - Form % with Zones */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fitnessData} margin={{ top: 0, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="highRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#dc2626" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#dc2626" stopOpacity={0.2} />
                        </linearGradient>
                        <linearGradient id="optimal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2} />
                        </linearGradient>
                        <linearGradient id="greyZone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6b7280" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#6b7280" stopOpacity={0.2} />
                        </linearGradient>
                        <linearGradient id="fresh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                        </linearGradient>
                        <linearGradient id="transition" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#eab308" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#eab308" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11 }}
                        domain={[-40, 40]}
                        label={{ value: 'Form, %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Form']}
                      />
                      {/* Zone colored areas */}
                      <ReferenceLine y={20} stroke="#eab308" strokeDasharray="3 3" />
                      <ReferenceLine y={5} stroke="#3b82f6" strokeDasharray="3 3" />
                      <ReferenceLine y={-10} stroke="#6b7280" strokeDasharray="3 3" />
                      <ReferenceLine y={-30} stroke="#22c55e" strokeDasharray="3 3" />
                      
                      {/* Form Line */}
                      <Line
                        type="monotone"
                        dataKey="form"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        name="Form (TSB)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Zone Legend */}
                <div className="flex justify-end gap-4 text-xs pt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-600 rounded-sm" />
                    <span className="text-muted-foreground">High Risk (≤-30)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-sm" />
                    <span className="text-muted-foreground">Optimal (-30 to -10)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-500 rounded-sm" />
                    <span className="text-muted-foreground">Grey Zone (-10 to 5)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                    <span className="text-muted-foreground">Fresh (5 to 20)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
                    <span className="text-muted-foreground">Transition (≥20)</span>
                  </div>
                </div>
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
            <CardDescription>
              Rasio beban akut (7 hari) terhadap beban kronis (28 hari). Zona optimal: 0.8-1.3
            </CardDescription>
          </CardHeader>
          <CardContent>
            {acwrData.length > 0 ? (
              <div className="space-y-4">
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
                      <ReferenceLine y={0.8} stroke="hsl(var(--warning))" strokeDasharray="3 3" label="Batas Bawah" />
                      <ReferenceLine y={1.3} stroke="hsl(var(--warning))" strokeDasharray="3 3" label="Batas Atas" />
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
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-success/10 border border-success/20 rounded">
                    <p className="text-muted-foreground">Zona Optimal</p>
                    <p className="font-bold text-success">0.8 - 1.3</p>
                    <p className="text-xs text-muted-foreground mt-1">Risiko cedera rendah</p>
                  </div>
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded">
                    <p className="text-muted-foreground">Underload</p>
                    <p className="font-bold text-warning">&lt; 0.8</p>
                    <p className="text-xs text-muted-foreground mt-1">Perlu peningkatan beban</p>
                  </div>
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="text-muted-foreground">Overload</p>
                    <p className="font-bold text-destructive">&gt; 1.3</p>
                    <p className="text-xs text-muted-foreground mt-1">Risiko cedera tinggi</p>
                  </div>
                </div>
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

        {/* Athlete Comparison */}
        {showComparison && allAthletes.length > 0 && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Perbandingan Performa Antar Atlet</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => exportComparisonToPDF(allAthletes)}
                    variant="outline"
                    size="sm"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => exportComparisonToExcel(allAthletes)}
                    variant="outline"
                    size="sm"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={allAthletes}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="athleteName" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                      <Radar
                        name="Fitness (CTL)"
                        dataKey="fitness"
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.5}
                      />
                      <Radar
                        name="Readiness"
                        dataKey="readiness"
                        stroke="hsl(var(--chart-2))"
                        fill="hsl(var(--chart-2))"
                        fillOpacity={0.5}
                      />
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tabel Perbandingan Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Atlet</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Beban 7H</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">CTL</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">ATL</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">TSB</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">ACWR</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Readiness</th>
                        <th className="text-center p-3 text-sm font-medium text-muted-foreground">Zona</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAthletes.map((athlete) => (
                        <tr key={athlete.athleteId} className="border-b border-border hover:bg-muted/50">
                          <td className="p-3 text-sm font-medium text-foreground">{athlete.athleteName}</td>
                          <td className="p-3 text-sm text-right text-foreground">{athlete.weeklyLoad.toFixed(0)}</td>
                          <td className="p-3 text-sm text-right text-foreground">{athlete.fitness.toFixed(0)}</td>
                          <td className="p-3 text-sm text-right text-foreground">{athlete.fatigue.toFixed(0)}</td>
                          <td className="p-3 text-sm text-right text-foreground">{athlete.form.toFixed(0)}</td>
                          <td className="p-3 text-sm text-right text-foreground">{athlete.acwr.toFixed(2)}</td>
                          <td className="p-3 text-sm text-right text-foreground">{athlete.readiness.toFixed(0)}</td>
                          <td className="p-3 text-sm text-center">{getZoneBadge(athlete.readinessZone)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
