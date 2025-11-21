import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { CalendarDays, TrendingUp, Activity, Zap } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { id } from "date-fns/locale";

type ComparisonPeriod = "month" | "season";

export default function Historical() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("month");
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  
  // Data states
  const [readinessData, setReadinessData] = useState<any[]>([]);
  const [loadData, setLoadData] = useState<any[]>([]);
  const [physicalTestData, setPhysicalTestData] = useState<any[]>([]);

  useEffect(() => {
    loadHistoricalData();
  }, [comparisonPeriod, selectedMonths]);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Calculate date ranges based on comparison period
      const periods = getPeriods(comparisonPeriod, selectedMonths);
      
      // Fetch readiness data for each period
      const readinessPromises = periods.map(async (period) => {
        const { data } = await supabase
          .from("readiness_logs")
          .select("*")
          .eq("athlete_id", user.id)
          .gte("date", period.start)
          .lte("date", period.end)
          .order("date");
        
        const avgReadiness = data && data.length > 0
          ? data.reduce((sum, log) => sum + log.readiness_score, 0) / data.length
          : 0;
        
        return {
          period: period.label,
          avgReadiness: avgReadiness.toFixed(1),
          count: data?.length || 0
        };
      });

      // Fetch training load data for each period
      const loadPromises = periods.map(async (period) => {
        const { data } = await supabase
          .from("training_sessions")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", period.start)
          .lte("date", period.end);
        
        const totalLoad = data?.reduce((sum, session) => sum + (session.load_final || 0), 0) || 0;
        const avgLoad = data && data.length > 0 ? totalLoad / data.length : 0;
        
        return {
          period: period.label,
          totalLoad: Math.round(totalLoad),
          avgLoad: Math.round(avgLoad),
          sessions: data?.length || 0
        };
      });

      // Fetch physical test data for each period
      const testPromises = periods.map(async (period) => {
        const { data } = await supabase
          .from("physical_tests")
          .select("*")
          .eq("athlete_id", user.id)
          .gte("test_date", period.start)
          .lte("test_date", period.end);
        
        // Group by category and calculate averages
        const byCategory: Record<string, number[]> = {};
        data?.forEach(test => {
          if (!byCategory[test.category]) {
            byCategory[test.category] = [];
          }
          byCategory[test.category].push(test.value);
        });

        const avgByCategory: Record<string, number> = {};
        Object.keys(byCategory).forEach(category => {
          const values = byCategory[category];
          avgByCategory[category] = values.reduce((sum, v) => sum + v, 0) / values.length;
        });

        return {
          period: period.label,
          ...avgByCategory
        };
      });

      const [readiness, loads, tests] = await Promise.all([
        Promise.all(readinessPromises),
        Promise.all(loadPromises),
        Promise.all(testPromises)
      ]);

      setReadinessData(readiness);
      setLoadData(loads);
      setPhysicalTestData(tests);
      
    } catch (error) {
      console.error("Error loading historical data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriods = (period: ComparisonPeriod, count: number) => {
    const periods = [];
    const now = new Date();

    if (period === "month") {
      for (let i = count - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        periods.push({
          start: format(monthStart, "yyyy-MM-dd"),
          end: format(monthEnd, "yyyy-MM-dd"),
          label: format(monthStart, "MMM yyyy", { locale: id })
        });
      }
    } else {
      // Season comparison (quarters)
      for (let i = count - 1; i >= 0; i--) {
        const quarterMonths = Math.floor(i / 3) * 3;
        const monthStart = startOfMonth(subMonths(now, quarterMonths));
        const monthEnd = endOfMonth(subMonths(now, quarterMonths + 2));
        periods.push({
          start: format(monthStart, "yyyy-MM-dd"),
          end: format(monthEnd, "yyyy-MM-dd"),
          label: `Q${4 - Math.floor(i / 3)} ${format(monthStart, "yyyy")}`
        });
      }
    }

    return periods;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Memuat data historis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Perbandingan Historis</h1>
            <p className="text-muted-foreground mt-2">
              Analisis perubahan performa dari waktu ke waktu
            </p>
          </div>
          
          <div className="flex gap-4">
            <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Bulanan</SelectItem>
                <SelectItem value="season">Musiman</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedMonths.toString()} onValueChange={(v) => setSelectedMonths(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Periode</SelectItem>
                <SelectItem value="6">6 Periode</SelectItem>
                <SelectItem value="12">12 Periode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="readiness" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="readiness">Kesiapan</TabsTrigger>
            <TabsTrigger value="load">Beban Latihan</TabsTrigger>
            <TabsTrigger value="tests">Tes Fisik</TabsTrigger>
          </TabsList>

          <TabsContent value="readiness" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Tren Skor Kesiapan
                </CardTitle>
                <CardDescription>
                  Rata-rata skor kesiapan harian per periode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={readinessData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 10]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))" 
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgReadiness" 
                      stroke="hsl(var(--primary))" 
                      name="Rata-rata Kesiapan"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {readinessData.map((period, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{period.period}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rata-rata:</span>
                        <span className="font-bold text-primary">{period.avgReadiness}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Log:</span>
                        <span>{period.count} hari</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="load" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Tren Beban Latihan
                </CardTitle>
                <CardDescription>
                  Total dan rata-rata beban latihan per periode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={loadData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))" 
                      }}
                    />
                    <Legend />
                    <Bar dataKey="totalLoad" fill="hsl(var(--primary))" name="Total Beban" />
                    <Bar dataKey="avgLoad" fill="hsl(var(--secondary))" name="Rata-rata Beban" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {loadData.map((period, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{period.period}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total:</span>
                        <span className="font-bold text-primary">{period.totalLoad}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rata-rata:</span>
                        <span>{period.avgLoad}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sesi:</span>
                        <span>{period.sessions}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Perbandingan Tes Fisik
                </CardTitle>
                <CardDescription>
                  Rata-rata hasil tes fisik per kategori dan periode
                </CardDescription>
              </CardHeader>
              <CardContent>
                {physicalTestData.length > 0 && (
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={physicalTestData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                      <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))" 
                        }}
                      />
                      <Legend />
                      {Object.keys(physicalTestData[0] || {})
                        .filter(key => key !== "period")
                        .map((category, idx) => (
                          <Radar
                            key={category}
                            name={category}
                            dataKey={category}
                            stroke={`hsl(${idx * 60}, 70%, 50%)`}
                            fill={`hsl(${idx * 60}, 70%, 50%)`}
                            fillOpacity={0.2}
                          />
                        ))}
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
