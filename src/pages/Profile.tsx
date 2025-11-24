import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Activity, Shield, TrendingUp, Brain, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { computeReadinessScore } from "@/lib/readiness";
import { assessInjuryRisk, getRiskColor, getRiskBgColor } from "@/lib/injuryRisk";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [readinessData, setReadinessData] = useState<any[]>([]);
  const [loadData, setLoadData] = useState<any[]>([]);
  const [physicalTests, setPhysicalTests] = useState<any[]>([]);
  const [injuryRisk, setInjuryRisk] = useState<any>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Load readiness logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: readinessLogs } = await supabase
        .from("readiness_logs")
        .select("*")
        .eq("athlete_id", user.id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });
      setReadinessData(readinessLogs || []);

      // Load training sessions (last 30 days)
      const { data: sessions } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });
      setLoadData(sessions || []);

      // Load physical tests (latest per category)
      const { data: tests } = await supabase
        .from("physical_tests")
        .select("*")
        .eq("athlete_id", user.id)
        .order("test_date", { ascending: false });
      
      // Get latest test per category
      const latestTests: any[] = [];
      const categories = new Set<string>();
      tests?.forEach((test) => {
        if (!categories.has(test.category)) {
          categories.add(test.category);
          latestTests.push(test);
        }
      });
      setPhysicalTests(latestTests);

      // Calculate injury risk
      if (readinessLogs && sessions) {
        const last7DaysReadiness = readinessLogs.slice(-7).map(r => r.readiness_score);
        
        // Group sessions by week
        const weeklyLoads: number[] = [];
        const weeksAgo = 5;
        for (let i = weeksAgo; i > 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          const weekSessions = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= weekStart && sessionDate < weekEnd;
          });
          const weekLoad = weekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
          weeklyLoads.push(weekLoad);
        }

        const currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        const currentWeekSessions = sessions.filter(s => new Date(s.date) >= currentWeekStart);
        const currentWeekLoad = currentWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);

        // Calculate ACWR
        const acuteLoad = weeklyLoads.slice(-1)[0] || 0;
        const chronicLoad = weeklyLoads.slice(-4).reduce((a, b) => a + b, 0) / 4;
        const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

        const risk = assessInjuryRisk(acwr, last7DaysReadiness, weeklyLoads, currentWeekLoad);
        setInjuryRisk(risk);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading profile data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data profil",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const getAICoachFeedback = async () => {
    setIsLoadingAI(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const last7DaysReadiness = readinessData.slice(-7).map(r => r.readiness_score);
      const avgReadiness = last7DaysReadiness.length > 0 
        ? last7DaysReadiness.reduce((a, b) => a + b, 0) / last7DaysReadiness.length
        : 0;

      const weeklyLoads = [];
      for (let i = 4; i > 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        const weekSessions = loadData.filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate >= weekStart && sessionDate < weekEnd;
        });
        const weekLoad = weekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
        weeklyLoads.push(weekLoad);
      }

      const currentWeekStart = new Date();
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      const currentWeekSessions = loadData.filter(s => new Date(s.date) >= currentWeekStart);
      const currentWeekLoad = currentWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);

      const acuteLoad = weeklyLoads.slice(-1)[0] || 0;
      const chronicLoad = weeklyLoads.slice(-4).reduce((a, b) => a + b, 0) / 4;
      const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

      const athleteData = {
        name: profile?.athlete_name || "Atlet",
        readinessScores: last7DaysReadiness,
        avgReadiness: avgReadiness.toFixed(1),
        injuryRisk: injuryRisk?.overallRisk,
        riskScore: injuryRisk?.riskScore,
        acwr: acwr.toFixed(2),
        currentWeekLoad,
        weeklyLoads,
        physicalTests: physicalTests.map(t => ({
          test_name: t.test_name,
          value: t.value,
          unit: t.unit,
        })),
        riskFactors: injuryRisk?.factors || [],
      };

      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { athleteData },
      });

      if (error) throw error;

      setAiFeedback(data.feedback);
      toast({
        title: "AI Coach Feedback",
        description: "Feedback personal telah dihasilkan",
      });
    } catch (error) {
      console.error("Error getting AI feedback:", error);
      toast({
        title: "Error",
        description: "Gagal mendapatkan feedback dari AI Coach",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const avgReadiness = readinessData.length > 0
    ? readinessData.reduce((sum, r) => sum + r.readiness_score, 0) / readinessData.length
    : 0;

  const totalLoad = loadData.reduce((sum, s) => sum + (s.load_final || 0), 0);

  // Prepare radar chart data
  const benchmarks: { [key: string]: number[] } = {
    "daya_tahan": [2000, 2200, 2400, 2600, 2800],
    "kecepatan": [7.5, 7.0, 6.5, 6.0, 5.5],
    "kekuatan": [40, 50, 60, 70, 80],
    "kelincahan": [20, 18, 16, 14, 12],
    "fleksibilitas": [10, 15, 20, 25, 30],
    "power": [30, 35, 40, 45, 50],
  };

  const radarData = [
    { category: "Daya Tahan", value: 0, benchmark: 0 },
    { category: "Kecepatan", value: 0, benchmark: 0 },
    { category: "Kekuatan", value: 0, benchmark: 0 },
    { category: "Kelincahan", value: 0, benchmark: 0 },
    { category: "Fleksibilitas", value: 0, benchmark: 0 },
    { category: "Power", value: 0, benchmark: 0 },
  ];

  physicalTests.forEach((test) => {
    const categoryMap: { [key: string]: string } = {
      "daya_tahan": "Daya Tahan",
      "kecepatan": "Kecepatan",
      "kekuatan": "Kekuatan",
      "kelincahan": "Kelincahan",
      "fleksibilitas": "Fleksibilitas",
      "power": "Power",
    };
    
    const categoryName = categoryMap[test.category];
    if (categoryName) {
      const dataPoint = radarData.find(d => d.category === categoryName);
      if (dataPoint) {
        const benchmarkArray = benchmarks[test.category];
        // Normalize to 0-100 scale
        const minBench = benchmarkArray[0];
        const maxBench = benchmarkArray[4];
        
        let normalizedValue: number;
        if (test.category === "kecepatan" || test.category === "kelincahan") {
          // Lower is better
          normalizedValue = ((maxBench - test.value) / (maxBench - minBench)) * 100;
        } else {
          // Higher is better
          normalizedValue = ((test.value - minBench) / (maxBench - minBench)) * 100;
        }
        
        dataPoint.value = Math.max(0, Math.min(100, normalizedValue));
        dataPoint.benchmark = 60; // Mid-point benchmark
      }
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex items-start gap-6">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarFallback className="bg-slate-900 text-primary text-2xl">
            {profile?.athlete_name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">{profile?.athlete_name || "Atlet"}</h1>
            <p className="text-slate-400 mb-4">Profil Komprehensif & Analisis Performa</p>
            
            <div className="flex gap-4">
              <Button 
                onClick={getAICoachFeedback} 
                disabled={isLoadingAI}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoadingAI ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Dapatkan AI Coach Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* AI Feedback Section */}
        {aiFeedback && (
          <Card className="border-purple-500/20 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Brain className="h-5 w-5" />
                AI Coach Feedback Personal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none whitespace-pre-line text-slate-300">
                {aiFeedback}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Avg Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {avgReadiness.toFixed(1)}%
              </div>
              <Badge className={`mt-2 ${
                avgReadiness > 5 ? "bg-green-500/10 text-green-500" :
                avgReadiness > 0 ? "bg-yellow-500/10 text-yellow-500" :
                "bg-orange-500/10 text-orange-500"
              }`}>
                {avgReadiness > 5 ? "Prime" : avgReadiness > 0 ? "Moderate" : "Low"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Total Load (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {totalLoad} AU
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {loadData.length} sesi latihan
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Injury Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              {injuryRisk ? (
                <>
                  <div className="text-2xl font-bold text-white capitalize">
                    {injuryRisk.overallRisk.replace("-", " ")}
                  </div>
                  <Badge className={`mt-2 ${getRiskBgColor(injuryRisk.overallRisk)}`}>
                    Score: {injuryRisk.riskScore}/100
                  </Badge>
                </>
              ) : (
                <div className="text-slate-500">Tidak ada data</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                Physical Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {physicalTests.length}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Kategori tersedia
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Readiness Trend */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Tren Readiness (30 Hari)</CardTitle>
              <CardDescription>Skor kesiapan harian atlet</CardDescription>
            </CardHeader>
            <CardContent>
              {readinessData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={readinessData}>
                    <defs>
                      <linearGradient id="readinessGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="readiness_score" 
                      stroke="#06b6d4" 
                      fill="url(#readinessGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-slate-500">
                  Belum ada data readiness
                </div>
              )}
            </CardContent>
          </Card>

          {/* Physical Performance Radar */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Performa Fisik vs Benchmark</CardTitle>
              <CardDescription>Hasil tes terbaru per kategori</CardDescription>
            </CardHeader>
            <CardContent>
              {physicalTests.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Radar 
                      name="Atlet" 
                      dataKey="value" 
                      stroke="#06b6d4" 
                      fill="#06b6d4" 
                      fillOpacity={0.5}
                    />
                    <Radar 
                      name="Benchmark" 
                      dataKey="benchmark" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.2}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#e2e8f0' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-slate-500">
                  Belum ada data tes fisik
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Injury Risk Details */}
        {injuryRisk && (
          <Card className={`border-2 ${getRiskBgColor(injuryRisk.overallRisk)}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Analisis Risiko Cedera
              </CardTitle>
              <CardDescription>
                Assessment komprehensif berdasarkan beban latihan, readiness, dan pola training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Risk Factors:</h3>
                <div className="space-y-2">
                  {injuryRisk.factors.map((factor: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Badge className={getRiskBgColor(factor.severity)}>
                        {factor.severity}
                      </Badge>
                      <div>
                        <div className="font-medium text-white">{factor.factor}: {factor.value}</div>
                        <div className="text-slate-400">{factor.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <div>
                <h3 className="font-semibold text-white mb-2">Rekomendasi:</h3>
                <ul className="space-y-1 text-sm text-slate-300">
                  {injuryRisk.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Baseline Info */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Baseline Metrics</CardTitle>
            <CardDescription>Nilai baseline untuk perhitungan readiness</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-slate-400">Baseline VJ</div>
              <div className="text-xl font-bold text-white">{profile?.baseline_vj || 40} cm</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Baseline RHR</div>
              <div className="text-xl font-bold text-white">{profile?.baseline_rhr || 60} bpm</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
