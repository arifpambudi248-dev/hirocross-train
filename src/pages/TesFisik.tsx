import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, Award, FileDown, User, Calendar, Users, Dumbbell, Gauge, Scale, Ruler } from "lucide-react";
import { exportPhysicalTestsToPDF, type PhysicalTestExportData } from "@/lib/exportUtils";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from "recharts";
import type { PhysicalTest } from "@/types/database";
import { VCrCalculator } from "@/components/VCrCalculator";
import { OneRMCalculator } from "@/components/OneRMCalculator";
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
import { SPORT_CATEGORIES, getSportLabel, SPORT_BIOMOTOR_PRIORITY } from "@/lib/sportCategories";
import { Speedometer, MiniSpeedometer } from "@/components/Speedometer";

// Convert score (1-5) to percentage (0-100)
const scoreToPercentage = (score: number): number => {
  return ((score - 1) / 4) * 100;
};

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
  
  // Age, gender, sport, and body data for norm calculation
  const [athleteAge, setAthleteAge] = useState<number>(25);
  const [athleteGender, setAthleteGender] = useState<Gender>('male');
  const [athleteSport, setAthleteSport] = useState<string | null>(null);
  const [athleteBodyWeight, setAthleteBodyWeight] = useState<number | null>(null);
  const [athleteHeight, setAthleteHeight] = useState<number | null>(null);
  const [athleteAvatarUrl, setAthleteAvatarUrl] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>("");
  
  // Grouping view mode
  const [groupBy, setGroupBy] = useState<'category' | 'gender' | 'sport'>('category');

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
            .select("id, athlete_name, age, gender, sport, avatar_url")
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
      .select("athlete_name, age, gender, sport, body_weight, height, avatar_url")
      .eq("id", uid)
      .single();
    
    if (data) {
      setAthleteName(data.athlete_name || "");
      if (data.age) setAthleteAge(data.age);
      if (data.gender) setAthleteGender(data.gender as Gender);
      if (data.sport) setAthleteSport(data.sport);
      setAthleteBodyWeight(data.body_weight);
      setAthleteHeight(data.height);
      setAthleteAvatarUrl(data.avatar_url);
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
      const percentage = scoreToPercentage(score);
      
      return {
        subject: test.test_name,
        score: percentage, // Now using percentage 0-100
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
                onClick={async () => {
                  const athleteNameData = athletes.find(a => a.id === selectedAthleteId)?.athlete_name || athleteName || 'Atlet';
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
                    const percentage = scoreToPercentage(score);
                    return {
                      testName: test.test_name,
                      score,
                      percentage,
                      value: test.value,
                      unit: test.unit,
                      category: test.category,
                    };
                  });
                  
                  const exportData: PhysicalTestExportData = {
                    athleteName: athleteNameData,
                    athleteAvatarUrl: athleteAvatarUrl || undefined,
                    tests,
                    testScores,
                    athleteAge,
                    athleteGender,
                    bodyWeight: athleteBodyWeight || undefined,
                    height: athleteHeight || undefined,
                    sport: athleteSport || undefined,
                  };
                  await exportPhysicalTestsToPDF(exportData);
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
                      {/* VCr Special Calculator */}
                      {selectedTestName === "VCr (Velocity at Cruise)" && (
                        <VCrCalculator
                          onVCrCalculated={(vcr) => setTestValue(vcr.toFixed(2))}
                        />
                      )}

                      {/* 1RM Special Calculator */}
                      {selectedTestName.includes("1RM") && (
                        <OneRMCalculator
                          exerciseName={selectedTestName.replace(" 1RM", "")}
                          onOneRMCalculated={(oneRM) => {
                            if (athleteBodyWeight && athleteBodyWeight > 0) {
                              setTestValue((oneRM / athleteBodyWeight).toFixed(2));
                            } else {
                              setTestValue(oneRM.toFixed(1));
                            }
                          }}
                        />
                      )}

                      {/* Standard value input (hidden for VCr since calculator sets it) */}
                      <div className="space-y-2">
                        <Label>
                          {selectedTestName === "VCr (Velocity at Cruise)" 
                            ? "Hasil VCr (otomatis dari kalkulator)" 
                            : selectedTestName.includes("1RM")
                            ? `Hasil 1RM (${selectedBenchmark.unit === 'x BW' ? 'relatif BW' : 'absolut'})`
                            : "Nilai Hasil Tes"}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={testValue}
                            onChange={(e) => setTestValue(e.target.value)}
                            placeholder="Masukkan nilai..."
                            className="flex-1"
                            readOnly={selectedTestName === "VCr (Velocity at Cruise)"}
                          />
                          <div className="bg-muted px-4 py-2 rounded-md flex items-center min-w-[80px] justify-center">
                            <span className="font-semibold">
                              {selectedBenchmark.unit}
                            </span>
                          </div>
                        </div>
                        {selectedTestName.includes("1RM") && selectedBenchmark.unit === 'x BW' && (
                          <p className="text-xs text-muted-foreground">
                            {athleteBodyWeight 
                              ? `Berat badan: ${athleteBodyWeight} kg. Nilai disimpan relatif terhadap BW.`
                              : "⚠️ Berat badan belum diisi di profil. Isi terlebih dahulu untuk konversi otomatis."}
                          </p>
                        )}
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

        {/* Athlete Profile Card */}
        {selectedAthleteId && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* Avatar and Name */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={athleteAvatarUrl || undefined} alt={athleteName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {athleteName?.charAt(0)?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{athleteName || 'Atlet'}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{athleteGender === 'male' ? 'Laki-laki' : 'Perempuan'}</span>
                      <span>•</span>
                      <span>{athleteAge} tahun</span>
                      {athleteSport && (
                        <>
                          <span>•</span>
                          <Badge variant="outline">{getSportLabel(athleteSport)}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Coach selector if coach */}
                {isCoach && athletes.length > 0 && (
                  <div className="ml-auto">
                    <Label className="text-xs text-muted-foreground">Pilih Atlet</Label>
                    <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                      <SelectTrigger className="bg-background mt-1 w-[200px]">
                        <SelectValue placeholder="Pilih atlet..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {athletes.map((athlete) => (
                          <SelectItem key={athlete.id} value={athlete.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={athlete.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {athlete.athlete_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{athlete.athlete_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              {/* Body stats if available */}
              {(athleteBodyWeight || athleteHeight) && (
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                  {athleteBodyWeight && (
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Berat: <strong>{athleteBodyWeight} kg</strong></span>
                    </div>
                  )}
                  {athleteHeight && (
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Tinggi: <strong>{athleteHeight} cm</strong></span>
                    </div>
                  )}
                  {athleteBodyWeight && athleteHeight && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">BMI: <strong>{(athleteBodyWeight / Math.pow(athleteHeight / 100, 2)).toFixed(1)} kg/m²</strong></span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}



        {/* Grouping Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Kelompokkan Berdasarkan:
              </Label>
              <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="category">Kategori Biomotor</TabsTrigger>
                  <TabsTrigger value="sport">Cabang Olahraga</TabsTrigger>
                </TabsList>
              </Tabs>
              {athleteSport && SPORT_BIOMOTOR_PRIORITY[athleteSport] && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Prioritas untuk {getSportLabel(athleteSport)}:</span>
                  <div className="flex gap-1">
                    {SPORT_BIOMOTOR_PRIORITY[athleteSport].slice(0, 3).map((cat, idx) => {
                      const catLabel = CATEGORIES.find(c => c.value === cat)?.label || cat;
                      return (
                        <Badge key={cat} variant={idx === 0 ? "default" : "secondary"} className="text-xs">
                          {idx + 1}. {catLabel}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* BMI/IMT Card with Speedometer */}
        {athleteBodyWeight && athleteHeight && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Data Antropometri & BMI/IMT
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const heightInMeters = athleteHeight / 100;
                const bmi = athleteBodyWeight / Math.pow(heightInMeters, 2);
                
                // BMI category and percentage
                let bmiCategory: string;
                let bmiPercentage: number;
                if (bmi < 18.5) {
                  bmiCategory = 'Kurus (Underweight)';
                  bmiPercentage = Math.max(0, (bmi / 18.5) * 40); // 0-40%
                } else if (bmi < 25) {
                  bmiCategory = 'Normal';
                  bmiPercentage = 40 + ((bmi - 18.5) / (25 - 18.5)) * 40; // 40-80%
                } else if (bmi < 30) {
                  bmiCategory = 'Gemuk (Overweight)';
                  bmiPercentage = 80 - ((bmi - 25) / (30 - 25)) * 20; // 80-60%
                } else {
                  bmiCategory = 'Obesitas';
                  bmiPercentage = Math.max(20, 60 - ((bmi - 30) / 10) * 40); // 60-20%
                }
                
                return (
                  <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                    {/* BMI Speedometer */}
                    <div className="flex flex-col items-center">
                      <Speedometer value={bmiPercentage} size={200} label="BMI/IMT" />
                      <div className="mt-4 text-center">
                        <p className="text-2xl font-bold">{bmi.toFixed(1)} kg/m²</p>
                        <Badge className={`mt-2 ${
                          bmiCategory === 'Normal' ? 'bg-green-500' :
                          bmiCategory.includes('Kurus') || bmiCategory.includes('Gemuk') ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}>
                          {bmiCategory}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Data details */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-lg">
                        <Scale className="h-8 w-8 text-primary mb-2" />
                        <span className="text-sm text-muted-foreground">Berat Badan</span>
                        <span className="text-xl font-bold">{athleteBodyWeight} kg</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-secondary/30 rounded-lg">
                        <Ruler className="h-8 w-8 text-primary mb-2" />
                        <span className="text-sm text-muted-foreground">Tinggi Badan</span>
                        <span className="text-xl font-bold">{athleteHeight} cm</span>
                      </div>
                      <div className="col-span-2 p-4 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground text-center mb-2">Rumus Perhitungan BMI</p>
                        <p className="text-center font-mono text-sm">
                          BMI = {athleteBodyWeight} ÷ ({heightInMeters.toFixed(2)}²) = <strong>{bmi.toFixed(2)}</strong>
                        </p>
                        <div className="flex justify-center gap-2 mt-3 flex-wrap text-xs text-muted-foreground">
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded">{"<18.5: Kurus"}</span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">18.5-24.9: Normal</span>
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded">25-29.9: Gemuk</span>
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded">≥30: Obesitas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Overall Score Speedometer */}
        {radarData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Skor Kondisi Fisik Keseluruhan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                {/* Main Speedometer */}
                <div className="flex flex-col items-center">
                  {(() => {
                    const avgScore = radarData.reduce((sum, d: any) => sum + (d.score / 20), 0) / radarData.length;
                    const percentage = scoreToPercentage(avgScore);
                    return (
                      <>
                        <Speedometer value={percentage} size={280} label="Rata-rata Skor Keseluruhan" />
                        <p className="text-sm text-muted-foreground mt-2">
                          Berdasarkan {radarData.length} item tes
                        </p>
                      </>
                    );
                  })()}
                </div>
                
                {/* Category breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {CATEGORIES.map(category => {
                    const categoryTests = tests.filter(t => t.category === category.value);
                    if (categoryTests.length === 0) return null;
                    
                    const latestTests = new Map<string, PhysicalTest>();
                    categoryTests.forEach(test => {
                      const existing = latestTests.get(test.test_name);
                      if (!existing || new Date(test.test_date) > new Date(existing.test_date)) {
                        latestTests.set(test.test_name, test);
                      }
                    });
                    
                    const scores = Array.from(latestTests.values()).map(t => {
                      const benchmark = findBenchmark(t.test_name);
                      return benchmark ? calculateScore(t.value, benchmark, athleteAge, athleteGender) : null;
                    }).filter((s): s is number => s !== null);
                    
                    if (scores.length === 0) return null;
                    
                    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                    const percentage = scoreToPercentage(avgScore);
                    
                    return (
                      <div key={category.value} className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
                        <MiniSpeedometer value={percentage} size={70} />
                        <span className="text-xs font-medium mt-2 text-center">{category.label}</span>
                      </div>
                    );
                  }).filter(Boolean)}
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
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={({ payload, x, y, textAnchor, ...rest }) => {
                      // Truncate long labels
                      const label = payload.value.length > 18 
                        ? payload.value.substring(0, 16) + '..' 
                        : payload.value;
                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor={textAnchor}
                          fill="hsl(var(--foreground))"
                          fontSize={10}
                          {...rest}
                        >
                          {label}
                        </text>
                      );
                    }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value}%`}
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
                    formatter={(value: any) => [`${value.toFixed(0)}%`, 'Skor']}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Grafik menampilkan {radarData.length} item tes yang telah dilakukan (skala 0-100%)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Test Results Grouped */}
        {groupBy === 'category' ? (
          // Group by Biomotor Category
          <div className="space-y-8">
            {CATEGORIES.map(category => {
              const categoryTests = tests.filter(t => t.category === category.value);
              if (categoryTests.length === 0) return null;

              // Group tests by test name within category
              const testsByName = categoryTests.reduce((acc, test) => {
                if (!acc[test.test_name]) acc[test.test_name] = [];
                acc[test.test_name].push(test);
                return acc;
              }, {} as Record<string, PhysicalTest[]>);

              // Check if this is a priority category for the sport
              const isPriority = athleteSport && SPORT_BIOMOTOR_PRIORITY[athleteSport]?.slice(0, 3).includes(category.value);

              return (
                <div key={category.value}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold">{category.label}</h2>
                    {isPriority && (
                      <Badge variant="default" className="text-xs">
                        Prioritas {getSportLabel(athleteSport)}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(testsByName).length} jenis tes
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(testsByName).map(([testName, testList]) => {
                      const benchmark = findBenchmark(testName);
                      const latestTest = testList[0];
                      const score = benchmark ? calculateScore(latestTest.value, benchmark, athleteAge, athleteGender) : null;

                      return (
                        <Card key={testName}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{testName}</CardTitle>
                                {score && (
                                  <Badge className={`${getScoreColor(score)} text-xs`}>
                                    {score}/5
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {testList.length} data
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              {testList.slice(0, 3).map((test) => {
                                const testScore = benchmark ? calculateScore(test.value, benchmark, athleteAge, athleteGender) : null;
                                return (
                                  <div 
                                    key={test.id}
                                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-secondary/30 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">
                                        {test.value} {test.unit}
                                      </span>
                                      {testScore && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          testScore >= 4 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                          testScore >= 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                          {getScoreLabel(testScore)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground text-xs">
                                        {new Date(test.test_date).toLocaleDateString('id-ID')}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => deleteTest(test.id)}
                                      >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Group by Sport Context - Show recommendations
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Analisis untuk {getSportLabel(athleteSport)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {athleteSport && SPORT_BIOMOTOR_PRIORITY[athleteSport] ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Prioritas Komponen Biomotor:</h3>
                      <div className="flex flex-wrap gap-2">
                        {SPORT_BIOMOTOR_PRIORITY[athleteSport].map((cat, idx) => {
                          const catLabel = CATEGORIES.find(c => c.value === cat)?.label || cat;
                          const hasTests = tests.some(t => t.category === cat);
                          return (
                            <Badge 
                              key={cat} 
                              variant={idx < 3 ? "default" : "secondary"}
                              className={`text-sm py-1 px-3 ${!hasTests ? 'opacity-50' : ''}`}
                            >
                              {idx + 1}. {catLabel}
                              {!hasTests && ' (Belum ada tes)'}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {SPORT_BIOMOTOR_PRIORITY[athleteSport].map((cat, idx) => {
                        const catLabel = CATEGORIES.find(c => c.value === cat)?.label || cat;
                        const categoryTests = tests.filter(t => t.category === cat);
                        
                        // Calculate average score for this category
                        const scores = categoryTests.map(t => {
                          const benchmark = findBenchmark(t.test_name);
                          return benchmark ? calculateScore(t.value, benchmark, athleteAge, athleteGender) : null;
                        }).filter((s): s is number => s !== null);
                        
                        const avgScore = scores.length > 0 
                          ? scores.reduce((a, b) => a + b, 0) / scores.length 
                          : null;

                        return (
                          <Card key={cat} className={idx < 3 ? 'border-primary/50' : ''}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  {idx < 3 && <span className="text-primary">★</span>}
                                  {catLabel}
                                </CardTitle>
                                {avgScore && (
                                  <Badge className={getScoreColor(Math.round(avgScore))}>
                                    {avgScore.toFixed(1)}/5
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              {categoryTests.length > 0 ? (
                                <div className="space-y-1 text-sm">
                                  {Array.from(new Set(categoryTests.map(t => t.test_name))).slice(0, 3).map(testName => {
                                    const latestTest = categoryTests.find(t => t.test_name === testName);
                                    return (
                                      <div key={testName} className="flex justify-between text-muted-foreground">
                                        <span className="truncate">{testName}</span>
                                        <span>{latestTest?.value} {latestTest?.unit}</span>
                                      </div>
                                    );
                                  })}
                                  {categoryTests.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{categoryTests.length - 3} tes lainnya
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Belum ada data tes
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Gender-specific info */}
                    <div className="p-4 bg-secondary/50 rounded-lg">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Norma {athleteGender === 'male' ? 'Laki-laki' : 'Perempuan'} - {getAgeGroupLabel(getAgeGroup(athleteAge))}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Semua skor dihitung berdasarkan norma untuk {athleteGender === 'male' ? 'laki-laki' : 'perempuan'} 
                        {' '}usia {athleteAge} tahun (kelompok {getAgeGroupLabel(getAgeGroup(athleteAge))}).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Cabang olahraga belum ditentukan di profil atlet.</p>
                    <p className="text-sm mt-2">Silakan update profil untuk melihat analisis berdasarkan cabang olahraga.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
