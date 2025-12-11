import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, Award, FileDown } from "lucide-react";
import { exportPhysicalTestsToPDF, type PhysicalTestExportData } from "@/lib/exportUtils";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from "recharts";
import type { PhysicalTest } from "@/types/database";

// Comprehensive benchmark definitions with 5-level scoring
const BENCHMARKS = {
  daya_tahan: [
    { 
      testName: "VO2max", 
      scale5: 65, scale4: 55, scale3: 45, scale2: 40, scale1: 35,
      unit: "ml/kg/min", 
      inverse: false,
      description: "Konsumsi oksigen maksimal"
    },
    { 
      testName: "Cooper Test (12 min)", 
      scale5: 3200, scale4: 2800, scale3: 2400, scale2: 2200, scale1: 2000,
      unit: "m", 
      inverse: false,
      description: "Jarak lari 12 menit"
    },
    { 
      testName: "Beep Test", 
      scale5: 15, scale4: 12, scale3: 10, scale2: 7, scale1: 5,
      unit: "level", 
      inverse: false,
      description: "Multistage fitness test"
    },
  ],
  kecepatan: [
    { 
      testName: "Sprint 10m", 
      scale5: 1.6, scale4: 1.75, scale3: 1.9, scale2: 2.05, scale1: 2.2,
      unit: "s", 
      inverse: true,
      description: "Waktu sprint 10 meter"
    },
    { 
      testName: "Sprint 20m", 
      scale5: 2.8, scale4: 3.0, scale3: 3.25, scale2: 3.5, scale1: 3.8,
      unit: "s", 
      inverse: true,
      description: "Waktu sprint 20 meter"
    },
    { 
      testName: "Sprint 40m", 
      scale5: 4.9, scale4: 5.2, scale3: 5.6, scale2: 6.0, scale1: 6.5,
      unit: "s", 
      inverse: true,
      description: "Waktu sprint 40 meter"
    },
  ],
  kekuatan: [
    { 
      testName: "Back Squat 1RM", 
      scale5: 2.5, scale4: 2.0, scale3: 1.5, scale2: 1.2, scale1: 1.0,
      unit: "x BW", 
      inverse: false,
      description: "1 Rep Max relatif terhadap berat badan"
    },
    { 
      testName: "Bench Press 1RM", 
      scale5: 1.8, scale4: 1.5, scale3: 1.2, scale2: 1.0, scale1: 0.8,
      unit: "x BW", 
      inverse: false,
      description: "1 Rep Max relatif terhadap berat badan"
    },
    { 
      testName: "Deadlift 1RM", 
      scale5: 3.0, scale4: 2.5, scale3: 2.0, scale2: 1.5, scale1: 1.2,
      unit: "x BW", 
      inverse: false,
      description: "1 Rep Max relatif terhadap berat badan"
    },
    { 
      testName: "Pull Up Max", 
      scale5: 20, scale4: 15, scale3: 10, scale2: 7, scale1: 5,
      unit: "reps", 
      inverse: false,
      description: "Jumlah maksimal pull up"
    },
  ],
  kelincahan: [
    { 
      testName: "T-Test", 
      scale5: 8.5, scale4: 9.5, scale3: 10.5, scale2: 11.5, scale1: 12.5,
      unit: "s", 
      inverse: true,
      description: "Tes kelincahan bentuk T"
    },
    { 
      testName: "Illinois Agility Test", 
      scale5: 14.0, scale4: 15.5, scale3: 17.0, scale2: 18.5, scale1: 20.0,
      unit: "s", 
      inverse: true,
      description: "Tes kelincahan Illinois"
    },
    { 
      testName: "505 Agility Test", 
      scale5: 2.0, scale4: 2.2, scale3: 2.4, scale2: 2.6, scale1: 2.8,
      unit: "s", 
      inverse: true,
      description: "Tes kelincahan 5-0-5"
    },
    { 
      testName: "Hexagon Test", 
      scale5: 10.0, scale4: 11.5, scale3: 13.0, scale2: 14.5, scale1: 16.0,
      unit: "s", 
      inverse: true,
      description: "Tes kelincahan hexagon"
    },
  ],
  fleksibilitas: [
    { 
      testName: "Sit and Reach", 
      scale5: 25, scale4: 20, scale3: 15, scale2: 10, scale1: 5,
      unit: "cm", 
      inverse: false,
      description: "Fleksibilitas hamstring"
    },
    { 
      testName: "Shoulder Flexibility", 
      scale5: -5, scale4: 0, scale3: 5, scale2: 10, scale1: 15,
      unit: "cm", 
      inverse: true,
      description: "Jarak antara tangan di belakang"
    },
    { 
      testName: "Hip Flexion", 
      scale5: 130, scale4: 120, scale3: 110, scale2: 100, scale1: 90,
      unit: "deg", 
      inverse: false,
      description: "Range of motion pinggul"
    },
  ],
  power: [
    { 
      testName: "CMJ (Counter Movement Jump)", 
      scale5: 65, scale4: 55, scale3: 45, scale2: 35, scale1: 25,
      unit: "cm", 
      inverse: false,
      description: "Lompat vertikal dengan ayunan"
    },
    { 
      testName: "Standing Broad Jump", 
      scale5: 310, scale4: 270, scale3: 230, scale2: 200, scale1: 170,
      unit: "cm", 
      inverse: false,
      description: "Lompat jauh dari posisi berdiri"
    },
    { 
      testName: "Medicine Ball Throw", 
      scale5: 14, scale4: 12, scale3: 10, scale2: 8, scale1: 6,
      unit: "m", 
      inverse: false,
      description: "Lempar medicine ball overhead"
    },
    { 
      testName: "Drop Jump", 
      scale5: 70, scale4: 60, scale3: 50, scale2: 40, scale1: 30,
      unit: "cm", 
      inverse: false,
      description: "Lompat setelah turun dari box"
    },
  ],
};

const CATEGORIES = [
  { value: "daya_tahan", label: "Daya Tahan" },
  { value: "kecepatan", label: "Kecepatan" },
  { value: "kekuatan", label: "Kekuatan" },
  { value: "kelincahan", label: "Kelincahan" },
  { value: "fleksibilitas", label: "Fleksibilitas" },
  { value: "power", label: "Power" },
];

// Function to calculate score (1-5) based on benchmark
function calculateScore(value: number, benchmark: any): number {
  if (benchmark.inverse) {
    if (value <= benchmark.scale5) return 5;
    if (value <= benchmark.scale4) return 4;
    if (value <= benchmark.scale3) return 3;
    if (value <= benchmark.scale2) return 2;
    return 1;
  } else {
    if (value >= benchmark.scale5) return 5;
    if (value >= benchmark.scale4) return 4;
    if (value >= benchmark.scale3) return 3;
    if (value >= benchmark.scale2) return 2;
    return 1;
  }
}

// Function to get score color
function getScoreColor(score: number): string {
  if (score === 5) return "bg-green-500 text-white";
  if (score === 4) return "bg-blue-500 text-white";
  if (score === 3) return "bg-yellow-500 text-black";
  if (score === 2) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
}

// Function to get score label
function getScoreLabel(score: number): string {
  if (score === 5) return "Excellent";
  if (score === 4) return "Good";
  if (score === 3) return "Average";
  if (score === 2) return "Below Average";
  return "Poor";
}

export default function TesFisik() {
  const [tests, setTests] = useState<PhysicalTest[]>([]);
  const [isCoach, setIsCoach] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("daya_tahan");
  const [selectedTestName, setSelectedTestName] = useState<string>("");
  const [testValue, setTestValue] = useState<string>("");
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedAthleteId) {
      loadTests(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  // Auto-calculate score when value changes
  useEffect(() => {
    if (selectedTestName && testValue) {
      const allBenchmarks = Object.values(BENCHMARKS).flat();
      const benchmark = allBenchmarks.find(b => b.testName === selectedTestName);
      if (benchmark) {
        const score = calculateScore(parseFloat(testValue), benchmark);
        setCalculatedScore(score);
      }
    } else {
      setCalculatedScore(null);
    }
  }, [selectedTestName, testValue]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      const userIsCoach = roleData?.role === 'coach';
      setIsCoach(userIsCoach);

      if (userIsCoach) {
        // Load only assigned athletes with accepted status
        const { data: assignments } = await supabase
          .from("coach_athletes")
          .select("athlete_id")
          .eq("coach_id", user.id)
          .eq("status", "accepted");

        if (assignments && assignments.length > 0) {
          const athleteIds = assignments.map(a => a.athlete_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, athlete_name")
            .in("id", athleteIds)
            .order("athlete_name");
          
          if (profilesData && profilesData.length > 0) {
            setAthletes(profilesData);
            setSelectedAthleteId(profilesData[0].id);
          }
        }
      } else {
        setSelectedAthleteId(user.id);
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
      toast.error("Gagal memuat data tes");
    } else {
      setTests((data as any[]) || []);
    }
  };

  const saveTest = async () => {
    if (!selectedAthleteId || !selectedTestName || !testValue) {
      toast.error("Harap lengkapi semua field");
      return;
    }

    const allBenchmarks = Object.values(BENCHMARKS).flat();
    const benchmark = allBenchmarks.find(b => b.testName === selectedTestName);
    
    if (!benchmark) {
      toast.error("Benchmark tidak ditemukan");
      return;
    }

    try {
      const { error } = await supabase
        .from("physical_tests")
        .insert([{
          athlete_id: selectedAthleteId,
          test_date: testDate,
          category: selectedCategory,
          test_name: selectedTestName,
          value: parseFloat(testValue),
          unit: benchmark.unit,
          notes: notes || null,
        }]);

      if (error) throw error;

      toast.success("Tes berhasil disimpan");
      loadTests(selectedAthleteId);
      setShowDialog(false);
      resetForm();
    } catch (error) {
      toast.error("Gagal menyimpan tes");
      console.error(error);
    }
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Hapus data tes ini?")) return;

    try {
      const { error } = await supabase
        .from("physical_tests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Tes berhasil dihapus");
      loadTests(selectedAthleteId);
    } catch (error) {
      toast.error("Gagal menghapus tes");
    }
  };

  const resetForm = () => {
    setSelectedTestName("");
    setTestValue("");
    setTestDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setCalculatedScore(null);
  };

  // Get available test names for selected category
  const availableTests = BENCHMARKS[selectedCategory as keyof typeof BENCHMARKS] || [];

  // Prepare radar chart data - only use tests that have been performed
  const radarData = (() => {
    const allBenchmarks = Object.values(BENCHMARKS).flat();
    const performedTests = tests.filter(t => {
      const benchmark = allBenchmarks.find(b => b.testName === t.test_name);
      return benchmark !== undefined;
    });

    // Get latest test for each unique test name
    const latestTestsMap = new Map<string, PhysicalTest>();
    performedTests.forEach(test => {
      const existing = latestTestsMap.get(test.test_name);
      if (!existing || new Date(test.test_date) > new Date(existing.test_date)) {
        latestTestsMap.set(test.test_name, test);
      }
    });

    return Array.from(latestTestsMap.values()).map(test => {
      const benchmark = allBenchmarks.find(b => b.testName === test.test_name);
      if (!benchmark) return null;

      const score = calculateScore(test.value, benchmark);
      
      return {
        subject: test.test_name,
        score: score * 20, // Convert 1-5 to 20-100 scale for visibility
        fullMark: 100,
      };
    }).filter(Boolean);
  })();

  // Group tests by test name and calculate stats
  const testGroups = tests.reduce((acc, test) => {
    if (!acc[test.test_name]) {
      acc[test.test_name] = [];
    }
    acc[test.test_name].push(test);
    return acc;
  }, {} as Record<string, PhysicalTest[]>);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tes Kondisi Fisik</h1>
            <p className="text-muted-foreground">
              Kelola dan analisis hasil tes kondisi fisik dengan norma otomatis
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tests.length > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const athleteNameData = athletes.find(a => a.id === selectedAthleteId)?.athlete_name || 'Atlet';
                  // Calculate scores for latest tests
                  const allBenchmarks = Object.values(BENCHMARKS).flat();
                  const latestTestsMap = new Map<string, PhysicalTest>();
                  tests.forEach(test => {
                    const existing = latestTestsMap.get(test.test_name);
                    if (!existing || new Date(test.test_date) > new Date(existing.test_date)) {
                      latestTestsMap.set(test.test_name, test);
                    }
                  });
                  
                  const testScores = Array.from(latestTestsMap.values()).map(test => {
                    const benchmark = allBenchmarks.find(b => b.testName === test.test_name);
                    const score = benchmark ? calculateScore(test.value, benchmark) : 0;
                    return {
                      testName: test.test_name,
                      score,
                      value: test.value,
                      unit: test.unit,
                    };
                  });
                  
                  const exportData: PhysicalTestExportData = {
                    athleteName: athleteNameData,
                    tests,
                    testScores,
                  };
                  exportPhysicalTestsToPDF(exportData);
                  toast.success('PDF berhasil diekspor');
                }}
              >
                <FileDown className="h-4 w-4" />
                Ekspor PDF
              </Button>
            )}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Tes
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-card max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tambah Tes Fisik Baru</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tanggal Tes</Label>
                    <Input
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori Biomotor</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(v) => {
                        setSelectedCategory(v);
                        setSelectedTestName("");
                        setTestValue("");
                        setCalculatedScore(null);
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
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
                  <Label>Pilih Jenis Tes</Label>
                  <Select
                    value={selectedTestName}
                    onValueChange={(v) => {
                      setSelectedTestName(v);
                      setTestValue("");
                      setCalculatedScore(null);
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih tes dari daftar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50 max-h-[300px]">
                      {availableTests.map((test) => (
                        <SelectItem key={test.testName} value={test.testName}>
                          <div className="flex flex-col">
                            <span className="font-medium">{test.testName}</span>
                            <span className="text-xs text-muted-foreground">
                              {test.description} ({test.unit})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTestName && (
                  <>
                    <div className="space-y-2">
                      <Label>Nilai Hasil Tes</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={testValue}
                          onChange={(e) => setTestValue(e.target.value)}
                          placeholder="Masukkan nilai..."
                          className="flex-1"
                        />
                        <div className="bg-muted px-4 py-2 rounded-md flex items-center min-w-[80px] justify-center">
                          <span className="font-semibold">
                            {availableTests.find(t => t.testName === selectedTestName)?.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {calculatedScore && (
                      <div className="p-4 bg-secondary rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Skor Otomatis</p>
                            <p className="text-2xl font-bold">
                              {calculatedScore}/5
                            </p>
                          </div>
                          <Badge className={`${getScoreColor(calculatedScore)} text-lg px-4 py-2`}>
                            {getScoreLabel(calculatedScore)}
                          </Badge>
                        </div>

                        {/* Show benchmark ranges */}
                        <div className="mt-4 space-y-1 text-xs">
                          <p className="font-semibold mb-2">Norma Pengukuran:</p>
                          {(() => {
                            const benchmark = availableTests.find(t => t.testName === selectedTestName);
                            if (!benchmark) return null;
                            return (
                              <>
                                <div className="flex justify-between">
                                  <span>Excellent (5):</span>
                                  <span className="font-semibold">
                                    {benchmark.inverse ? `≤ ${benchmark.scale5}` : `≥ ${benchmark.scale5}`} {benchmark.unit}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Good (4):</span>
                                  <span className="font-semibold">
                                    {benchmark.inverse ? `≤ ${benchmark.scale4}` : `≥ ${benchmark.scale4}`} {benchmark.unit}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Average (3):</span>
                                  <span className="font-semibold">
                                    {benchmark.inverse ? `≤ ${benchmark.scale3}` : `≥ ${benchmark.scale3}`} {benchmark.unit}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Below Average (2):</span>
                                  <span className="font-semibold">
                                    {benchmark.inverse ? `≤ ${benchmark.scale2}` : `≥ ${benchmark.scale2}`} {benchmark.unit}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Poor (1):</span>
                                  <span className="font-semibold">
                                    {benchmark.inverse ? `> ${benchmark.scale2}` : `< ${benchmark.scale2}`} {benchmark.unit}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Catatan (Opsional)</Label>
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan tambahan..."
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Batal
                  </Button>
                  <Button onClick={saveTest} disabled={!selectedTestName || !testValue}>
                    Simpan Tes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Athlete Selector for Coach */}
        {isCoach && athletes.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Label>Pilih Atlet</Label>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="bg-background mt-2">
                  <SelectValue placeholder="Pilih atlet..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
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

        {/* Radar Chart */}
        {radarData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Profil Performa Multi-Dimensi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value / 20}/5`}
                  />
                  <Radar 
                    name="Skor Atlet" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(value: any) => [`${(value / 20).toFixed(1)}/5`, 'Skor']}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Grafik menampilkan {radarData.length} item tes yang telah dilakukan (skala 1-5)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Test Results by Category */}
        <div className="space-y-6">
          {Object.entries(testGroups).map(([testName, testList]) => {
            const allBenchmarks = Object.values(BENCHMARKS).flat();
            const benchmark = allBenchmarks.find(b => b.testName === testName);
            const latestTest = testList[0];
            const score = benchmark ? calculateScore(latestTest.value, benchmark) : null;

            return (
              <Card key={testName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{testName}</CardTitle>
                      {score && (
                        <Badge className={getScoreColor(score)}>
                          {score}/5 - {getScoreLabel(score)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {testList.length} data
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testList.slice(0, 5).map((test) => {
                      const testScore = benchmark ? calculateScore(test.value, benchmark) : null;
                      return (
                        <div 
                          key={test.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-lg">
                                {test.value} {test.unit}
                              </span>
                              {testScore && (
                                <Badge className={`${getScoreColor(testScore)} text-xs`}>
                                  {testScore}/5
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{new Date(test.test_date).toLocaleDateString('id-ID')}</span>
                              {test.notes && <span className="italic">"{test.notes}"</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTest(test.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tests.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum ada data tes</h3>
              <p className="text-muted-foreground text-center mb-4">
                Tambahkan tes fisik pertama untuk mulai tracking performa
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
