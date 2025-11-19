import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { differenceInDays, addDays, format, parseISO, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

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

export default function AnnualPlan() {
  const [startDate, setStartDate] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");
  const [phases, setPhases] = useState<Phase[]>([]);
  const [phasesWithLoad, setPhasesWithLoad] = useState<PhaseWithLoad[]>([]);
  const [showActualLoad, setShowActualLoad] = useState(true);
  const [trainingSessions, setTrainingSessions] = useState<any[]>([]);

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

    // Hitung durasi tiap fase berdasarkan persentase
    const gppDays = Math.round(totalDays * 0.4);
    const sppDays = Math.round(totalDays * 0.3);
    const preDays = Math.round(totalDays * 0.2);
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
        percentage: 40,
      },
      {
        name: "Persiapan Khusus (SPP)",
        color: "bg-chart-2",
        startDate: format(sppStart, "yyyy-MM-dd"),
        endDate: format(sppEnd, "yyyy-MM-dd"),
        durationDays: sppDays,
        percentage: 30,
      },
      {
        name: "Pra Kompetisi",
        color: "bg-chart-3",
        startDate: format(preStart, "yyyy-MM-dd"),
        endDate: format(preEnd, "yyyy-MM-dd"),
        durationDays: preDays,
        percentage: 20,
      },
      {
        name: "Kompetisi",
        color: "bg-chart-4",
        startDate: format(compStart, "yyyy-MM-dd"),
        endDate: format(compEnd, "yyyy-MM-dd"),
        durationDays: compDays,
        percentage: 10,
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
      let plannedLoadPerDay = 0;
      if (phase.name.includes("GPP")) plannedLoadPerDay = 250;
      else if (phase.name.includes("SPP")) plannedLoadPerDay = 350;
      else if (phase.name.includes("Pra")) plannedLoadPerDay = 300;
      else plannedLoadPerDay = 200;

      const plannedLoad = plannedLoadPerDay * phase.durationDays;

      return {
        ...phase,
        plannedLoad,
        actualLoad,
      };
    });

    setPhasesWithLoad(phasesWithLoadData);
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Perbandingan Planned vs Actual Load</CardTitle>
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
