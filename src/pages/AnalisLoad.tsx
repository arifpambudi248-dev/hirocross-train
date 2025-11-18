import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { aggregateDailyLoad, computeFitnessFatigueForm, computeACWR } from "@/lib/trainingLoad";

export default function AnalisLoad() {
  const [userId, setUserId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fffData, setFffData] = useState<any[]>([]);
  const [acwrData, setAcwrData] = useState<any[]>([]);

  useEffect(() => {
    loadUser();
    
    // Default 90 hari terakhir
    const today = new Date();
    const past90 = new Date(today);
    past90.setDate(today.getDate() - 90);
    
    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(past90.toISOString().split("T")[0]);
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadAnalysis = async () => {
    if (!userId || !startDate || !endDate) {
      toast.error("Harap lengkapi tanggal");
      return;
    }

    const { data, error } = await (supabase as any)
      .from("training_sessions")
      .select("date, load_final")
      .eq("athlete_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      toast.error("Tidak ada data di rentang tanggal ini");
      return;
    }

    const dailyLoads = aggregateDailyLoad(data as any[]);
    const fff = computeFitnessFatigueForm({ dailyLoads });
    const acwr = computeACWR(dailyLoads);

    setFffData(fff);
    setAcwrData(acwr);
    toast.success("Analisis berhasil dimuat");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Analisis Training Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Akhir</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadAnalysis} className="w-full">
                  Analisis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {fffData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fitness – Fatigue – Form (CTL / ATL / TSB)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fffData}>
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
                      dataKey="fitness"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      name="Fitness (CTL)"
                    />
                    <Line
                      type="monotone"
                      dataKey="fatigue"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      name="Fatigue (ATL)"
                    />
                    <Line
                      type="monotone"
                      dataKey="form"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name="Form (TSB)"
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>• <span className="text-success font-semibold">Fitness (CTL)</span>: Chronic Training Load - kebugaran jangka panjang (42 hari)</p>
                <p>• <span className="text-warning font-semibold">Fatigue (ATL)</span>: Acute Training Load - kelelahan jangka pendek (7 hari)</p>
                <p>• <span className="text-primary font-semibold">Form (TSB)</span>: Training Stress Balance = CTL - ATL</p>
                <p className="mt-2">Form negatif tinggi (&lt; -20) = risiko overtraining. Form positif moderat (0-20) = siap kompetisi.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {acwrData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>ACWR (Acute:Chronic Workload Ratio)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={acwrData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 2.5]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={0.8} stroke="hsl(var(--info))" strokeDasharray="3 3" label="Low Risk (0.8)" />
                    <ReferenceLine y={1.3} stroke="hsl(var(--success))" strokeDasharray="3 3" label="Sweet Spot (1.3)" />
                    <ReferenceLine y={1.5} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="High Risk (1.5)" />
                    <Line
                      type="monotone"
                      dataKey="ratio"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      name="ACWR"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>• <span className="text-info font-semibold">0.8 – 1.3</span>: Zona hijau (sweet spot - aman)</p>
                <p>• <span className="text-warning font-semibold">&lt; 0.8</span>: Load terlalu rendah (risiko deconditioning)</p>
                <p>• <span className="text-destructive font-semibold">&gt; 1.5</span>: Risiko tinggi (overload/injury)</p>
                <p className="mt-2">ACWR = Rata-rata load 7 hari / Rata-rata load 28 hari</p>
              </div>
            </CardContent>
          </Card>
        )}

        {fffData.length === 0 && acwrData.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Pilih rentang tanggal dan klik "Analisis" untuk melihat grafik
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
