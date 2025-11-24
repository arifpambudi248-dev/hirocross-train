import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from "recharts";
import type { PhysicalTest } from "@/types/database";
import { physicalTestSchema } from "@/lib/validationSchemas";
import { handleError, getFriendlyErrorMessage } from "@/lib/errorHandling";
import { z } from "zod";

// Benchmark values for each category (5-scale: Elite, Excellent, Good, Average, Poor)
const BENCHMARKS = {
  endurance: [
    { testName: "VO2max", elite: 65, excellent: 60, good: 50, average: 40, poor: 35, unit: "ml/kg/min", inverse: false },
    { testName: "Cooper Test", elite: 3200, excellent: 3000, good: 2600, average: 2200, poor: 1900, unit: "m", inverse: false },
    { testName: "Beep Test", elite: 15, excellent: 13, good: 10, average: 7, poor: 5, unit: "level", inverse: false },
  ],
  speed: [
    { testName: "10m Sprint", elite: 1.6, excellent: 1.7, good: 1.85, average: 2.0, poor: 2.2, unit: "s", inverse: true },
    { testName: "20m Sprint", elite: 2.8, excellent: 3.0, good: 3.2, average: 3.5, poor: 3.8, unit: "s", inverse: true },
    { testName: "40m Sprint", elite: 4.9, excellent: 5.2, good: 5.6, average: 6.0, poor: 6.5, unit: "s", inverse: true },
  ],
  strength: [
    { testName: "Squat 1RM", elite: 2.5, excellent: 2.0, good: 1.5, average: 1.2, poor: 1.0, unit: "x BW", inverse: false },
    { testName: "Bench Press 1RM", elite: 1.8, excellent: 1.5, good: 1.2, average: 1.0, poor: 0.8, unit: "x BW", inverse: false },
    { testName: "Deadlift 1RM", elite: 3.0, excellent: 2.5, good: 2.0, average: 1.5, poor: 1.2, unit: "x BW", inverse: false },
  ],
  agility: [
    { testName: "T-Test", elite: 8.5, excellent: 9.0, good: 10.0, average: 11.0, poor: 12.0, unit: "s", inverse: true },
    { testName: "Illinois Test", elite: 14.0, excellent: 15.0, good: 16.5, average: 18.0, poor: 19.5, unit: "s", inverse: true },
    { testName: "505 Agility", elite: 2.0, excellent: 2.2, good: 2.4, average: 2.6, poor: 2.8, unit: "s", inverse: true },
  ],
  flexibility: [
    { testName: "Sit and Reach", elite: 25, excellent: 20, good: 15, average: 10, poor: 5, unit: "cm", inverse: false },
    { testName: "Shoulder Flexibility", elite: -5, excellent: 0, good: 5, average: 10, poor: 15, unit: "cm", inverse: true },
  ],
  power: [
    { testName: "CMJ", elite: 65, excellent: 55, good: 45, average: 35, poor: 25, unit: "cm", inverse: false },
    { testName: "Broad Jump", elite: 310, excellent: 280, good: 240, average: 200, poor: 170, unit: "cm", inverse: false },
    { testName: "Medicine Ball Throw", elite: 14, excellent: 12, good: 10, average: 8, poor: 6, unit: "m", inverse: false },
  ],
};

const CATEGORIES = [
  { value: "endurance", label: "Daya Tahan" },
  { value: "speed", label: "Kecepatan" },
  { value: "strength", label: "Kekuatan" },
  { value: "agility", label: "Kelincahan" },
  { value: "flexibility", label: "Fleksibilitas" },
  { value: "power", label: "Power" },
];

export default function TesFisik() {
  const [tests, setTests] = useState<PhysicalTest[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>("");
  const [coachName, setCoachName] = useState<string>("Pelatih");
  const [sport, setSport] = useState<string>("Cabang Olahraga");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [age, setAge] = useState<number>(20);
  const [weight, setWeight] = useState<number>(55);
  const [height, setHeight] = useState<number>(1.5);
  const [gender, setGender] = useState<string>("Pria");
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<PhysicalTest>>({
    test_date: new Date().toISOString().split("T")[0],
    category: "endurance",
    test_name: "",
    value: 0,
    unit: "",
    notes: "",
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      loadTests(user.id);
      
      // Load profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("athlete_name")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setAthleteName(profile.athlete_name);
      }
    }
  };

  const loadTests = async (uid: string) => {
    const { data, error } = await supabase
      .from("physical_tests")
      .select("*")
      .eq("athlete_id", uid)
      .order("test_date", { ascending: false });

    if (error) {
      handleError(error, getFriendlyErrorMessage(error));
    } else {
      setTests((data as any[]) || []);
    }
  };

  const saveTest = async () => {
    if (!userId || !formData.test_name || !formData.value) {
      toast.error("Harap lengkapi semua field");
      return;
    }

    try {
      // Validate input data
      const validatedData = physicalTestSchema.parse({
        test_date: formData.test_date,
        category: formData.category,
        test_name: formData.test_name,
        value: formData.value,
        unit: formData.unit,
        notes: formData.notes || undefined,
      });

      const { error } = await supabase
        .from("physical_tests")
        .insert([{
          athlete_id: userId,
          test_date: validatedData.test_date,
          category: validatedData.category,
          test_name: validatedData.test_name,
          value: validatedData.value,
          unit: validatedData.unit,
          notes: validatedData.notes || null,
        }]);

      if (error) throw error;

      toast.success("Tes berhasil disimpan");
      loadTests(userId);
      setShowDialog(false);
      setFormData({
        test_date: new Date().toISOString().split("T")[0],
        category: "endurance",
        test_name: "",
        value: 0,
        unit: "",
        notes: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        handleError(error, getFriendlyErrorMessage(error));
      }
    }
  };

  // Calculate BMI
  const bmi = weight / (height * height);
  const bmiCategory = bmi < 18.5 ? "Kurus" : bmi < 25 ? "Normal" : "Overweight";
  
  // Prepare chart data - get all tests and normalize scores to percentages
  const chartData = tests.map((test) => {
    // Find benchmark for this test
    let percentage = 0;
    const allBenchmarks = Object.values(BENCHMARKS).flat();
    const benchmark = allBenchmarks.find(b => b.testName === test.test_name);
    
    if (benchmark) {
      if (benchmark.inverse) {
        percentage = Math.max(0, Math.min(100, 
          ((benchmark.poor - test.value) / (benchmark.poor - benchmark.elite)) * 100
        ));
      } else {
        percentage = Math.max(0, Math.min(100, 
          (test.value / benchmark.elite) * 100
        ));
      }
    }
    
    return {
      name: test.test_name,
      percentage: Math.round(percentage),
      actual: percentage,
      benchmark: 100,
    };
  }).slice(0, 11); // Show up to 11 tests like in the reference

  // Calculate overall performance percentage
  const overallPerformance = chartData.length > 0 
    ? Math.round(chartData.reduce((sum, item) => sum + item.percentage, 0) / chartData.length)
    : 0;

  // Prepare radar chart data - get latest test for each benchmark
  const radarData = (() => {
    const allBenchmarks = Object.values(BENCHMARKS).flat();
    
    return allBenchmarks.slice(0, 11).map(benchmark => {
      const latestTest = tests
        .filter(t => t.test_name === benchmark.testName)
        .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
      
      if (!latestTest) {
        return {
          subject: benchmark.testName,
          athlete: 0,
          elite: 100,
          excellent: 85,
          good: 65,
          average: 50,
        };
      }
      
      // Normalize the value to percentage (0-100)
      let athleteScore = 0;
      if (benchmark.inverse) {
        athleteScore = Math.max(0, Math.min(100, 
          ((benchmark.poor - latestTest.value) / (benchmark.poor - benchmark.elite)) * 100
        ));
      } else {
        athleteScore = Math.max(0, Math.min(100, 
          (latestTest.value / benchmark.elite) * 100
        ));
      }
      
      return {
        subject: benchmark.testName,
        athlete: Math.round(athleteScore),
        elite: 100,
        excellent: 85,
        good: 65,
        average: 50,
      };
    });
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        {/* Header with gradient and Add Test button */}
        <div className="mb-6 rounded-lg border-2 border-white bg-gradient-to-r from-primary/70 to-primary p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-center flex-1 text-3xl font-bold text-white">Kondisi Fisik</h1>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white text-primary hover:bg-gray-100">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Tes
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Tambah Tes Fisik Baru</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tanggal Tes</Label>
                      <Input
                        type="date"
                        value={formData.test_date}
                        onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kategori</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Tes</Label>
                    <Input
                      value={formData.test_name}
                      onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                      placeholder="Contoh: Sprint 30m, CMJ, VO2max"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nilai</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Satuan</Label>
                      <Input
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="s, cm, kg, dll"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan (Opsional)</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Catatan tambahan"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Batal
                    </Button>
                    <Button onClick={saveTest}>Simpan Tes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Profile Information Section */}
        <Card className="mb-6 bg-card">
          <div className="grid grid-cols-12 gap-4 p-6">
            {/* Left Column - Profile Fields */}
            <div className="col-span-9 space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Pelatih</Label>
                  <span className="text-foreground">:</span>
                  <Input 
                    value={coachName} 
                    onChange={(e) => setCoachName(e.target.value)}
                    className="flex-1 bg-background border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Usia</Label>
                  <span className="text-foreground">:</span>
                  <Input 
                    type="number" 
                    value={age} 
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="flex-1 bg-background border-border"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Nama Atlet</Label>
                  <span className="text-foreground">:</span>
                  <Input 
                    value={athleteName} 
                    onChange={(e) => setAthleteName(e.target.value)}
                    className="flex-1 bg-background border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Berat Badan</Label>
                  <span className="text-foreground">:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Input 
                      type="number" 
                      value={weight} 
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="flex-1 bg-background border-border"
                    />
                    <span className="text-foreground font-semibold">Kg</span>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Cabor</Label>
                  <span className="text-foreground">:</span>
                  <Input 
                    value={sport} 
                    onChange={(e) => setSport(e.target.value)}
                    className="flex-1 bg-background border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Tinggi Badan</Label>
                  <span className="text-foreground">:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Input 
                      type="number" 
                      step="0.01"
                      value={height} 
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="flex-1 bg-background border-border"
                    />
                    <span className="text-foreground font-semibold">m</span>
                  </div>
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Tahun</Label>
                  <span className="text-foreground">:</span>
                  <Input 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="flex-1 bg-background border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-32 bg-white text-black px-3 py-2 rounded">Gender</Label>
                  <span className="text-foreground">:</span>
                  <Input 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)}
                    className="flex-1 bg-background border-border"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - BMI Display */}
            <div className="col-span-3 flex flex-col items-center justify-center space-y-4">
              <User className="h-20 w-20 text-foreground" />
              <div className="text-center">
                <div className="text-sm font-semibold mb-2">BMI</div>
                <div className="text-2xl font-bold mb-2">{bmi.toFixed(2)}</div>
                <div className="space-y-1 text-xs">
                  <div className={`px-4 py-1 rounded ${bmi < 18.5 ? 'bg-warning' : 'bg-muted'}`}>
                    <span className="text-black font-semibold">&lt;18.5</span>
                    <span className="ml-2 text-black">Kurus</span>
                  </div>
                  <div className={`px-4 py-1 rounded ${bmi >= 18.5 && bmi < 25 ? 'bg-muted' : 'bg-muted'}`}>
                    <span className="font-semibold">18.5-24.9</span>
                    <span className="ml-2">Normal</span>
                  </div>
                  <div className={`px-4 py-1 rounded ${bmi >= 25 ? 'bg-destructive' : 'bg-muted'}`}>
                    <span className={`font-semibold ${bmi >= 25 ? 'text-white' : ''}`}>&gt;25.0</span>
                    <span className={`ml-2 ${bmi >= 25 ? 'text-white' : ''}`}>Overweight</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Chart Section */}
        <Card className="mb-6 bg-card">
          <div className="grid grid-cols-12 gap-4 p-6">
            {/* Chart Area */}
            <div className="col-span-9">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    domain={[0, 100]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Bar dataKey="benchmark" stackId="a" fill="hsl(var(--muted))" />
                  <Bar dataKey="actual" stackId="a">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 5 ? "hsl(var(--primary))" : "hsl(var(--accent))"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Indicator */}
            <div className="col-span-3 flex flex-col items-center justify-center">
              <div className="bg-info rounded-lg p-8 w-full text-center">
                <div className="text-6xl font-bold text-white mb-2">
                  {overallPerformance}%
                </div>
              </div>
              <div className="mt-4 bg-warning text-black font-semibold px-6 py-2 rounded w-full text-center">
                Performa {gender}
              </div>
            </div>
          </div>
        </Card>

        {/* Radar Chart Section */}
        {radarData.length > 0 && radarData.some(d => d.athlete > 0) && (
          <Card className="mb-6 bg-card">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-center">Profil Performa vs Benchmark</h2>
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Radar 
                    name="Atlet" 
                    dataKey="athlete" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                  />
                  <Radar 
                    name="Elite" 
                    dataKey="elite" 
                    stroke="hsl(var(--chart-4))" 
                    fill="hsl(var(--chart-4))" 
                    fillOpacity={0.1}
                  />
                  <Radar 
                    name="Excellent" 
                    dataKey="excellent" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))" 
                    fillOpacity={0.1}
                  />
                  <Radar 
                    name="Good" 
                    dataKey="good" 
                    stroke="hsl(var(--chart-1))" 
                    fill="hsl(var(--chart-1))" 
                    fillOpacity={0.1}
                  />
                  <Radar 
                    name="Average" 
                    dataKey="average" 
                    stroke="hsl(var(--chart-3))" 
                    fill="hsl(var(--chart-3))" 
                    fillOpacity={0.1}
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
          </Card>
        )}
      </div>
    </div>
  );
}
