import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, Award, FileDown, User, Calendar } from "lucide-react";
import { exportPhysicalTestsToPDF, type PhysicalTestExportData } from "@/lib/exportUtils";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from "recharts";
import type { PhysicalTest } from "@/types/database";
import {
  BENCHMARKS,
  CATEGORIES,
  calculateScore,
  getScoreColor,
  getScoreLabel,
  findBenchmark,
  getBenchmarkScale,
  getAgeGroup,
  getAgeGroupLabel,
  type Gender,
  type TestBenchmark,
} from "@/lib/physicalTestBenchmarks";

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
  
  // Age and gender for norm calculation
  const [athleteAge, setAthleteAge] = useState<number>(25);
  const [athleteGender, setAthleteGender] = useState<Gender>('male');

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedAthleteId) {
      loadTests(selectedAthleteId);
      loadAthleteProfile(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  // Auto-calculate score when value changes
  useEffect(() => {
    if (selectedTestName && testValue) {
      const benchmark = findBenchmark(selectedTestName);
      if (benchmark) {
        const score = calculateScore(parseFloat(testValue), benchmark, athleteAge, athleteGender);
        setCalculatedScore(score);
      }
    } else {
      setCalculatedScore(null);
    }
  }, [selectedTestName, testValue, athleteAge, athleteGender]);

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
            .select("id, athlete_name, age")
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

  const loadAthleteProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("age")
      .eq("id", uid)
      .single();
    
    if (data?.age) {
      setAthleteAge(data.age);
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

    const benchmark = findBenchmark(selectedTestName);
    
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
    const performedTests = tests.filter(t => {
      const benchmark = findBenchmark(t.test_name);
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
      const benchmark = findBenchmark(test.test_name);
      if (!benchmark) return null;

      const score = calculateScore(test.value, benchmark, athleteAge, athleteGender);
      
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

  const selectedBenchmark = findBenchmark(selectedTestName);

  return (
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tes Kondisi Fisik</h1>
            <p className="text-muted-foreground">
              Kelola dan analisis hasil tes dengan norma berdasarkan usia & jenis kelamin
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tests.length > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const athleteNameData = athletes.find(a => a.id === selectedAthleteId)?.athlete_name || 'Atlet';
                  // Calculate scores for latest tests with category info
                  const latestTestsMap = new Map<string, PhysicalTest>();
                  tests.forEach(test => {
                    const existing = latestTestsMap.get(test.test_name);
                    if (!existing || new Date(test.test_date) > new Date(existing.test_date)) {
                      latestTestsMap.set(test.test_name, test);
                    }
                  });
                  
                  const testScores = Array.from(latestTestsMap.values()).map(test => {
                    const benchmark = findBenchmark(test.test_name);
                    const score = benchmark ? calculateScore(test.value, benchmark, athleteAge, athleteGender) : 0;
                    return {
                      testName: test.test_name,
                      score,
                      value: test.value,
                      unit: test.unit,
                      category: test.category,
                    };
                  });
                  
                  const exportData: PhysicalTestExportData = {
                    athleteName: athleteNameData,
                    tests,
                    testScores,
                    athleteAge,
                    athleteGender,
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
              <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
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

                  {/* Age and Gender Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Usia Atlet
                      </Label>
                      <Input
                        type="number"
                        min="5"
                        max="80"
                        value={athleteAge}
                        onChange={(e) => setAthleteAge(parseInt(e.target.value) || 25)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Kelompok: {getAgeGroupLabel(getAgeGroup(athleteAge))}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Jenis Kelamin
                      </Label>
                      <Select
                        value={athleteGender}
                        onValueChange={(v) => setAthleteGender(v as Gender)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="male">Laki-laki</SelectItem>
                          <SelectItem value="female">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Pilih Jenis Tes ({availableTests.length} tes tersedia)</Label>
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

                  {selectedTestName && selectedBenchmark && (
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
                              {selectedBenchmark.unit}
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

                          {/* Show benchmark ranges based on age/gender */}
                          <div className="mt-4 space-y-1 text-xs">
                            <p className="font-semibold mb-2">
                              Norma ({athleteGender === 'male' ? 'Laki-laki' : 'Perempuan'}, {getAgeGroupLabel(getAgeGroup(athleteAge))}):
                            </p>
                            {(() => {
                              const scale = getBenchmarkScale(selectedBenchmark, athleteAge, athleteGender);
                              return (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-green-600">Excellent (5):</span>
                                    <span className="font-semibold">
                                      {selectedBenchmark.inverse ? `≤ ${scale.scale5}` : `≥ ${scale.scale5}`} {selectedBenchmark.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-blue-600">Good (4):</span>
                                    <span className="font-semibold">
                                      {selectedBenchmark.inverse ? `≤ ${scale.scale4}` : `≥ ${scale.scale4}`} {selectedBenchmark.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-yellow-600">Average (3):</span>
                                    <span className="font-semibold">
                                      {selectedBenchmark.inverse ? `≤ ${scale.scale3}` : `≥ ${scale.scale3}`} {selectedBenchmark.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-600">Below Average (2):</span>
                                    <span className="font-semibold">
                                      {selectedBenchmark.inverse ? `≤ ${scale.scale2}` : `≥ ${scale.scale2}`} {selectedBenchmark.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Poor (1):</span>
                                    <span className="font-semibold">
                                      {selectedBenchmark.inverse ? `> ${scale.scale2}` : `< ${scale.scale2}`} {selectedBenchmark.unit}
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

        {/* Athlete Selector for Coach + Age/Gender Display */}
        {isCoach && athletes.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
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
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Usia untuk Norma
                  </Label>
                  <Input
                    type="number"
                    min="5"
                    max="80"
                    value={athleteAge}
                    onChange={(e) => setAthleteAge(parseInt(e.target.value) || 25)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kelompok: {getAgeGroupLabel(getAgeGroup(athleteAge))}
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Jenis Kelamin
                  </Label>
                  <Select
                    value={athleteGender}
                    onValueChange={(v) => setAthleteGender(v as Gender)}
                  >
                    <SelectTrigger className="bg-background mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Age/Gender for non-coach */}
        {!isCoach && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Usia untuk Norma
                  </Label>
                  <Input
                    type="number"
                    min="5"
                    max="80"
                    value={athleteAge}
                    onChange={(e) => setAthleteAge(parseInt(e.target.value) || 25)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kelompok: {getAgeGroupLabel(getAgeGroup(athleteAge))}
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Jenis Kelamin
                  </Label>
                  <Select
                    value={athleteGender}
                    onValueChange={(v) => setAthleteGender(v as Gender)}
                  >
                    <SelectTrigger className="bg-background mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
            const benchmark = findBenchmark(testName);
            const latestTest = testList[0];
            const score = benchmark ? calculateScore(latestTest.value, benchmark, athleteAge, athleteGender) : null;

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
                      const testScore = benchmark ? calculateScore(test.value, benchmark, athleteAge, athleteGender) : null;
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
      <BottomNavigation />
    </div>
  );
}
