import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { differenceInDays, addDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type Phase = {
  name: string;
  color: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  percentage: number;
};

export default function AnnualPlan() {
  const [startDate, setStartDate] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");
  const [phases, setPhases] = useState<Phase[]>([]);

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
                <CardTitle>Timeline Periodisasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {phases.map((phase, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{phase.name}</span>
                        <span className="text-muted-foreground">
                          {phase.durationDays} hari ({phase.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-8 rounded-lg overflow-hidden bg-muted">
                        <div
                          className={`h-full ${phase.color} flex items-center px-3 text-xs font-medium text-primary-foreground`}
                          style={{
                            width: `${phase.percentage * 2.5}%`,
                            minWidth: "20%",
                          }}
                        >
                          {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
