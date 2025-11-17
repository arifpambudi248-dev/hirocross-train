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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PhysicalTest } from "@/types/database";

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
      } as any]);

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

            {chartData.length > 0 && (
              <div className="h-80">
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
