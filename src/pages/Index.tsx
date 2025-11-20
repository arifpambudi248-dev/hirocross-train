import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Activity, Target, Dumbbell, Heart, Users, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateTrainingRecommendation } from "@/lib/trainingRecommendations";

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
    }

    setLoading(false);
  }

  async function loadTeamData() {
    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, athlete_name");
    
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {isCoach ? "Dashboard Pelatih" : "Sistem Periodisasi Latihan Atletik"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isCoach 
              ? "Monitoring dan analisis performa tim secara keseluruhan"
              : "Platform komprehensif untuk monitoring dan analisis performa atlet"
            }
          </p>
        </div>

        {/* Training Recommendation Alert */}
        {!isCoach && recommendation && (
          <Alert className="mb-6 border-l-4" style={{ borderLeftColor: recommendation.color.replace('text-', '') }}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">Rekomendasi Latihan Hari Ini</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p className="font-semibold">{recommendation.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Atlet</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamStats.length}</div>
                  <p className="text-xs text-muted-foreground">Atlet aktif</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rata-rata Load Tim</CardTitle>
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : Math.round(teamStats.reduce((sum, a) => sum + a.weekly_load, 0) / Math.max(teamStats.length, 1))}
                  </div>
                  <p className="text-xs text-muted-foreground">AU minggu ini</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rata-rata Readiness</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : Math.round(teamStats.reduce((sum, a) => sum + a.latest_readiness, 0) / Math.max(teamStats.length, 1))}%
                  </div>
                  <p className="text-xs text-muted-foreground">Kesiapan tim</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Atlet Siap</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : teamStats.filter(a => a.readiness_zone === 'prime').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Zona prime</p>
                </CardContent>
              </Card>
            </div>

            {/* Team Trends Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Tren Tim (4 Minggu Terakhir)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={teamTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--foreground))" />
                    <YAxis yAxisId="left" stroke="hsl(var(--foreground))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="load" stroke="hsl(var(--primary))" name="Total Load" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="readiness" stroke="hsl(var(--chart-2))" name="Avg Readiness (%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Members Status */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Status Atlet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamStats.map((athlete) => (
                    <div key={athlete.athlete_id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-semibold">{athlete.athlete_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Load: {athlete.weekly_load} AU | Avg: {Math.round(athlete.avg_weekly_load)} AU
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          athlete.readiness_zone === 'prime' ? 'text-green-500' :
                          athlete.readiness_zone === 'moderate' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {athlete.latest_readiness}%
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">{athlete.readiness_zone}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Load Mingguan (7 Hari)</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : weeklyLoad}</div>
              <p className="text-xs text-muted-foreground">Total beban latihan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Readiness Terkini</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold">...</div>
              ) : latestReadiness ? (
                <>
                  <div className="text-2xl font-bold">{latestReadiness.score}%</div>
                  <p className={`text-xs capitalize ${getZoneColor(latestReadiness.zone)}`}>
                    {latestReadiness.zone}
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Belum ada data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tes Fisik Terbaru</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm">...</div>
              ) : recentTests.length > 0 ? (
                <div className="space-y-1">
                  {recentTests.slice(0, 2).map((test, idx) => (
                    <div key={idx} className="text-xs">
                      <span className="font-medium">{test.test_name}:</span> {test.value} {test.unit}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Belum ada data</div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* Feature Cards */}
        {!isCoach && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Annual Plan</CardTitle>
                <p className="text-sm text-muted-foreground">GPP-SPP-Pra-Komp</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Periodisasi tahunan dengan grafik load</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Analisis Load</CardTitle>
                <p className="text-sm text-muted-foreground">FFF & ACWR</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Fitness, Fatigue, Form, dan ACWR monitoring</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Readiness</CardTitle>
                <p className="text-sm text-muted-foreground">VJ + RHR</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Monitoring kesiapan atlet harian</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Tes Fisik</CardTitle>
                <p className="text-sm text-muted-foreground">6 Kategori</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Tracking tes kondisi fisik atlet</p>
            </CardContent>
          </Card>
        </div>
        )}

        {!isCoach && (
        <Card>
          <CardHeader>
            <CardTitle>Fitur Utama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Training Load Otomatis</h3>
                <p className="text-sm text-muted-foreground">
                  Perhitungan load otomatis dari RPE × durasi dengan opsi edit manual
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Grafik FFF</h3>
                <p className="text-sm text-muted-foreground">
                  Visualisasi Fitness (CTL), Fatigue (ATL), dan Form (TSB)
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">ACWR Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Deteksi dini risiko overtraining dengan Acute:Chronic Workload Ratio
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Readiness Scoring</h3>
                <p className="text-sm text-muted-foreground">
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
