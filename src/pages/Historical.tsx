import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { CalendarDays, TrendingUp, Activity, Zap, Target, Plus, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { goalSchema } from "@/lib/validationSchemas";
import { handleError, getFriendlyErrorMessage } from "@/lib/errorHandling";
import { z } from "zod";

type ComparisonPeriod = "month" | "season";

type Goal = {
  id: string;
  goal_type: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  target_date: string;
  current_value: number;
  baseline_value: number;
  notes: string;
  status: string;
  created_at: string;
};

export default function Historical() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("month");
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  
  // Historical data states
  const [readinessData, setReadinessData] = useState<any[]>([]);
  const [loadData, setLoadData] = useState<any[]>([]);
  const [physicalTestData, setPhysicalTestData] = useState<any[]>([]);
  
  // Goals data states
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [goalType, setGoalType] = useState("readiness");
  const [goalName, setGoalName] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [baselineValue, setBaselineValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedAthleteId) {
      loadHistoricalData();
      loadGoals();
    }
  }, [selectedAthleteId, comparisonPeriod, selectedMonths]);

  const loadUser = async () => {
    try {
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

      if (userIsCoach) {
        // Load all athletes
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, athlete_name")
          .order("athlete_name");
        
        if (profilesData && profilesData.length > 0) {
          setAthletes(profilesData);
          setSelectedAthleteId(profilesData[0].id);
        }
      } else {
        setSelectedAthleteId(user.id);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadHistoricalData = async () => {
    if (!selectedAthleteId) return;
    
    try {
      setLoading(true);

      // Calculate date ranges based on comparison period
      const periods = getPeriods(comparisonPeriod, selectedMonths);
      
      // Fetch readiness data for each period
      const readinessPromises = periods.map(async (period) => {
        const { data } = await supabase
          .from("readiness_logs")
          .select("*")
          .eq("athlete_id", selectedAthleteId)
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
          .eq("user_id", selectedAthleteId)
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
          .eq("athlete_id", selectedAthleteId)
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

  const loadGoals = async () => {
    if (!selectedAthleteId) return;
    
    try {
      const { data, error } = await supabase
        .from("athlete_goals")
        .select("*")
        .eq("athlete_id", selectedAthleteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
      
      // Update current values based on latest data
      await updateGoalProgress(selectedAthleteId, data || []);
      
    } catch (error) {
      handleError(error, "Gagal memuat target");
    }
  };

  const updateGoalProgress = async (athleteId: string, goalsList: Goal[]) => {
    for (const goal of goalsList) {
      let currentVal = goal.current_value;

      if (goal.goal_type === "readiness") {
        const { data } = await supabase
          .from("readiness_logs")
          .select("readiness_score")
          .eq("athlete_id", athleteId)
          .order("date", { ascending: false })
          .limit(7);
        
        if (data && data.length > 0) {
          currentVal = data.reduce((sum, log) => sum + log.readiness_score, 0) / data.length;
        }
      } else if (goal.goal_type === "physical_test") {
        const { data } = await supabase
          .from("physical_tests")
          .select("value")
          .eq("athlete_id", athleteId)
          .eq("test_name", goal.goal_name)
          .order("test_date", { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          currentVal = data[0].value;
        }
      } else if (goal.goal_type === "training_load") {
        const { data } = await supabase
          .from("training_sessions")
          .select("load_final")
          .eq("user_id", athleteId)
          .gte("date", format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
        
        if (data && data.length > 0) {
          currentVal = data.reduce((sum, session) => sum + (session.load_final || 0), 0);
        }
      }

      // Update goal with new current value
      if (currentVal !== goal.current_value) {
        await supabase
          .from("athlete_goals")
          .update({ current_value: currentVal })
          .eq("id", goal.id);
      }

      // Check if goal is achieved
      if (goal.status === "active" && currentVal >= goal.target_value) {
        await supabase
          .from("athlete_goals")
          .update({ status: "achieved" })
          .eq("id", goal.id);
      }
    }
    
    // Reload to get updated values
    loadGoals();
  };

  const handleCreateGoal = async () => {
    if (!selectedAthleteId) return;
    
    try {
      const validatedData = goalSchema.parse({
        goal_name: goalName,
        goal_type: goalType,
        target_value: parseFloat(targetValue),
        target_unit: targetUnit,
        target_date: targetDate,
        current_value: parseFloat(currentValue) || 0,
        baseline_value: parseFloat(baselineValue) || 0,
        notes: notes || undefined,
      });

      const { error } = await supabase.from("athlete_goals").insert({
        athlete_id: selectedAthleteId,
        goal_type: validatedData.goal_type,
        goal_name: validatedData.goal_name,
        target_value: validatedData.target_value,
        target_unit: validatedData.target_unit,
        target_date: validatedData.target_date,
        current_value: validatedData.current_value,
        baseline_value: validatedData.baseline_value,
        notes: validatedData.notes || null,
        status: "active"
      });

      if (error) throw error;
      
      toast.success("Target berhasil dibuat");
      setDialogOpen(false);
      resetForm();
      loadGoals();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        handleError(error, getFriendlyErrorMessage(error));
      }
    }
  };

  const resetForm = () => {
    setGoalType("readiness");
    setGoalName("");
    setTargetValue("");
    setTargetUnit("");
    setTargetDate("");
    setCurrentValue("");
    setBaselineValue("");
    setNotes("");
  };

  const getProgress = (goal: Goal) => {
    const range = goal.target_value - goal.baseline_value;
    const current = goal.current_value - goal.baseline_value;
    return range > 0 ? Math.min((current / range) * 100, 100) : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "achieved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Tercapai</Badge>;
      case "active":
        return <Badge className="bg-primary text-primary-foreground"><Clock className="h-3 w-3 mr-1" />Aktif</Badge>;
      case "missed":
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Terlewat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        {/* Athlete selector for coaches */}
        {isCoach && athletes.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Label>Pilih Atlet</Label>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="bg-background border-border mt-2">
                  <SelectValue placeholder="Pilih atlet..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {athletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.athlete_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Historis & Target</h1>
            <p className="text-muted-foreground mt-2">
              Analisis perubahan performa dan pencapaian target
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="readiness">Kesiapan</TabsTrigger>
            <TabsTrigger value="load">Beban Latihan</TabsTrigger>
            <TabsTrigger value="tests">Tes Fisik</TabsTrigger>
            <TabsTrigger value="goals">Target & Progress</TabsTrigger>
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

          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Target
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Buat Target Baru</DialogTitle>
                    <DialogDescription>
                      Tetapkan target untuk meningkatkan performa
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Tipe Target</Label>
                      <Select value={goalType} onValueChange={setGoalType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="readiness">Kesiapan</SelectItem>
                          <SelectItem value="physical_test">Tes Fisik</SelectItem>
                          <SelectItem value="training_load">Beban Latihan</SelectItem>
                          <SelectItem value="competition">Kompetisi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Nama Target</Label>
                      <Input 
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        placeholder="Contoh: Skor Kesiapan Rata-rata"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nilai Target</Label>
                        <Input 
                          type="number"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          placeholder="8.5"
                        />
                      </div>
                      <div>
                        <Label>Satuan</Label>
                        <Input 
                          value={targetUnit}
                          onChange={(e) => setTargetUnit(e.target.value)}
                          placeholder="skor/cm/detik"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Tanggal Target</Label>
                      <Input 
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nilai Saat Ini</Label>
                        <Input 
                          type="number"
                          value={currentValue}
                          onChange={(e) => setCurrentValue(e.target.value)}
                          placeholder="7.2"
                        />
                      </div>
                      <div>
                        <Label>Nilai Baseline</Label>
                        <Input 
                          type="number"
                          value={baselineValue}
                          onChange={(e) => setBaselineValue(e.target.value)}
                          placeholder="6.5"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Catatan</Label>
                      <Textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan tambahan..."
                        rows={3}
                      />
                    </div>
                    
                    <Button onClick={handleCreateGoal} className="w-full">
                      Buat Target
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {goals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada target yang ditetapkan</p>
                  <Button onClick={() => setDialogOpen(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Buat Target Pertama
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {goals.map((goal) => {
                  const progress = getProgress(goal);
                  return (
                    <Card key={goal.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
                            <CardDescription className="mt-1">
                              {goal.goal_type.replace("_", " ")}
                            </CardDescription>
                          </div>
                          {getStatusBadge(goal.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Baseline</p>
                            <p className="font-bold">{goal.baseline_value} {goal.target_unit}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Saat Ini</p>
                            <p className="font-bold text-primary">{goal.current_value.toFixed(1)} {goal.target_unit}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Target</p>
                            <p className="font-bold">{goal.target_value} {goal.target_unit}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Target: {format(new Date(goal.target_date), "dd MMM yyyy", { locale: id })}</span>
                        </div>
                        
                        {goal.notes && (
                          <p className="text-sm text-muted-foreground border-t pt-3">
                            {goal.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
