import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";
import { computeReadinessScore } from "@/lib/readiness";
import type { ReadinessLog, Profile } from "@/types/database";
import { readinessSchema } from "@/lib/validationSchemas";
import { handleError, getFriendlyErrorMessage } from "@/lib/errorHandling";
import { z } from "zod";

export default function Readiness() {
  const [logs, setLogs] = useState<ReadinessLog[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [baselineVj, setBaselineVj] = useState<number>(40);
  const [baselineRhr, setBaselineRhr] = useState<number>(60);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vj: 40,
    rhr: 60,
    notes: "",
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedAthleteId) {
      loadLogs(selectedAthleteId);
      loadBaseline(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
        // Set own ID
        setSelectedAthleteId(user.id);
      }
    }
  };

  const loadBaseline = async (uid: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("baseline_vj, baseline_rhr")
      .eq("id", uid)
      .maybeSingle();

    if (profile) {
      const p = profile as any;
      setBaselineVj(p.baseline_vj || 40);
      setBaselineRhr(p.baseline_rhr || 60);
    }
  };

  const loadLogs = async (uid: string) => {
    const { data, error } = await supabase
      .from("readiness_logs")
      .select("*")
      .eq("athlete_id", uid)
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      handleError(error, getFriendlyErrorMessage(error));
    } else {
      setLogs((data as any[]) || []);
    }
  };

  const saveLog = async () => {
    if (!selectedAthleteId) return;

    try {
      // Validate input data
      const validatedData = readinessSchema.parse({
        date: formData.date,
        vj: formData.vj,
        rhr: formData.rhr,
        notes: formData.notes || undefined,
      });

      const result = computeReadinessScore(
        validatedData.vj,
        validatedData.rhr,
        baselineVj,
        baselineRhr
      );

      const { error } = await supabase
        .from("readiness_logs")
        .insert([{
          athlete_id: selectedAthleteId,
          date: validatedData.date,
          vj: validatedData.vj,
          rhr: validatedData.rhr,
          vj_score: result.vjScore,
          rhr_score: result.rhrScore,
          readiness_score: result.readinessScore,
          readiness_zone: result.zone,
          notes: validatedData.notes || null,
        }]);

      if (error) throw error;

      toast.success("Readiness log berhasil disimpan");
      loadLogs(selectedAthleteId);
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        vj: 40,
        rhr: 60,
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

  const getZoneBadge = (zone: string) => {
    if (zone === "prime") {
      return <Badge className="bg-success text-white">Prima</Badge>;
    } else if (zone === "moderate") {
      return <Badge className="bg-warning text-white">Sedang</Badge>;
    } else {
      return <Badge variant="destructive">Kurang</Badge>;
    }
  };

  const chartData = logs.map((l) => ({
    date: l.date,
    score: l.readiness_score,
  })).reverse();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Readiness Harian</CardTitle>
              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="h-4 w-4" />
                Log Readiness
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Athlete selector for coaches */}
            {isCoach && athletes.length > 0 && (
              <div className="space-y-2 pb-4 border-b">
                <Label>Pilih Atlet</Label>
                <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                  <SelectTrigger className="bg-background border-border">
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
              </div>
            )}

            {showForm && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary rounded-lg">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vertical Jump (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.vj}
                    onChange={(e) => setFormData({ ...formData, vj: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resting Heart Rate (bpm)</Label>
                  <Input
                    type="number"
                    value={formData.rhr}
                    onChange={(e) => setFormData({ ...formData, rhr: parseFloat(e.target.value) })}
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
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Baseline: VJ = {baselineVj} cm, RHR = {baselineRhr} bpm
                  </p>
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Batal
                  </Button>
                  <Button onClick={saveLog}>Simpan Log</Button>
                </div>
              </div>
            )}

            {chartData.length > 0 && (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <ReferenceLine y={40} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Low" />
                    <ReferenceLine y={70} stroke="hsl(var(--warning))" strokeDasharray="3 3" label="Moderate" />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>VJ (cm)</TableHead>
                  <TableHead>RHR (bpm)</TableHead>
                  <TableHead>Skor VJ</TableHead>
                  <TableHead>Skor RHR</TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{log.vj}</TableCell>
                    <TableCell>{log.rhr}</TableCell>
                    <TableCell>{log.vj_score}</TableCell>
                    <TableCell>{log.rhr_score}</TableCell>
                    <TableCell className="font-bold text-primary text-lg">
                      {log.readiness_score}
                    </TableCell>
                    <TableCell>{getZoneBadge(log.readiness_zone)}</TableCell>
                    <TableCell>{log.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {logs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Belum ada log readiness. Klik "Log Readiness" untuk memulai.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
