import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Activity, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Athlete {
  id: string;
  athlete_name: string;
  avatar_url: string | null;
}

interface AthleteMetrics {
  athleteId: string;
  athleteName: string;
  avatarUrl: string | null;
  readiness: {
    averageScore: number;
    latestZone: string;
    totalLogs: number;
  };
  trainingLoad: {
    weeklyLoad: number;
    monthlyLoad: number;
    totalSessions: number;
  };
  physicalTests: {
    totalTests: number;
    categories: { category: string; avgScore: number }[];
  };
}

export default function AthleteComparison() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [metricsData, setMetricsData] = useState<AthleteMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCoachRole();
  }, []);

  const checkCoachRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role === "coach") {
        setIsCoach(true);
        loadAthletes();
      } else {
        toast({
          title: "Akses Ditolak",
          description: "Halaman ini hanya untuk pelatih",
          variant: "destructive",
        });
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error checking role:", error);
      setIsLoading(false);
    }
  };

  const loadAthletes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assignments, error: assignError } = await supabase
        .from("coach_athletes")
        .select("athlete_id")
        .eq("coach_id", user.id)
        .eq("status", "accepted");

      if (assignError) {
        console.error("Error loading assignments:", assignError);
      }

      if (!assignments || assignments.length === 0) {
        setAthletes([]);
        setIsLoading(false);
        toast({
          title: "Belum Ada Atlet",
          description: "Silakan assign atau tambahkan atlet terlebih dahulu di halaman Kelola Atlet",
        });
        return;
      }

      const athleteIds = assignments.map(a => a.athlete_id);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, athlete_name, avatar_url")
        .in("id", athleteIds);

      if (profileError) {
        console.error("Error loading profiles:", profileError);
        toast({
          title: "Error",
          description: "Gagal memuat profil atlet",
          variant: "destructive",
        });
      }

      if (profiles) {
        setAthletes(profiles);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading athletes:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data atlet",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (selectedAthletes.length === 0) {
      toast({
        title: "Pilih Atlet",
        description: "Pilih minimal 1 atlet untuk membandingkan",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingMetrics(true);
    const metrics: AthleteMetrics[] = [];

    for (const athleteId of selectedAthletes) {
      const athlete = athletes.find(a => a.id === athleteId);
      if (!athlete) continue;

      // Load readiness data
      const { data: readinessData } = await supabase
        .from("readiness_logs")
        .select("readiness_score, readiness_zone")
        .eq("athlete_id", athleteId)
        .order("date", { ascending: false });

      const readinessMetrics = {
        averageScore: readinessData && readinessData.length > 0
          ? readinessData.reduce((sum, log) => sum + log.readiness_score, 0) / readinessData.length
          : 0,
        latestZone: readinessData && readinessData.length > 0 ? readinessData[0].readiness_zone : "N/A",
        totalLogs: readinessData?.length || 0,
      };

      // Load training load data
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: weekSessions } = await supabase
        .from("training_sessions")
        .select("load_final")
        .eq("user_id", athleteId)
        .gte("date", weekAgo.toISOString().split('T')[0]);

      const { data: monthSessions } = await supabase
        .from("training_sessions")
        .select("load_final")
        .eq("user_id", athleteId)
        .gte("date", monthAgo.toISOString().split('T')[0]);

      const trainingMetrics = {
        weeklyLoad: weekSessions?.reduce((sum, s) => sum + (s.load_final || 0), 0) || 0,
        monthlyLoad: monthSessions?.reduce((sum, s) => sum + (s.load_final || 0), 0) || 0,
        totalSessions: monthSessions?.length || 0,
      };

      // Load physical tests data
      const { data: testsData } = await supabase
        .from("physical_tests")
        .select("category, value")
        .eq("athlete_id", athleteId);

      const categoriesMap = new Map<string, number[]>();
      testsData?.forEach(test => {
        if (!categoriesMap.has(test.category)) {
          categoriesMap.set(test.category, []);
        }
        categoriesMap.get(test.category)?.push(test.value);
      });

      const categories = Array.from(categoriesMap.entries()).map(([category, values]) => ({
        category,
        avgScore: values.reduce((sum, v) => sum + v, 0) / values.length,
      }));

      const physicalMetrics = {
        totalTests: testsData?.length || 0,
        categories,
      };

      metrics.push({
        athleteId,
        athleteName: athlete.athlete_name,
        avatarUrl: athlete.avatar_url,
        readiness: readinessMetrics,
        trainingLoad: trainingMetrics,
        physicalTests: physicalMetrics,
      });
    }

    setMetricsData(metrics);
    setIsLoadingMetrics(false);
  };

  const handleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes(prev => {
      if (prev.includes(athleteId)) {
        return prev.filter(id => id !== athleteId);
      } else if (prev.length < 4) {
        return [...prev, athleteId];
      } else {
        toast({
          title: "Maksimal 4 Atlet",
          description: "Anda hanya dapat membandingkan maksimal 4 atlet sekaligus",
          variant: "destructive",
        });
        return prev;
      }
    });
  };

  const getZoneColor = (zone: string) => {
    switch (zone.toLowerCase()) {
      case "prime": return "bg-green-500";
      case "moderate": return "bg-yellow-500";
      case "low": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Perbandingan Atlet</h1>
            <p className="text-muted-foreground">
              Bandingkan metrik performa hingga 4 atlet secara bersamaan
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pilih Atlet untuk Dibandingkan</CardTitle>
              <CardDescription>Pilih minimal 1 dan maksimal 4 atlet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {athletes.map(athlete => (
                  <Button
                    key={athlete.id}
                    variant={selectedAthletes.includes(athlete.id) ? "default" : "outline"}
                    className="h-auto py-3"
                    onClick={() => handleAthleteSelection(athlete.id)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={athlete.avatar_url || undefined} />
                        <AvatarFallback>{athlete.athlete_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-center">{athlete.athlete_name}</span>
                    </div>
                  </Button>
                ))}
              </div>
              
              <Button 
                onClick={loadMetrics} 
                disabled={isLoadingMetrics || selectedAthletes.length === 0}
                className="w-full"
              >
                {isLoadingMetrics ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memuat Data...
                  </>
                ) : (
                  "Bandingkan Metrik"
                )}
              </Button>
            </CardContent>
          </Card>

          {metricsData.length > 0 && (
            <div className="space-y-6">
              {/* Readiness Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Perbandingan Readiness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {metricsData.map(data => (
                      <div key={data.athleteId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar>
                            <AvatarImage src={data.avatarUrl || undefined} />
                            <AvatarFallback>{data.athleteName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold">{data.athleteName}</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Rata-rata Skor</span>
                            <span className="font-bold text-lg">{data.readiness.averageScore.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Zona Terkini</span>
                            <Badge className={getZoneColor(data.readiness.latestZone)}>
                              {data.readiness.latestZone}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Log</span>
                            <span className="font-medium">{data.readiness.totalLogs}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Training Load Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Perbandingan Beban Latihan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {metricsData.map(data => (
                      <div key={data.athleteId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar>
                            <AvatarImage src={data.avatarUrl || undefined} />
                            <AvatarFallback>{data.athleteName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold">{data.athleteName}</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Beban 7 Hari</span>
                            <span className="font-bold text-lg">{data.trainingLoad.weeklyLoad}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Beban 30 Hari</span>
                            <span className="font-bold text-lg">{data.trainingLoad.monthlyLoad}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Sesi</span>
                            <span className="font-medium">{data.trainingLoad.totalSessions}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Physical Tests Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Perbandingan Tes Fisik
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {metricsData.map(data => (
                      <div key={data.athleteId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar>
                            <AvatarImage src={data.avatarUrl || undefined} />
                            <AvatarFallback>{data.athleteName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold">{data.athleteName}</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Total Tes</span>
                            <span className="font-bold">{data.physicalTests.totalTests}</span>
                          </div>
                          {data.physicalTests.categories.length > 0 ? (
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Rata-rata per Kategori:</span>
                              {data.physicalTests.categories.map(cat => (
                                <div key={cat.category} className="flex justify-between text-sm">
                                  <span className="capitalize">{cat.category}</span>
                                  <span className="font-medium">{cat.avgScore.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Belum ada data tes</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {metricsData.length === 0 && !isLoadingMetrics && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Pilih atlet dan klik "Bandingkan Metrik" untuk melihat perbandingan
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
