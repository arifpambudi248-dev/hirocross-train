import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import type { PhysicalTest } from "@/types/database";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("endurance");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PhysicalTest>({
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
    }
  };

  const loadTests = async (uid: string) => {
    const { data, error } = await supabase
      .from("physical_tests")
      .select("*")
      .eq("athlete_id", uid)
      .order("test_date", { ascending: false });

    if (error) {
      toast.error("Gagal memuat data: " + error.message);
    } else {
      setTests((data as any[]) || []);
    }
  };

  const saveTest = async () => {
    if (!userId || !formData.test_name || !formData.value) {
      toast.error("Harap lengkapi semua field");
      return;
    }

    const { error } = await supabase
      .from("physical_tests")
      .insert([{
        athlete_id: userId,
        ...formData,
      }]);

    if (error) {
      toast.error("Gagal simpan: " + error.message);
    } else {
      toast.success("Tes berhasil disimpan");
      loadTests(userId);
      setShowForm(false);
      setFormData({
        test_date: new Date().toISOString().split("T")[0],
        category: "endurance",
        test_name: "",
        value: 0,
        unit: "",
        notes: "",
      });
    }
  };

  const deleteTest = async (id: string) => {
    const { error } = await supabase
      .from("physical_tests")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Gagal hapus: " + error.message);
    } else {
      toast.success("Tes berhasil dihapus");
      if (userId) loadTests(userId);
    }
  };

  const filteredTests = tests.filter((t) => t.category === selectedCategory);
  
  // Prepare chart data
  const chartData = filteredTests.map((t) => ({
    date: t.test_date,
    value: t.value,
    name: t.test_name,
  })).reverse();

  // Prepare radar chart data
  const radarData = (() => {
    const categoryBenchmarks = BENCHMARKS[selectedCategory as keyof typeof BENCHMARKS] || [];
    
    return categoryBenchmarks.map(benchmark => {
      // Find the latest test for this test name
      const latestTest = filteredTests
        .filter(t => t.test_name === benchmark.testName)
        .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
      
      if (!latestTest) {
        return {
          subject: benchmark.testName,
          athlete: 0,
          excellent: 100,
          good: 75,
          average: 50,
        };
      }
      
      // Normalize the value to percentage (0-100)
      let athleteScore = 0;
      if (benchmark.inverse) {
        // For inverse metrics (lower is better), invert the calculation
        athleteScore = Math.max(0, Math.min(100, 
          ((benchmark.poor - latestTest.value) / (benchmark.poor - benchmark.elite)) * 100
        ));
      } else {
        // For normal metrics (higher is better)
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
        poor: 30,
      };
    });
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tes Kondisi Fisik</CardTitle>
              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Tes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {showForm && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary rounded-lg">
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
                <div className="space-y-2">
                  <Label>Nama Tes</Label>
                  <Input
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    placeholder="Contoh: VO2max, 10m sprint, CMJ"
                  />
                </div>
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
                    placeholder="ml/kg/min, s, cm, dll"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Catatan tambahan"
                  />
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Batal
                  </Button>
                  <Button onClick={saveTest}>Simpan Tes</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Filter Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64">
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

            {/* Radar Chart First - Most Important View */}
            {radarData.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Profil Performa vs Benchmark (Jaring Laba-laba)</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="test" stroke="hsl(var(--foreground))" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Radar
                      name="Skor Atlet"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Elite"
                      dataKey="elite"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
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
            )}

            {/* Performance Trend Chart */}
            <div className="grid grid-cols-1 gap-6">
              {chartData.length > 0 && (
                <div className="h-80">
                  <h3 className="text-sm font-medium mb-4">Tren Performa Detail (Per Kategori)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {radarData.length > 0 && radarData.some(d => d.athlete > 0) && (
                <div className="h-80">
                  <h3 className="text-sm font-medium mb-4">Profil Performa vs Benchmark</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
                        stroke="#8b5cf6" 
                        fill="#8b5cf6" 
                        fillOpacity={0.1}
                      />
                      <Radar 
                        name="Excellent" 
                        dataKey="excellent" 
                        stroke="#22c55e" 
                        fill="#22c55e" 
                        fillOpacity={0.1}
                      />
                      <Radar 
                        name="Good" 
                        dataKey="good" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.1}
                      />
                      <Radar 
                        name="Average" 
                        dataKey="average" 
                        stroke="#eab308" 
                        fill="#eab308" 
                        fillOpacity={0.1}
                      />
                      <Radar 
                        name="Poor" 
                        dataKey="poor" 
                        stroke="#ef4444" 
                        fill="#ef4444" 
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
              )}
            </div>

            {/* Benchmark Reference Table */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Referensi Benchmark (5 Skala)</h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Tes</TableHead>
                      <TableHead className="text-purple-500">Elite</TableHead>
                      <TableHead className="text-green-500">Excellent</TableHead>
                      <TableHead className="text-blue-500">Good</TableHead>
                      <TableHead className="text-yellow-500">Average</TableHead>
                      <TableHead className="text-red-500">Poor</TableHead>
                      <TableHead>Satuan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(BENCHMARKS[selectedCategory as keyof typeof BENCHMARKS] || []).map((benchmark, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{benchmark.testName}</TableCell>
                        <TableCell className="text-purple-500">{benchmark.elite}</TableCell>
                        <TableCell className="text-green-500">{benchmark.excellent}</TableCell>
                        <TableCell className="text-blue-500">{benchmark.good}</TableCell>
                        <TableCell className="text-yellow-500">{benchmark.average}</TableCell>
                        <TableCell className="text-red-500">{benchmark.poor}</TableCell>
                        <TableCell className="text-muted-foreground">{benchmark.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nama Tes</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell>{test.test_date}</TableCell>
                    <TableCell>{test.test_name}</TableCell>
                    <TableCell className="font-semibold">{test.value}</TableCell>
                    <TableCell>{test.unit}</TableCell>
                    <TableCell>{test.notes}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => test.id && deleteTest(test.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredTests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data tes untuk kategori ini.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
