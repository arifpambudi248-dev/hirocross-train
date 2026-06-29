import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, TrendingDown, Activity, Target, Dumbbell, Heart, Users, AlertCircle, CheckCircle, Trophy, Flame, Zap, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateTrainingRecommendation } from "@/lib/trainingRecommendations";

type AthleteStats = {
  athlete_id: string;
  athlete_name: string;
  avatar_url: string | null;
  latest_readiness: number;
  readiness_zone: string;
  weekly_load: number;
  avg_weekly_load: number;
  sessions_count: number;
  strength_volume: number;
  cardio_distance: number;
  skill_reps: number;
  last_session_date: string | null;
};

type RecentSession = {
  id: string;
  athlete_name: string;
  avatar_url: string | null;
  session_name: string;
  date: string;
  load_final: number;
  rpe: number;
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
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [previousTeamLoad, setPreviousTeamLoad] = useState<number>(0);
  const [previousTeamReadiness, setPreviousTeamReadiness] = useState<number>(0);
  const [coachPeriod, setCoachPeriod] = useState<string>("7");
  const navigate = useNavigate();

  const COACH_PERIODS: Record<string, { label: string; days: number }> = {
    "7": { label: "Minggu Ini (7 hari)", days: 7 },
    "14": { label: "2 Minggu", days: 14 },
    "28": { label: "Bulan / Mesocycle (28 hari)", days: 28 },
    "90": { label: "3 Bulan", days: 90 },
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (isCoach) loadTeamData(COACH_PERIODS[coachPeriod].days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachPeriod, isCoach]);

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

    // Coach team data is loaded by the coachPeriod effect

    setLoading(false);
  }


  async function loadTeamData(periodDays: number = 7) {
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
      .select("id, athlete_name, avatar_url")
      .in("id", athleteIds);
    
    if (!profiles) return;

    const stats: AthleteStats[] = [];
    const now = new Date();
    const thisWeekStart = format(subDays(now, periodDays - 1), "yyyy-MM-dd");
    const previousPeriodStart = format(subDays(now, periodDays * 2 - 1), "yyyy-MM-dd");
    const previousPeriodEnd = format(subDays(now, periodDays), "yyyy-MM-dd");
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

      // Get weekly sessions with all volume metrics
      const { data: weekSessions } = await supabase
        .from("training_sessions")
        .select("load_final, strength_volume, cardio_distance, skill_reps, date")
        .eq("user_id", profile.id)
        .gte("date", thisWeekStart)
        .order("date", { ascending: false });

      const weeklyLoad = weekSessions?.reduce((sum, s) => sum + (s.load_final || 0), 0) || 0;
      const strengthVolume = weekSessions?.reduce((sum, s) => sum + (s.strength_volume || 0), 0) || 0;
      const cardioDistance = weekSessions?.reduce((sum, s) => sum + (s.cardio_distance || 0), 0) || 0;
      const skillReps = weekSessions?.reduce((sum, s) => sum + (s.skill_reps || 0), 0) || 0;
      const sessionsCount = weekSessions?.length || 0;
      const lastSessionDate = weekSessions && weekSessions.length > 0 ? weekSessions[0].date : null;

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
        avatar_url: profile.avatar_url,
        latest_readiness: readiness?.readiness_score || 0,
        readiness_zone: readiness?.readiness_zone || 'moderate',
        weekly_load: weeklyLoad,
        avg_weekly_load: avgLoad,
        sessions_count: sessionsCount,
        strength_volume: strengthVolume,
        cardio_distance: cardioDistance,
        skill_reps: skillReps,
        last_session_date: lastSessionDate,
      });
    }

    setTeamStats(stats);

    // Load recent sessions feed for the team (last 8)
    const { data: recent } = await supabase
      .from("training_sessions")
      .select("id, user_id, session_name, date, load_final, rpe")
      .in("user_id", athleteIds)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    if (recent) {
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      setRecentSessions(
        recent.map((s) => {
          const p = profileMap.get(s.user_id);
          return {
            id: s.id,
            athlete_name: p?.athlete_name || "Atlet",
            avatar_url: p?.avatar_url || null,
            session_name: s.session_name,
            date: s.date,
            load_final: s.load_final || 0,
            rpe: s.rpe || 0,
          };
        })
      );
    }

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

    if (trends.length >= 2) {
      setPreviousTeamLoad(trends[trends.length - 2].load);
      setPreviousTeamReadiness(trends[trends.length - 2].readiness);
    }
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
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1 sm:mb-2">
              {isCoach ? "Dashboard Pelatih" : "Sistem Periodisasi Latihan Atletik"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              {isCoach
                ? "Monitoring dan analisis performa tim secara keseluruhan"
                : "Platform komprehensif untuk monitoring dan analisis performa atlet"}
            </p>
          </div>
          {isCoach && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Periode:</span>
              <Select value={coachPeriod} onValueChange={setCoachPeriod}>
                <SelectTrigger className="w-full sm:w-[240px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COACH_PERIODS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
        {isCoach && (() => {
          const totalLoad = teamStats.reduce((sum, a) => sum + a.weekly_load, 0);
          const avgLoad = Math.round(totalLoad / Math.max(teamStats.length, 1));
          const avgReadiness = Math.round(teamStats.reduce((sum, a) => sum + a.latest_readiness, 0) / Math.max(teamStats.length, 1));
          const primeCount = teamStats.filter(a => a.readiness_zone === 'prime').length;
          const moderateCount = teamStats.filter(a => a.readiness_zone === 'moderate').length;
          const lowCount = teamStats.filter(a => a.readiness_zone === 'low').length;
          const totalStrength = teamStats.reduce((s, a) => s + a.strength_volume, 0);
          const totalCardio = teamStats.reduce((s, a) => s + a.cardio_distance, 0);
          const totalSkill = teamStats.reduce((s, a) => s + a.skill_reps, 0);
          const totalSessions = teamStats.reduce((s, a) => s + a.sessions_count, 0);

          const loadDelta = previousTeamLoad > 0 ? Math.round(((totalLoad - previousTeamLoad) / previousTeamLoad) * 100) : 0;
          const readinessDelta = previousTeamReadiness > 0 ? avgReadiness - previousTeamReadiness : 0;

          const topPerformers = [...teamStats].sort((a, b) => b.weekly_load - a.weekly_load).slice(0, 3);
          const needAttention = [...teamStats]
            .filter(a => a.readiness_zone === 'low' || a.sessions_count === 0)
            .sort((a, b) => a.latest_readiness - b.latest_readiness)
            .slice(0, 3);

          const zoneData = [
            { name: 'Prime', value: primeCount, color: 'hsl(142 71% 45%)' },
            { name: 'Moderate', value: moderateCount, color: 'hsl(45 93% 47%)' },
            { name: 'Low', value: lowCount, color: 'hsl(0 84% 60%)' },
          ].filter(d => d.value > 0);

          const volumeData = [
            { name: 'Strength', value: Math.round(totalStrength), fill: 'hsl(var(--primary))' },
            { name: 'Cardio (m)', value: Math.round(totalCardio), fill: 'hsl(var(--chart-2))' },
            { name: 'Skill', value: Math.round(totalSkill), fill: 'hsl(var(--chart-3))' },
          ];

          return (
          <>
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6 relative">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Atlet</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 relative">
                  <div className="text-2xl sm:text-3xl font-bold">{teamStats.length}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {totalSessions} sesi minggu ini
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500/10 to-orange-500/5">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6 relative">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Load Tim</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/20">
                    <Dumbbell className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 relative">
                  <div className="text-2xl sm:text-3xl font-bold">{loading ? "..." : totalLoad.toLocaleString()}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {loadDelta >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <p className={`text-[10px] sm:text-xs ${loadDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Math.abs(loadDelta)}% vs minggu lalu
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-pink-500/10 to-pink-500/5">
                <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6 relative">
                  <CardTitle className="text-xs sm:text-sm font-medium">Avg Readiness</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/20">
                    <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-pink-500" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 relative">
                  <div className="text-2xl sm:text-3xl font-bold">{loading ? "..." : avgReadiness}%</div>
                  <div className="flex items-center gap-1 mt-1">
                    {readinessDelta >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <p className={`text-[10px] sm:text-xs ${readinessDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {readinessDelta >= 0 ? '+' : ''}{readinessDelta} pts
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 to-green-500/5">
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6 relative">
                  <CardTitle className="text-xs sm:text-sm font-medium">Atlet Siap Tempur</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 relative">
                  <div className="text-2xl sm:text-3xl font-bold">{loading ? "..." : primeCount}<span className="text-sm text-muted-foreground">/{teamStats.length}</span></div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {lowCount > 0 ? `${lowCount} perlu perhatian` : 'Tim dalam kondisi baik'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
              {/* Tren Tim - takes 2 cols */}
              <Card className="lg:col-span-2">
                <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Tren Tim (4 Minggu)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">Load & Readiness</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={teamTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" stroke="hsl(var(--primary))" tick={{ fontSize: 10 }} width={35} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" tick={{ fontSize: 10 }} width={35} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line yAxisId="left" type="monotone" dataKey="load" stroke="hsl(var(--primary))" name="Total Load (AU)" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="readiness" stroke="hsl(var(--chart-2))" name="Readiness (%)" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribusi Readiness */}
              <Card>
                <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
                  <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Distribusi Zona
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 lg:p-6 pt-0">
                  {zoneData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={zoneData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                          {zoneData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px', borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Belum ada data readiness</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Volume Breakdown */}
            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
                <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Volume Latihan Tim Minggu Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-lg bg-primary/5">
                    <Dumbbell className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-lg sm:text-xl font-bold">{Math.round(totalStrength).toLocaleString()}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Strength kg</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-chart-2/5">
                    <Activity className="h-4 w-4 mx-auto mb-1" style={{ color: 'hsl(var(--chart-2))' }} />
                    <div className="text-lg sm:text-xl font-bold">{Math.round(totalCardio).toLocaleString()}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Cardio meter</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-chart-3/5">
                    <Zap className="h-4 w-4 mx-auto mb-1" style={{ color: 'hsl(var(--chart-3))' }} />
                    <div className="text-lg sm:text-xl font-bold">{Math.round(totalSkill).toLocaleString()}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Skill reps</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={volumeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers + Need Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
                  <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Top Performer
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-2">
                  {topPerformers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada data sesi minggu ini</p>
                  ) : topPerformers.map((a, idx) => (
                    <div key={a.athlete_id} onClick={() => navigate(`/coach/athlete/${a.athlete_id}`)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-300 text-gray-800' : 'bg-orange-700 text-white'
                      }`}>{idx + 1}</div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={a.avatar_url || undefined} />
                        <AvatarFallback>{a.athlete_name?.[0] || 'A'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{a.athlete_name}</p>
                        <p className="text-[10px] text-muted-foreground">{a.sessions_count} sesi · {a.weekly_load} AU</p>
                      </div>
                      <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
                  <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Perlu Perhatian
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-2">
                  {needAttention.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Semua atlet dalam kondisi baik ✓</p>
                  ) : needAttention.map((a) => (
                    <div key={a.athlete_id} onClick={() => navigate(`/coach/athlete/${a.athlete_id}`)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={a.avatar_url || undefined} />
                        <AvatarFallback>{a.athlete_name?.[0] || 'A'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{a.athlete_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {a.sessions_count === 0 ? 'Belum latihan minggu ini' : `Readiness ${a.latest_readiness}% · ${a.readiness_zone}`}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">!</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Status Atlet - detailed */}
            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Status Detail Atlet
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">{teamStats.length} atlet</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {teamStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Belum ada atlet terdaftar</p>
                  ) : teamStats.map((athlete) => {
                    const loadPercent = Math.min(100, (athlete.weekly_load / Math.max(athlete.avg_weekly_load * 1.5, 100)) * 100);
                    return (
                      <div key={athlete.athlete_id} className="p-3 border border-border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={athlete.avatar_url || undefined} />
                            <AvatarFallback>{athlete.athlete_name?.[0] || 'A'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base truncate">{athlete.athlete_name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {athlete.sessions_count} sesi · {athlete.last_session_date ? format(parseISO(athlete.last_session_date), 'd MMM', { locale: idLocale }) : 'belum latihan'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg sm:text-xl font-bold ${
                              athlete.readiness_zone === 'prime' ? 'text-green-500' :
                              athlete.readiness_zone === 'moderate' ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              {athlete.latest_readiness}%
                            </p>
                            <Badge variant="outline" className={`text-[9px] capitalize ${
                              athlete.readiness_zone === 'prime' ? 'border-green-500 text-green-500' :
                              athlete.readiness_zone === 'moderate' ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500'
                            }`}>{athlete.readiness_zone}</Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Load minggu ini: {athlete.weekly_load} AU</span>
                            <span>Avg 4w: {Math.round(athlete.avg_weekly_load)}</span>
                          </div>
                          <Progress value={loadPercent} className="h-1.5" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border">
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground">Strength</p>
                            <p className="text-xs font-semibold">{Math.round(athlete.strength_volume)} kg</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground">Cardio</p>
                            <p className="text-xs font-semibold">{Math.round(athlete.cardio_distance)} m</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground">Skill</p>
                            <p className="text-xs font-semibold">{Math.round(athlete.skill_reps)} reps</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
                <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                {recentSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas latihan</p>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={s.avatar_url || undefined} />
                          <AvatarFallback>{s.athlete_name?.[0] || 'A'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            <span className="text-primary">{s.athlete_name}</span> — {s.session_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(parseISO(s.date), 'EEE, d MMM', { locale: idLocale })} · RPE {s.rpe}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{s.load_final} AU</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
          );
        })()}

        {/* Athlete Dashboard Overview */}
        {!isCoach && (
          <>

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
      <BottomNavigation />
    </div>
  );
};

export default Index;
