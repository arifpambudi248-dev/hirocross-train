import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileDown, Users, Activity, Zap, TrendingUp, User } from "lucide-react";
import { Speedometer } from "@/components/Speedometer";
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
  ReferenceArea,
  ComposedChart
} from "recharts";
import { 
  aggregateDailyLoad, 
  computeFitnessFatigueForm, 
  computeACWR 
} from "@/lib/trainingLoad";
import type { TrainingSession, ReadinessLog, PhysicalTest } from "@/types/database";
import { exportToPDF, exportToExcel, exportComparisonToPDF, exportComparisonToExcel, type ExportData, type AthleteComparisonData } from "@/lib/exportUtils";
import { predictVO2maxFromRHR, getVO2maxLevel, predictPowerFromVJ, getJumpPowerCategory } from "@/lib/predictions";

export default function Laporan() {
  const [userId, setUserId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>("");
  const [athleteAge, setAthleteAge] = useState<number | null>(null);
  const [athleteBodyWeight, setAthleteBodyWeight] = useState<number | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [readinessLogs, setReadinessLogs] = useState<ReadinessLog[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [allAthletes, setAllAthletes] = useState<AthleteComparisonData[]>([]);
  
  // Coach-specific state
  const [isCoach, setIsCoach] = useState(false);
  const [athletes, setAthletes] = useState<{ id: string; athlete_name: string; avatar_url?: string | null }[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [athleteAvatarUrl, setAthleteAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (selectedAthleteId && isCoach) {
      loadAthleteData(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);
    setLoading(true);

    // Check if user is coach
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const userIsCoach = roleData?.role === 'coach';
    setIsCoach(userIsCoach);

    if (userIsCoach) {
      // Load assigned athletes for coach
      const { data: assignments } = await supabase
        .from("coach_athletes")
        .select("athlete_id")
        .eq("coach_id", user.id)
        .eq("status", "accepted");

      if (assignments && assignments.length > 0) {
        const athleteIds = assignments.map(a => a.athlete_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, athlete_name, avatar_url")
          .in("id", athleteIds)
          .order("athlete_name");
        
        if (profilesData && profilesData.length > 0) {
          setAthletes(profilesData);
          setSelectedAthleteId(profilesData[0].id);
          setAthleteAvatarUrl(profilesData[0].avatar_url);
          await loadAthleteData(profilesData[0].id);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } else {
      // Load own data for athlete
      await loadAthleteData(user.id);
    }
  };

  const loadAthleteData = async (athleteId: string) => {
    setLoading(true);

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("athlete_name, age, body_weight, avatar_url")
      .eq("id", athleteId)
      .single();
    
    if (profile) {
      setAthleteName(profile.athlete_name);
      setAthleteAge(profile.age);
      setAthleteBodyWeight((profile as any).body_weight);
      setAthleteAvatarUrl(profile.avatar_url);
    }

    // Load all data in parallel
    const [sessionsRes, readinessRes, testsRes] = await Promise.all([
      supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", athleteId)
        .order("date", { ascending: true }),
      supabase
        .from("readiness_logs")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("physical_tests")
        .select("*")
        .eq("athlete_id", athleteId)
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Check if user is coach
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const isCoach = roleData?.role === 'coach';
    
    let profiles: any[] = [];
    
    if (isCoach) {
      // Coach sees only their assigned athletes
      const { data: assignments } = await supabase
        .from("coach_athletes")
        .select("athlete_id")
        .eq("coach_id", user.id)
        .eq("status", "accepted");
      
      if (!assignments || assignments.length === 0) {
        toast.error("Tidak ada atlet yang di-assign untuk dibandingkan");
        return;
      }
      
      const athleteIds = assignments.map(a => a.athlete_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, athlete_name")
        .in("id", athleteIds);
      
      profiles = profilesData || [];
    } else {
      // Athlete only sees their own data
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, athlete_name")
        .eq("id", user.id);
      
      profiles = profilesData || [];
    }
    
    if (profiles.length === 0) {
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

  const handleExportExcel = async () => {
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
    
    await exportToExcel(exportData);
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
      return <Badge className="bg-success text-white">Supercompensation</Badge>;
    } else if (zone === "normal") {
      return <Badge className="bg-primary text-primary-foreground">Normal</Badge>;
    } else if (zone === "fatigue") {
      return <Badge className="bg-warning text-white">Fatigue</Badge>;
    } else {
      return <Badge variant="destructive">High Fatigue</Badge>;
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
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Athlete Avatar and Name */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={athleteAvatarUrl || undefined} alt={athleteName} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {athleteName ? athleteName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Laporan Komprehensif</h1>
                <p className="text-sm text-muted-foreground">{athleteName}</p>
              </div>
            </div>
            
            {/* Athlete selector for coaches */}
            {isCoach && athletes.length > 0 && (
              <Select value={selectedAthleteId} onValueChange={(val) => {
                setSelectedAthleteId(val);
                const selectedAthlete = athletes.find(a => a.id === val);
                if (selectedAthlete) {
                  setAthleteAvatarUrl(selectedAthlete.avatar_url || null);
                }
              }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Pilih atlet..." />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={athlete.avatar_url || undefined} alt={athlete.athlete_name} />
                          <AvatarFallback className="text-xs">
                            {athlete.athlete_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {athlete.athlete_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
            <CardContent className="flex flex-col items-center">
              {(() => {
                const score = latestReadiness?.readiness_score || 0;
                // Convert readiness score (range 1.0–2.5) to 0-100%
                // 1.0 = 0%, 2.0 = 66.7%, 2.5 = 100%
                const percentage = Math.min(100, Math.max(0, ((score - 1.0) / 1.5) * 100));
                const zone = latestReadiness?.readiness_zone || '';
                const zoneLabel = zone === 'prime' ? 'Supercompensation' 
                  : zone === 'normal' ? 'Normal' 
                  : zone === 'fatigue' ? 'Fatigue' 
                  : zone === 'high_fatigue' ? 'High Fatigue' : 'N/A';
                return (
                  <>
                    <Speedometer value={percentage} size={160} label="Readiness" />
                    <p className="text-lg font-bold text-primary mt-2">{score}</p>
                    <div className="mt-1">
                      {latestReadiness && getZoneBadge(latestReadiness.readiness_zone)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{zoneLabel}</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* VO2max and Power Predictions */}
        {(() => {
          const latestRHR = latestReadiness?.rhr;
          const latestVJ = latestReadiness?.vj;
          const predictedVO2max = latestRHR && athleteAge ? predictVO2maxFromRHR(latestRHR, athleteAge) : 0;
          const vo2maxLevel = getVO2maxLevel(predictedVO2max, athleteAge || 25);
          const predictedPower = latestVJ ? predictPowerFromVJ(latestVJ) : 0;
          const powerCategory = getJumpPowerCategory(latestVJ || 0);

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Prediksi VO2max
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Estimasi dari RHR ({latestRHR || 'N/A'} bpm) & Usia ({athleteAge || 'N/A'} tahun)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {predictedVO2max || '-'}
                    </span>
                    <span className="text-muted-foreground mb-1">ml/kg/min</span>
                  </div>
                  <div className="mt-2">
                    <Badge className={vo2maxLevel.color.replace('text-', 'bg-').replace('-500', '-500/20') + ' ' + vo2maxLevel.color}>
                      {vo2maxLevel.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Formula: VO2max = 15.3 × (HRmax / RHR)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Prediksi Power
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Estimasi dari Vertical Jump ({latestVJ || 'N/A'} cm)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {predictedPower || '-'}
                    </span>
                    <span className="text-muted-foreground mb-1">Watts</span>
                  </div>
                  <div className="mt-2">
                    <Badge className={powerCategory.color.replace('text-', 'bg-').replace('-500', '-500/20') + ' ' + powerCategory.color}>
                      {powerCategory.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Formula: Lewis Power = √4.9 × mass × √(jump × 9.81)
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* VO2max and Power Trend Chart */}
        {(() => {
          const trendData = readinessLogs
            .slice()
            .reverse()
            .map((log) => {
              const bodyWeight = (log as any).body_weight || athleteBodyWeight || 70;
              const vo2max = athleteAge ? predictVO2maxFromRHR(log.rhr, athleteAge) : 0;
              const power = predictPowerFromVJ(log.vj, bodyWeight);
              return {
                date: log.date,
                vo2max,
                power,
                vj: log.vj,
                rhr: log.rhr,
              };
            });

          if (trendData.length === 0) return null;

          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Tren Prediksi VO2max & Power
                </CardTitle>
                <CardDescription>
                  Estimasi berdasarkan data readiness historis ({trendData.length} data)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                        yAxisId="vo2max"
                        stroke="#06b6d4"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'VO2max (ml/kg/min)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#06b6d4' } }}
                      />
                      <YAxis 
                        yAxisId="power"
                        orientation="right"
                        stroke="#f59e0b"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Power (W)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#f59e0b' } }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'vo2max') return [`${value.toFixed(1)} ml/kg/min`, 'VO2max'];
                          if (name === 'power') return [`${value} W`, 'Power'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="vo2max"
                        type="monotone"
                        dataKey="vo2max"
                        stroke="#06b6d4"
                        name="VO2max"
                        strokeWidth={2}
                        dot={{ fill: '#06b6d4', r: 3 }}
                      />
                      <Line
                        yAxisId="power"
                        type="monotone"
                        dataKey="power"
                        stroke="#f59e0b"
                        name="Power"
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <p className="text-cyan-400 font-medium">VO2max Range</p>
                    <p className="text-muted-foreground">
                      Min: {Math.min(...trendData.map(d => d.vo2max)).toFixed(1)} | 
                      Max: {Math.max(...trendData.map(d => d.vo2max)).toFixed(1)} ml/kg/min
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-yellow-400 font-medium">Power Range</p>
                    <p className="text-muted-foreground">
                      Min: {Math.min(...trendData.map(d => d.power))} | 
                      Max: {Math.max(...trendData.map(d => d.power))} W
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

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
                      
                      {/* Zone colored background areas */}
                      <ReferenceArea y1={20} y2={40} fill="#eab308" fillOpacity={0.15} />
                      <ReferenceArea y1={5} y2={20} fill="#3b82f6" fillOpacity={0.15} />
                      <ReferenceArea y1={-10} y2={5} fill="#6b7280" fillOpacity={0.15} />
                      <ReferenceArea y1={-30} y2={-10} fill="#22c55e" fillOpacity={0.15} />
                      <ReferenceArea y1={-40} y2={-30} fill="#dc2626" fillOpacity={0.15} />
                      
                      {/* Zone boundary lines */}
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
                    onClick={async () => {
                      await exportComparisonToExcel(allAthletes);
                      toast.success("Perbandingan Excel berhasil diekspor");
                    }}
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
      <BottomNavigation />
    </div>
  );
}
