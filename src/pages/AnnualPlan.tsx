import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { differenceInDays, addDays, format, parseISO, isWithinInterval, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { Pencil } from "lucide-react";

type Phase = {
  name: string;
  color: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  percentage: number;
};

type PhaseWithLoad = Phase & {
  plannedLoad: number;
  actualLoad: number;
};

type EditablePercentages = {
  gpp: number;
  spp: number;
  pre: number;
  comp: number;
};

export default function AnnualPlan() {
  const [startDate, setStartDate] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");
  const [phases, setPhases] = useState<Phase[]>([]);
  const [phasesWithLoad, setPhasesWithLoad] = useState<PhaseWithLoad[]>([]);
  const [showActualLoad, setShowActualLoad] = useState(true);
  const [trainingSessions, setTrainingSessions] = useState<any[]>([]);
  const [isEditingPercentages, setIsEditingPercentages] = useState(false);
  const [editablePercentages, setEditablePercentages] = useState<EditablePercentages>({
    gpp: 40,
    spp: 30,
    pre: 20,
    comp: 10,
  });
  const [isEditingLoads, setIsEditingLoads] = useState(false);
  const [editableLoads, setEditableLoads] = useState<{ [key: string]: number }>({});

  const generatePlan = () => {
    if (!startDate || !competitionDate) {
      toast.error("Harap isi tanggal mulai dan tanggal pertandingan");
      return;
    }

    const start = new Date(startDate);
    const competition = new Date(competitionDate);

    if (start >= competition) {
      toast.error("Tanggal pertandingan harus setelah tanggal mulai latihan");
      return;
    }

    const totalDays = differenceInDays(competition, start);

    if (totalDays < 14) {
      toast.error("Durasi perencanaan minimal 14 hari");
      return;
    }

    // Hitung durasi tiap fase berdasarkan persentase (gunakan editable percentages)
    const gppDays = Math.round(totalDays * (editablePercentages.gpp / 100));
    const sppDays = Math.round(totalDays * (editablePercentages.spp / 100));
    const preDays = Math.round(totalDays * (editablePercentages.pre / 100));
    const compDays = totalDays - gppDays - sppDays - preDays; // Sisa hari untuk kompetisi

    // Hitung tanggal mulai dan akhir tiap fase
    const gppStart = start;
    const gppEnd = addDays(gppStart, gppDays - 1);

    const sppStart = addDays(gppEnd, 1);
    const sppEnd = addDays(sppStart, sppDays - 1);

    const preStart = addDays(sppEnd, 1);
    const preEnd = addDays(preStart, preDays - 1);

    const compStart = addDays(preEnd, 1);
    const compEnd = competition;

    const newPhases: Phase[] = [
      {
        name: "Persiapan Umum (GPP)",
        color: "bg-chart-1",
        startDate: format(gppStart, "yyyy-MM-dd"),
        endDate: format(gppEnd, "yyyy-MM-dd"),
        durationDays: gppDays,
        percentage: editablePercentages.gpp,
      },
      {
        name: "Persiapan Khusus (SPP)",
        color: "bg-chart-2",
        startDate: format(sppStart, "yyyy-MM-dd"),
        endDate: format(sppEnd, "yyyy-MM-dd"),
        durationDays: sppDays,
        percentage: editablePercentages.spp,
      },
      {
        name: "Pra Kompetisi",
        color: "bg-chart-3",
        startDate: format(preStart, "yyyy-MM-dd"),
        endDate: format(preEnd, "yyyy-MM-dd"),
        durationDays: preDays,
        percentage: editablePercentages.pre,
      },
      {
        name: "Kompetisi",
        color: "bg-chart-4",
        startDate: format(compStart, "yyyy-MM-dd"),
        endDate: format(compEnd, "yyyy-MM-dd"),
        durationDays: compDays,
        percentage: editablePercentages.comp,
      },
    ];

    setPhases(newPhases);
    toast.success("Annual plan berhasil dibuat");
    fetchTrainingSessions(format(start, "yyyy-MM-dd"), format(competition, "yyyy-MM-dd"));
  };

  const fetchTrainingSessions = async (start: string, end: string) => {
    try {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      if (error) throw error;
      setTrainingSessions(data || []);
    } catch (error) {
      console.error("Error fetching training sessions:", error);
    }
  };

  useEffect(() => {
    if (phases.length > 0 && trainingSessions.length > 0) {
      calculateLoadPerPhase();
    }
  }, [phases, trainingSessions]);

  const calculateLoadPerPhase = () => {
    const phasesWithLoadData: PhaseWithLoad[] = phases.map((phase) => {
      const phaseStart = parseISO(phase.startDate);
      const phaseEnd = parseISO(phase.endDate);

      // Calculate actual load from training sessions
      const actualLoad = trainingSessions
        .filter((session) => {
          const sessionDate = parseISO(session.date);
          return isWithinInterval(sessionDate, { start: phaseStart, end: phaseEnd });
        })
        .reduce((sum, session) => sum + (session.load_final || 0), 0);

      // Calculate planned load based on phase type and duration
      // Check if there's a manual override in editableLoads
      let plannedLoad = 0;
      const phaseKey = phase.name;
      
      if (editableLoads[phaseKey] !== undefined) {
        plannedLoad = editableLoads[phaseKey];
      } else {
        let plannedLoadPerDay = 0;
        if (phase.name.includes("GPP")) plannedLoadPerDay = 250;
        else if (phase.name.includes("SPP")) plannedLoadPerDay = 350;
        else if (phase.name.includes("Pra")) plannedLoadPerDay = 300;
        else plannedLoadPerDay = 200;

        plannedLoad = plannedLoadPerDay * phase.durationDays;
      }

      return {
        ...phase,
        plannedLoad,
        actualLoad,
      };
    });

    setPhasesWithLoad(phasesWithLoadData);
  };

  const handlePercentageChange = (phase: keyof EditablePercentages, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditablePercentages((prev) => ({
      ...prev,
      [phase]: numValue,
    }));
  };

  const handleSavePercentages = () => {
    const total = editablePercentages.gpp + editablePercentages.spp + editablePercentages.pre + editablePercentages.comp;
    
    if (Math.abs(total - 100) > 0.1) {
      toast.error(`Total persentase harus 100% (saat ini: ${total.toFixed(1)}%)`);
      return;
    }
    
    setIsEditingPercentages(false);
    toast.success("Persentase fase berhasil diperbarui");
    // Regenerate plan with new percentages
    if (startDate && competitionDate) {
      generatePlan();
    }
  };

  const handleLoadChange = (phaseName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditableLoads((prev) => ({
      ...prev,
      [phaseName]: numValue,
    }));
  };

  const handleSaveLoads = () => {
    setIsEditingLoads(false);
    toast.success("Planned load berhasil diperbarui");
    calculateLoadPerPhase();
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMMM yyyy", { locale: localeId });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Annual Plan Periodization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai Latihan</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitionDate">Tanggal Pertandingan</Label>
                <Input
                  id="competitionDate"
                  type="date"
                  value={competitionDate}
                  onChange={(e) => setCompetitionDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={generatePlan} className="w-full">
                  Generate Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {phases.length > 0 && (
          <>
            {/* Editable Percentages Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Konfigurasi Persentase Fase</CardTitle>
                <Button
                  variant={isEditingPercentages ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isEditingPercentages) {
                      handleSavePercentages();
                    } else {
                      setIsEditingPercentages(true);
                    }
                  }}
                >
                  {isEditingPercentages ? "Simpan" : <><Pencil className="w-4 h-4 mr-2" />Edit Persentase</>}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gpp-percent">GPP (%)</Label>
                    <Input
                      id="gpp-percent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editablePercentages.gpp}
                      onChange={(e) => handlePercentageChange("gpp", e.target.value)}
                      disabled={!isEditingPercentages}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spp-percent">SPP (%)</Label>
                    <Input
                      id="spp-percent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editablePercentages.spp}
                      onChange={(e) => handlePercentageChange("spp", e.target.value)}
                      disabled={!isEditingPercentages}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pre-percent">Pra Kompetisi (%)</Label>
                    <Input
                      id="pre-percent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editablePercentages.pre}
                      onChange={(e) => handlePercentageChange("pre", e.target.value)}
                      disabled={!isEditingPercentages}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-percent">Kompetisi (%)</Label>
                    <Input
                      id="comp-percent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editablePercentages.comp}
                      onChange={(e) => handlePercentageChange("comp", e.target.value)}
                      disabled={!isEditingPercentages}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total: {(editablePercentages.gpp + editablePercentages.spp + editablePercentages.pre + editablePercentages.comp).toFixed(1)}%
                  {Math.abs((editablePercentages.gpp + editablePercentages.spp + editablePercentages.pre + editablePercentages.comp) - 100) > 0.1 && (
                    <span className="text-destructive ml-2">⚠ Harus berjumlah 100%</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gantt Chart Periodisasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Timeline scale */}
                  <div className="relative">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{formatDate(startDate)}</span>
                      <span>{formatDate(competitionDate)}</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-0 flex">
                        {phases.map((phase, index) => (
                          <div
                            key={index}
                            className={`${phase.color} h-full`}
                            style={{ width: `${phase.percentage}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Phase bars */}
                  <div className="space-y-3">
                    {phases.map((phase, index) => {
                      const totalDays = differenceInDays(
                        new Date(competitionDate),
                        new Date(startDate)
                      );
                      const startOffset =
                        (differenceInDays(new Date(phase.startDate), new Date(startDate)) /
                          totalDays) *
                        100;
                      const width = (phase.durationDays / totalDays) * 100;

                      return (
                        <div key={index} className="relative">
                          <div className="flex items-center gap-3">
                            <div className="w-40 text-sm font-medium truncate">
                              {phase.name}
                            </div>
                            <div className="flex-1 relative h-10">
                              <div
                                className={`absolute h-full ${phase.color} rounded-lg flex items-center px-3 text-xs font-medium text-primary-foreground shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}
                                style={{
                                  left: `${startOffset}%`,
                                  width: `${width}%`,
                                }}
                                title={`${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}`}
                              >
                                <span className="truncate">
                                  {phase.durationDays} hari ({phase.percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {phasesWithLoad.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Grafik Training Load Mingguan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Generate weekly data
                      const weeklyData = [];
                      if (startDate && competitionDate) {
                        const weeks = eachWeekOfInterval({
                          start: new Date(startDate),
                          end: new Date(competitionDate)
                        }, { weekStartsOn: 1 });

                        weeks.forEach((weekStart, index) => {
                          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                          
                          // Calculate training load for this week
                          const weekSessions = trainingSessions.filter(session => {
                            const sessionDate = new Date(session.date);
                            return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
                          });
                          
                          const trainingLoad = weekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
                          
                          // Calculate volume, intensity, peaking based on phase
                          let volume = 0;
                          let intensity = 0;
                          let peaking = 0;
                          
                          const currentPhase = phases.find(p => 
                            isWithinInterval(weekStart, { 
                              start: new Date(p.startDate), 
                              end: new Date(p.endDate) 
                            })
                          );
                          
                          if (currentPhase) {
                            if (currentPhase.name.includes("GPP")) {
                              volume = 85 + Math.random() * 15;
                              intensity = 40 + Math.random() * 20;
                              peaking = 35 + Math.random() * 15;
                            } else if (currentPhase.name.includes("SPP")) {
                              volume = 65 + Math.random() * 15;
                              intensity = 60 + Math.random() * 20;
                              peaking = 45 + Math.random() * 15;
                            } else if (currentPhase.name.includes("Pra")) {
                              volume = 30 + Math.random() * 10;
                              intensity = 80 + Math.random() * 20;
                              peaking = 85 + Math.random() * 15;
                            } else {
                              volume = 10 + Math.random() * 10;
                              intensity = 30 + Math.random() * 20;
                              peaking = 95 + Math.random() * 5;
                            }
                          }
                          
                          weeklyData.push({
                            week: index + 1,
                            trainingLoad,
                            volume: Math.round(volume),
                            intensity: Math.round(intensity),
                            peaking: Math.round(peaking)
                          });
                        });
                      }
                      
                      return (
                        <ResponsiveContainer width="100%" height={400}>
                          <ComposedChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="week" 
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              label={{ value: 'Minggu', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              yAxisId="left"
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              label={{ value: 'Training Load (AU)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              label={{ value: 'Volume/Intensity/Peaking (%)', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Bar 
                              yAxisId="left"
                              dataKey="trainingLoad" 
                              fill="hsl(var(--chart-3))" 
                              name="Training Load"
                              opacity={0.8}
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="volume" 
                              stroke="#FFC107" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              name="Volume"
                              dot={{ fill: '#FFC107', r: 3 }}
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="intensity" 
                              stroke="#F44336" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              name="Intensity"
                              dot={{ fill: '#F44336', r: 3 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Perbandingan Planned vs Actual Load</CardTitle>
                    <div className="flex items-center gap-4">
                      <Button
                        variant={isEditingLoads ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (isEditingLoads) {
                            handleSaveLoads();
                          } else {
                            setIsEditingLoads(true);
                            // Initialize editable loads with current planned loads
                            const initialLoads: { [key: string]: number } = {};
                            phasesWithLoad.forEach((phase) => {
                              initialLoads[phase.name] = phase.plannedLoad;
                            });
                            setEditableLoads(initialLoads);
                          }
                        }}
                      >
                        {isEditingLoads ? "Simpan Load" : <><Pencil className="w-4 h-4 mr-2" />Edit Planned Load</>}
                      </Button>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="show-actual" className="text-sm">
                          Tampilkan Actual Load
                        </Label>
                        <Switch
                          id="show-actual"
                          checked={showActualLoad}
                          onCheckedChange={setShowActualLoad}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {phasesWithLoad.map((phase, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded ${phase.color}`}></div>
                              <span className="font-medium text-sm">{phase.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {isEditingLoads && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">Planned Load:</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={editableLoads[phase.name] || phase.plannedLoad}
                                    onChange={(e) => handleLoadChange(phase.name, e.target.value)}
                                    className="w-32 h-8"
                                  />
                                  <span className="text-xs text-muted-foreground">AU</span>
                                </div>
                              )}
                              {!isEditingLoads && (
                                <div className="text-sm text-muted-foreground">
                                  Planned: {phase.plannedLoad.toLocaleString()} AU
                                  {showActualLoad && (
                                    <span className="ml-2">
                                      | Actual: {phase.actualLoad.toLocaleString()} AU (
                                      {phase.plannedLoad > 0
                                        ? Math.round((phase.actualLoad / phase.plannedLoad) * 100)
                                        : 0}
                                      %)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                            {/* Planned load bar */}
                            <div
                              className="absolute h-full bg-muted-foreground/30 rounded-lg"
                              style={{
                                width: "100%",
                              }}
                            />
                            {/* Actual load bar */}
                            {showActualLoad && (
                              <div
                                className={`absolute h-full ${phase.color} rounded-lg transition-all`}
                                style={{
                                  width: `${phase.plannedLoad > 0 ? Math.min((phase.actualLoad / phase.plannedLoad) * 100, 100) : 0}%`,
                                }}
                              />
                            )}
                            <div className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                              <span className="text-foreground">
                                {showActualLoad
                                  ? `${phase.actualLoad.toLocaleString()} / ${phase.plannedLoad.toLocaleString()} AU`
                                  : `${phase.plannedLoad.toLocaleString()} AU`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Detail Fase Periodisasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4">Fase</th>
                        <th className="text-left py-3 px-4">Tanggal Mulai</th>
                        <th className="text-left py-3 px-4">Tanggal Akhir</th>
                        <th className="text-right py-3 px-4">Durasi (hari)</th>
                        <th className="text-right py-3 px-4">Persentase</th>
                        <th className="text-left py-3 px-4">Fokus Latihan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 font-medium">
                          <span className="inline-block w-3 h-3 rounded bg-chart-1 mr-2"></span>
                          Persiapan Umum (GPP)
                        </td>
                        <td className="py-3 px-4">{formatDate(phases[0].startDate)}</td>
                        <td className="py-3 px-4">{formatDate(phases[0].endDate)}</td>
                        <td className="py-3 px-4 text-right">{phases[0].durationDays}</td>
                        <td className="py-3 px-4 text-right">{phases[0].percentage}%</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          Volume tinggi, intensitas rendah, latihan dasar umum
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 font-medium">
                          <span className="inline-block w-3 h-3 rounded bg-chart-2 mr-2"></span>
                          Persiapan Khusus (SPP)
                        </td>
                        <td className="py-3 px-4">{formatDate(phases[1].startDate)}</td>
                        <td className="py-3 px-4">{formatDate(phases[1].endDate)}</td>
                        <td className="py-3 px-4 text-right">{phases[1].durationDays}</td>
                        <td className="py-3 px-4 text-right">{phases[1].percentage}%</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          Volume sedang, intensitas meningkat, latihan spesifik cabang olahraga
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 font-medium">
                          <span className="inline-block w-3 h-3 rounded bg-chart-3 mr-2"></span>
                          Pra Kompetisi
                        </td>
                        <td className="py-3 px-4">{formatDate(phases[2].startDate)}</td>
                        <td className="py-3 px-4">{formatDate(phases[2].endDate)}</td>
                        <td className="py-3 px-4 text-right">{phases[2].durationDays}</td>
                        <td className="py-3 px-4 text-right">{phases[2].percentage}%</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          Volume menurun, intensitas tinggi, simulasi kompetisi
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">
                          <span className="inline-block w-3 h-3 rounded bg-chart-4 mr-2"></span>
                          Kompetisi
                        </td>
                        <td className="py-3 px-4">{formatDate(phases[3].startDate)}</td>
                        <td className="py-3 px-4">{formatDate(phases[3].endDate)}</td>
                        <td className="py-3 px-4 text-right">{phases[3].durationDays}</td>
                        <td className="py-3 px-4 text-right">{phases[3].percentage}%</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          Volume minimal, intensitas maksimal, tapering & peaking
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rekomendasi Load per Fase</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded bg-chart-1"></div>
                      <h4 className="font-semibold text-sm">GPP</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Volume: <span className="text-foreground font-medium">Tinggi</span></p>
                      <p className="text-muted-foreground">Intensitas: <span className="text-foreground font-medium">Rendah-Sedang</span></p>
                      <p className="text-muted-foreground">RPE Target: <span className="text-foreground font-medium">4-6</span></p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded bg-chart-2"></div>
                      <h4 className="font-semibold text-sm">SPP</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Volume: <span className="text-foreground font-medium">Sedang</span></p>
                      <p className="text-muted-foreground">Intensitas: <span className="text-foreground font-medium">Sedang-Tinggi</span></p>
                      <p className="text-muted-foreground">RPE Target: <span className="text-foreground font-medium">6-8</span></p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded bg-chart-3"></div>
                      <h4 className="font-semibold text-sm">Pra Kompetisi</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Volume: <span className="text-foreground font-medium">Rendah</span></p>
                      <p className="text-muted-foreground">Intensitas: <span className="text-foreground font-medium">Tinggi</span></p>
                      <p className="text-muted-foreground">RPE Target: <span className="text-foreground font-medium">7-9</span></p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded bg-chart-4"></div>
                      <h4 className="font-semibold text-sm">Kompetisi</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Volume: <span className="text-foreground font-medium">Minimal</span></p>
                      <p className="text-muted-foreground">Intensitas: <span className="text-foreground font-medium">Maksimal</span></p>
                      <p className="text-muted-foreground">RPE Target: <span className="text-foreground font-medium">8-10</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {phases.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Masukkan tanggal mulai latihan dan tanggal pertandingan, lalu klik "Generate Plan" untuk membuat annual plan periodization
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
