import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Activity, Target, Dumbbell, Heart, Users, AlertCircle, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateTrainingRecommendation } from "@/lib/trainingRecommendations";
import { assessInjuryRisk, getRiskColor, getRiskBgColor } from "@/lib/injuryRisk";
import { computeACWR } from "@/lib/trainingLoad";

type AthleteStats = {
  athlete_id: string;
  athlete_name: string;
  latest_readiness: number;
  readiness_zone: string;
  weekly_load: number;
  avg_weekly_load: number;
};

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [weeklyLoad, setWeeklyLoad] = useState<number>(0);
  const [previousWeekLoad, setPreviousWeekLoad] = useState<number>(0);
  const [avgWeeklyLoad, setAvgWeeklyLoad] = useState<number>(0);
  const [latestReadiness, setLatestReadiness] = useState<{ score: number; zone: string } | null>(null);
  const [recentTests, setRecentTests] = useState<Array<{ test_name: string; value: number; unit: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<AthleteStats[]>([]);
  const [teamTrends, setTeamTrends] = useState<any[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [acwrData, setAcwrData] = useState<any[]>([]);
  const [riskReadinessData, setRiskReadinessData] = useState<any[]>([]);
  const [riskLoadData, setRiskLoadData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);

    // Check if user is coach
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    const userIsCoach = roleData?.role === 'coach';
    setIsCoach(userIsCoach);

    // Load weekly training load (last 7 days)
    const now = new Date();
    const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const lastWeekStart = format(startOfWeek(subDays(now, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const lastWeekEnd = format(endOfWeek(subDays(now, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const fourWeeksAgo = format(subDays(now, 28), "yyyy-MM-dd");

    const { data: thisWeekSessions } = await supabase
      .from("training_sessions")
      .select("load_final")
      .eq("user_id", user.id)
      .gte("date", thisWeekStart);
    
    if (thisWeekSessions) {
      const total = thisWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
      setWeeklyLoad(total);
    }

    // Previous week load
    const { data: lastWeekSessions } = await supabase
      .from("training_sessions")
      .select("load_final")
      .eq("user_id", user.id)
      .gte("date", lastWeekStart)
      .lte("date", lastWeekEnd);
    
    if (lastWeekSessions) {
      const total = lastWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
      setPreviousWeekLoad(total);
    }

    // 4-week average
    const { data: fourWeekSessions } = await supabase
      .from("training_sessions")
      .select("load_final, date")
      .eq("user_id", user.id)
      .gte("date", fourWeeksAgo);
    
    if (fourWeekSessions && fourWeekSessions.length > 0) {
      const total = fourWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
      setAvgWeeklyLoad(total / 4);
    }

    // Load latest readiness
    const { data: readiness } = await supabase
      .from("readiness_logs")
      .select("readiness_score, readiness_zone")
      .eq("athlete_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (readiness) {
      setLatestReadiness({ score: readiness.readiness_score, zone: readiness.readiness_zone });
    }

    // Load recent physical tests (last 3)
    const { data: tests } = await supabase
      .from("physical_tests")
      .select("test_name, value, unit")
      .eq("athlete_id", user.id)
      .order("test_date", { ascending: false })
      .limit(3);
    
    if (tests) {
      setRecentTests(tests);
    }

    // If coach, load team data
    if (userIsCoach) {
      await loadTeamData();
    } else {
      // If athlete, load injury risk data
      await loadInjuryRiskData(user.id);
    }

    setLoading(false);
  }

  async function loadInjuryRiskData(userId: string) {
    const now = new Date();

    // Get last 7 days readiness
    const sevenDaysAgo = format(subDays(now, 7), "yyyy-MM-dd");
    const { data: readinessLogs } = await supabase
      .from("readiness_logs")
      .select("date, readiness_score, readiness_zone")
      .eq("athlete_id", userId)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: true });

    const readinessScores = readinessLogs?.map(r => r.readiness_score) || [];
    const readinessChartData = readinessLogs?.map(r => ({
      date: format(new Date(r.date), "dd/MM"),
      score: r.readiness_score,
      zone: r.readiness_zone
    })) || [];
    setRiskReadinessData(readinessChartData);

    // Get last 5 weeks of training load
    const fiveWeeksAgo = format(subDays(now, 35), "yyyy-MM-dd");
    const { data: sessions } = await supabase
      .from("training_sessions")
      .select("date, load_final")
      .eq("user_id", userId)
      .gte("date", fiveWeeksAgo)
      .order("date", { ascending: true });

    // Aggregate by week
    const weeklyLoads: number[] = [];
    const loadChartData: any[] = [];
    
    for (let i = 4; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      const weekSessions = sessions?.filter(s => 
        s.date >= weekStartStr && s.date <= weekEndStr
      ) || [];

      const weekLoad = weekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
      weeklyLoads.push(weekLoad);
      
      loadChartData.push({
        week: i === 0 ? "Minggu Ini" : `${i} minggu lalu`,
        load: weekLoad
      });
    }

    setRiskLoadData(loadChartData.reverse());

    // Calculate ACWR
    const acwrPoints = computeACWR(
      sessions?.map(s => ({ date: s.date, load: s.load_final || 0 })) || []
    );
    
    const acwrChartData = acwrPoints.slice(-14).map(p => ({
      date: format(new Date(p.date), "dd/MM"),
      acwr: p.ratio
    }));
    setAcwrData(acwrChartData);

    // Get current ACWR and current week load
    const currentACWR = acwrPoints.length > 0 ? acwrPoints[acwrPoints.length - 1].ratio : 1.0;
    const currentWeekLoad = weeklyLoads[weeklyLoads.length - 1] || 0;
    const previousWeeks = weeklyLoads.slice(0, -1);

    // Assess injury risk
    const assessment = assessInjuryRisk(
      currentACWR,
      readinessScores,
      previousWeeks,
      currentWeekLoad
    );

    setRiskAssessment(assessment);
  }

  async function loadTeamData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get only athletes assigned to this coach with accepted status
    const { data: assignments } = await supabase
      .from("coach_athletes")
      .select("athlete_id")
      .eq("coach_id", user.id)
      .eq("status", "accepted");

    if (!assignments || assignments.length === 0) {
      setTeamStats([]);
      setTeamTrends([]);
      return;
    }

    const athleteIds = assignments.map(a => a.athlete_id);

    // Get athlete profiles only for assigned athletes
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, athlete_name")
      .in("id", athleteIds);
    
    if (!profiles) return;

    const stats: AthleteStats[] = [];
    const now = new Date();
    const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const fourWeeksAgo = format(subDays(now, 28), "yyyy-MM-dd");

    for (const profile of profiles) {
      // Get latest readiness
      const { data: readiness } = await supabase
        .from("readiness_logs")
        .select("readiness_score, readiness_zone")
        .eq("athlete_id", profile.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get weekly load
      const { data: weekSessions } = await supabase
        .from("training_sessions")
        .select("load_final")
        .eq("user_id", profile.id)
        .gte("date", thisWeekStart);

      const weeklyLoad = weekSessions?.reduce((sum, s) => sum + (s.load_final || 0), 0) || 0;

      // Get 4-week average
      const { data: fourWeekSessions } = await supabase
        .from("training_sessions")
        .select("load_final")
        .eq("user_id", profile.id)
        .gte("date", fourWeeksAgo);

      const avgLoad = fourWeekSessions && fourWeekSessions.length > 0
        ? fourWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0) / 4
        : 0;

      stats.push({
        athlete_id: profile.id,
        athlete_name: profile.athlete_name,
        latest_readiness: readiness?.readiness_score || 0,
        readiness_zone: readiness?.readiness_zone || 'moderate',
        weekly_load: weeklyLoad,
        avg_weekly_load: avgLoad
      });
    }

    setTeamStats(stats);

    // Calculate team trends (last 4 weeks)
    const trends = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = format(startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(subDays(now, i * 7), { weekStartsOn: 1 }), "yyyy-MM-dd");

      let totalLoad = 0;
      let totalReadiness = 0;
      let readinessCount = 0;

      for (const profile of profiles) {
        // Week load
        const { data: sessions } = await supabase
          .from("training_sessions")
          .select("load_final")
          .eq("user_id", profile.id)
          .gte("date", weekStart)
          .lte("date", weekEnd);

        totalLoad += sessions?.reduce((sum, s) => sum + (s.load_final || 0), 0) || 0;

        // Avg readiness for the week
        const { data: readinessLogs } = await supabase
          .from("readiness_logs")
          .select("readiness_score")
          .eq("athlete_id", profile.id)
          .gte("date", weekStart)
          .lte("date", weekEnd);

        if (readinessLogs && readinessLogs.length > 0) {
          const avgReadiness = readinessLogs.reduce((sum, r) => sum + r.readiness_score, 0) / readinessLogs.length;
          totalReadiness += avgReadiness;
          readinessCount++;
        }
      }

      trends.push({
        week: `Minggu ${4 - i}`,
        load: Math.round(totalLoad),
        readiness: readinessCount > 0 ? Math.round(totalReadiness / readinessCount) : 0
      });
    }

    setTeamTrends(trends);
  }

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'prime': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'low': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  // Generate recommendation
  const recommendation = latestReadiness && avgWeeklyLoad > 0
    ? generateTrainingRecommendation(
        latestReadiness.score,
        latestReadiness.zone as 'low' | 'moderate' | 'prime',
        previousWeekLoad,
        avgWeeklyLoad
      )
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1 sm:mb-2">
            {isCoach ? "Dashboard Pelatih" : "Sistem Periodisasi Latihan Atletik"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
            {isCoach 
              ? "Monitoring dan analisis performa tim secara keseluruhan"
              : "Platform komprehensif untuk monitoring dan analisis performa atlet"
            }
          </p>
        </div>

        {/* Training Recommendation Alert */}
        {!isCoach && recommendation && (
          <Alert className="mb-4 sm:mb-6 border-l-4" style={{ borderLeftColor: recommendation.color.replace('text-', '') }}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertTitle className="font-bold text-sm sm:text-base">Rekomendasi Latihan Hari Ini</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p className="font-semibold text-sm sm:text-base">{recommendation.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 mt-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground">Intensitas: </span>
                    <span className="font-medium">{recommendation.intensity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Volume: </span>
                    <span className="font-medium">{recommendation.volume}</span>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Coach Dashboard */}
        {isCoach && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Atlet</CardTitle>
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">{teamStats.length}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Atlet aktif</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Rata-rata Load</CardTitle>
                  <Dumbbell className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                    {loading ? "..." : Math.round(teamStats.reduce((sum, a) => sum + a.weekly_load, 0) / Math.max(teamStats.length, 1))}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">AU minggu ini</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Rata-rata Readiness</CardTitle>
                  <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                    {loading ? "..." : Math.round(teamStats.reduce((sum, a) => sum + a.latest_readiness, 0) / Math.max(teamStats.length, 1))}%
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Kesiapan tim</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Atlet Siap</CardTitle>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                    {loading ? "..." : teamStats.filter(a => a.readiness_zone === 'prime').length}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Zona prime</p>
                </CardContent>
              </Card>
            </div>

            {/* Team Trends Chart */}
            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Tren Tim (4 Minggu Terakhir)</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
                <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] lg:h-[300px]">
                  <LineChart data={teamTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} width={35} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} width={35} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="load" stroke="hsl(var(--primary))" name="Total Load" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="readiness" stroke="hsl(var(--chart-2))" name="Avg Readiness (%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Members Status */}
            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Status Atlet</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  {teamStats.map((athlete) => (
                    <div key={athlete.athlete_id} className="flex items-center justify-between p-2 sm:p-3 lg:p-4 border border-border rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">{athlete.athlete_name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Load: {athlete.weekly_load} | Avg: {Math.round(athlete.avg_weekly_load)}
                        </p>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className={`text-base sm:text-lg font-bold ${
                          athlete.readiness_zone === 'prime' ? 'text-green-500' :
                          athlete.readiness_zone === 'moderate' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {athlete.latest_readiness}%
                        </p>
                        <p className="text-[10px] sm:text-xs capitalize text-muted-foreground">{athlete.readiness_zone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Athlete Dashboard Overview */}
        {!isCoach && (
          <>
            {/* Injury Risk Assessment */}
            {riskAssessment && (
              <Card className="mb-4 sm:mb-6 lg:mb-8">
                <CardHeader className="p-3 sm:p-4 lg:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    Analisis Risiko Cedera
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-4 sm:space-y-6">
                  <Alert className={getRiskBgColor(riskAssessment.risk)}>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <AlertTitle className="font-bold text-sm sm:text-base">
                      Risiko: {riskAssessment.risk === 'low' ? 'Rendah' : 
                               riskAssessment.risk === 'moderate' ? 'Sedang' : 
                               riskAssessment.risk === 'high' ? 'Tinggi' : 'Sangat Tinggi'}
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-2">
                        <p className="font-semibold text-xs sm:text-sm">Rekomendasi:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {riskAssessment.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-xs sm:text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {riskAssessment.factors && riskAssessment.factors.length > 0 && (
                    <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2">
                      {riskAssessment.factors.map((factor: any, idx: number) => (
                        <Card key={idx} className={getRiskBgColor(factor.severity)}>
                          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                            <CardTitle className="text-xs sm:text-sm flex items-center justify-between gap-2">
                              <span className="truncate">{factor.name}</span>
                              <span className={`text-[10px] sm:text-xs shrink-0 ${getRiskColor(factor.severity)}`}>
                                {factor.severity === 'low' ? 'Rendah' :
                                 factor.severity === 'moderate' ? 'Sedang' :
                                 factor.severity === 'high' ? 'Tinggi' : 'Sangat Tinggi'}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4 pt-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{factor.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* ACWR Chart */}
                  {acwrData.length > 0 && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold mb-2">ACWR (2 Minggu Terakhir)</h4>
                      <ResponsiveContainer width="100%" height={150} className="sm:h-[180px] lg:h-[200px]">
                        <LineChart data={acwrData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 2]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={30} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: '12px' }} />
                          <Line type="monotone" dataKey="acwr" stroke="hsl(var(--primary))" strokeWidth={2} name="ACWR" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Weekly Load Chart */}
                  {riskLoadData.length > 0 && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold mb-2">Beban Latihan Mingguan</h4>
                      <ResponsiveContainer width="100%" height={150} className="sm:h-[180px] lg:h-[200px]">
                        <BarChart data={riskLoadData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={30} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: '12px' }} />
                          <Bar dataKey="load" fill="hsl(var(--primary))" name="Load (AU)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Readiness Trend */}
                  {riskReadinessData.length > 0 && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold mb-2">Tren Readiness (7 Hari)</h4>
                      <ResponsiveContainer width="100%" height={150} className="sm:h-[180px] lg:h-[200px]">
                        <LineChart data={riskReadinessData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={30} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: '12px' }} />
                          <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Readiness" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Load Mingguan (7 Hari)</CardTitle>
              <Dumbbell className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">{loading ? "..." : weeklyLoad}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total beban latihan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Readiness Terkini</CardTitle>
              <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              {loading ? (
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">...</div>
              ) : latestReadiness ? (
                <>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold">{latestReadiness.score}%</div>
                  <p className={`text-[10px] sm:text-xs capitalize ${getZoneColor(latestReadiness.zone)}`}>
                    {latestReadiness.zone}
                  </p>
                </>
              ) : (
                <div className="text-xs sm:text-sm text-muted-foreground">Belum ada data</div>
              )}
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Tes Fisik Terbaru</CardTitle>
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              {loading ? (
                <div className="text-xs sm:text-sm">...</div>
              ) : recentTests.length > 0 ? (
                <div className="space-y-1">
                  {recentTests.slice(0, 2).map((test, idx) => (
                    <div key={idx} className="text-[10px] sm:text-xs">
                      <span className="font-medium">{test.test_name}:</span> {test.value} {test.unit}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-muted-foreground">Belum ada data</div>
              )}
            </CardContent>
          </Card>
          </div>
          </>
        )}

        {/* Feature Cards */}
        {!isCoach && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-4 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Annual Plan</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">GPP-SPP-Pra-Komp</p>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 hidden sm:block">
              <p className="text-xs sm:text-sm">Periodisasi tahunan dengan grafik load</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-4 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Analisis Load</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">FFF & ACWR</p>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 hidden sm:block">
              <p className="text-xs sm:text-sm">Fitness, Fatigue, Form, dan ACWR monitoring</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-4 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Readiness</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">VJ + RHR</p>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 hidden sm:block">
              <p className="text-xs sm:text-sm">Monitoring kesiapan atlet harian</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-4 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base lg:text-lg">Tes Fisik</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">6 Kategori</p>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 hidden sm:block">
              <p className="text-xs sm:text-sm">Tracking tes kondisi fisik atlet</p>
            </CardContent>
          </Card>
        </div>
        )}

        {!isCoach && (
        <Card>
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-sm sm:text-base lg:text-lg">Fitur Utama</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className="space-y-1 sm:space-y-2">
                <h3 className="font-semibold text-primary text-xs sm:text-sm lg:text-base">Training Load Otomatis</h3>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                  Perhitungan load otomatis dari RPE × durasi dengan opsi edit manual
                </p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <h3 className="font-semibold text-primary text-xs sm:text-sm lg:text-base">Grafik FFF</h3>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                  Visualisasi Fitness (CTL), Fatigue (ATL), dan Form (TSB)
                </p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <h3 className="font-semibold text-primary text-xs sm:text-sm lg:text-base">ACWR Monitoring</h3>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                  Deteksi dini risiko overtraining dengan Acute:Chronic Workload Ratio
                </p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <h3 className="font-semibold text-primary text-xs sm:text-sm lg:text-base">Readiness Scoring</h3>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                  Skor 0-100 dari Vertical Jump dan Resting Heart Rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
