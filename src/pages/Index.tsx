import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Activity, Target, Dumbbell, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [weeklyLoad, setWeeklyLoad] = useState<number>(0);
  const [latestReadiness, setLatestReadiness] = useState<{ score: number; zone: string } | null>(null);
  const [recentTests, setRecentTests] = useState<Array<{ test_name: string; value: number; unit: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setUserId(user.id);

    // Load weekly training load (last 7 days)
    const startDate = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const { data: sessions } = await supabase
      .from("training_sessions")
      .select("load_final")
      .eq("user_id", user.id)
      .gte("date", startDate);
    
    if (sessions) {
      const total = sessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
      setWeeklyLoad(total);
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

    setLoading(false);
  }

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'prime': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'low': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sistem Periodisasi Latihan Atletik
          </h1>
          <p className="text-muted-foreground text-lg">
            Platform komprehensif untuk monitoring dan analisis performa atlet
          </p>
        </div>

        {/* Dashboard Overview */}
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

        {/* Feature Cards */}
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
      </div>
    </div>
  );
};

export default Index;
