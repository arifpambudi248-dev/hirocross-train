import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { AlertTriangle, Shield, TrendingUp, Activity } from "lucide-react";
import { assessInjuryRisk, getRiskColor, getRiskBgColor } from "@/lib/injuryRisk";
import { computeACWR } from "@/lib/trainingLoad";
import { useNavigate } from "react-router-dom";

export default function InjuryRisk() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [acwrData, setAcwrData] = useState<any[]>([]);
  const [readinessData, setReadinessData] = useState<any[]>([]);
  const [loadData, setLoadData] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadRiskData(session.user.id);
  };

  async function loadRiskData(userId: string) {
    setLoading(true);
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
    setReadinessData(readinessChartData);

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

    setLoadData(loadChartData.reverse());

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
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Memuat data analisis risiko...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analisis Risiko Cedera</h1>
          <p className="text-muted-foreground">
            Monitoring risiko cedera berdasarkan ACWR, tren readiness, dan load spike
          </p>
        </div>

        {/* Overall Risk Assessment */}
        {riskAssessment && (
          <Alert className={`mb-6 border-2 ${getRiskBgColor(riskAssessment.overallRisk)}`}>
            <AlertTriangle className={`h-5 w-5 ${getRiskColor(riskAssessment.overallRisk)}`} />
            <AlertTitle className="text-lg font-bold">
              Status Risiko: <span className={`uppercase ${getRiskColor(riskAssessment.overallRisk)}`}>
                {riskAssessment.overallRisk === 'very-high' ? 'SANGAT TINGGI' :
                 riskAssessment.overallRisk === 'high' ? 'TINGGI' :
                 riskAssessment.overallRisk === 'moderate' ? 'SEDANG' : 'RENDAH'}
              </span>
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2">
                <p className="font-semibold mb-2">Skor Risiko: {riskAssessment.riskScore}/100</p>
                <div className="space-y-1">
                  <p className="font-semibold">Rekomendasi:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {riskAssessment.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Risk Factors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {riskAssessment?.factors.map((factor: any, idx: number) => (
            <Card key={idx} className={`border-l-4 ${getRiskBgColor(factor.severity)}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{factor.factor}</span>
                  <span className={`text-lg font-bold ${getRiskColor(factor.severity)}`}>
                    {factor.severity === 'very-high' ? '⚠️' :
                     factor.severity === 'high' ? '⚠' :
                     factor.severity === 'moderate' ? '⚡' : '✓'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-2">{factor.value}</p>
                <p className="text-sm text-muted-foreground">{factor.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ACWR Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                ACWR (14 Hari Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={acwrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" domain={[0, 2]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line type="monotone" dataKey="acwr" stroke="hsl(var(--primary))" strokeWidth={2} />
                  {/* Safe zone */}
                  <Line 
                    type="monotone" 
                    dataKey={() => 0.9} 
                    stroke="hsl(var(--chart-2))" 
                    strokeDasharray="5 5" 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={() => 1.2} 
                    stroke="hsl(var(--chart-2))" 
                    strokeDasharray="5 5" 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">
                Zona aman: 0.9 - 1.2 (garis putus-putus)
              </p>
            </CardContent>
          </Card>

          {/* Readiness Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Tren Readiness (7 Hari)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={readinessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" domain={[-20, 20]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                  <Line 
                    type="monotone" 
                    dataKey={() => 0} 
                    stroke="hsl(var(--border))" 
                    strokeDasharray="5 5" 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">
                Baseline = 0. Nilai negatif = di bawah baseline
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Load Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Beban Latihan Mingguan (5 Minggu)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Bar dataKey="load" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">
              Peningkatan &gt;10% per minggu meningkatkan risiko cedera
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
