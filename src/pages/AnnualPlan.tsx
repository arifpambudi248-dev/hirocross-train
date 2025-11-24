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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { Pencil, Save, FolderOpen, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [userId, setUserId] = useState<string | null>(null);
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
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [periodizationType, setPeriodizationType] = useState<"traditional" | "block">("traditional");
  const [blockWeeks, setBlockWeeks] = useState({ accumulation: 3, transmutation: 2, realization: 1 });
  const [isEditingBlockParams, setIsEditingBlockParams] = useState(false);
  const [blockParameters, setBlockParameters] = useState({
    accumulation: { volume: 85, intensity: 50, peaking: 40 },
    transmutation: { volume: 70, intensity: 75, peaking: 60 },
    realization: { volume: 40, intensity: 90, peaking: 95 },
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadSavedPlans();
    }
  }, [userId]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadSavedPlans = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("annual_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat rencana tersimpan: " + error.message);
    } else {
      setSavedPlans(data || []);
    }
  };

  const savePlan = async () => {
    if (!userId || !planName || !startDate || !competitionDate) {
      toast.error("Harap lengkapi semua field");
      return;
    }

    const planData = {
      user_id: userId,
      plan_name: planName,
      start_date: startDate,
      competition_date: competitionDate,
      percentages: editablePercentages,
      planned_loads: editableLoads,
    };

    if (currentPlanId) {
      const { error } = await supabase
        .from("annual_plans")
        .update(planData)
        .eq("id", currentPlanId);

      if (error) {
        toast.error("Gagal update: " + error.message);
      } else {
        toast.success("Rencana berhasil diperbarui");
        loadSavedPlans();
        setShowSaveDialog(false);
      }
    } else {
      const { error } = await supabase
        .from("annual_plans")
        .insert([planData]);

      if (error) {
        toast.error("Gagal simpan: " + error.message);
      } else {
        toast.success("Rencana berhasil disimpan");
        loadSavedPlans();
        setShowSaveDialog(false);
      }
    }
  };

  const loadPlan = (planId: string) => {
    const selectedPlan = savedPlans.find(p => p.id === planId);
    if (selectedPlan) {
      setCurrentPlanId(selectedPlan.id);
      setPlanName(selectedPlan.plan_name);
      setStartDate(selectedPlan.start_date);
      setCompetitionDate(selectedPlan.competition_date);
      setEditablePercentages(selectedPlan.percentages);
      setEditableLoads(selectedPlan.planned_loads || {});
      setShowLoadDialog(false);
      setTimeout(() => {
        generatePlan();
      }, 100);
    }
  };

  const createNewPlan = () => {
    setCurrentPlanId(null);
    setPlanName("");
    setStartDate("");
    setCompetitionDate("");
    setPhases([]);
    setEditablePercentages({
      gpp: 40,
      spp: 30,
      pre: 20,
      comp: 10,
    });
    setEditableLoads({});
  };

  const generateBlockPeriodization = () => {
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
    const totalWeeks = Math.floor(totalDays / 7);
    
    const blockCycleDays = (blockWeeks.accumulation + blockWeeks.transmutation + blockWeeks.realization) * 7;
    const numCompleteCycles = Math.floor(totalDays / blockCycleDays);
    
    if (numCompleteCycles < 1) {
      toast.error(`Durasi minimal ${blockCycleDays} hari untuk block periodization`);
      return;
    }

    const newPhases: Phase[] = [];
    let currentDate = start;
    let blockNumber = 1;

    // Create complete block cycles
    for (let cycle = 0; cycle < numCompleteCycles; cycle++) {
      // Accumulation Block
      const accumDays = blockWeeks.accumulation * 7;
      const accumEnd = addDays(currentDate, accumDays - 1);
      newPhases.push({
        name: `Block ${blockNumber} - Accumulation`,
        color: "bg-red-500",
        startDate: format(currentDate, "yyyy-MM-dd"),
        endDate: format(accumEnd, "yyyy-MM-dd"),
        durationDays: accumDays,
        percentage: (accumDays / totalDays) * 100,
      });
      currentDate = addDays(accumEnd, 1);

      // Transmutation Block
      const transDays = blockWeeks.transmutation * 7;
      const transEnd = addDays(currentDate, transDays - 1);
      newPhases.push({
        name: `Block ${blockNumber} - Transmutation`,
        color: "bg-green-500",
        startDate: format(currentDate, "yyyy-MM-dd"),
        endDate: format(transEnd, "yyyy-MM-dd"),
        durationDays: transDays,
        percentage: (transDays / totalDays) * 100,
      });
      currentDate = addDays(transEnd, 1);

      // Realization Block
      const realDays = blockWeeks.realization * 7;
      const realEnd = addDays(currentDate, realDays - 1);
      newPhases.push({
        name: `Block ${blockNumber} - Realization`,
        color: "bg-primary",
        startDate: format(currentDate, "yyyy-MM-dd"),
        endDate: format(realEnd, "yyyy-MM-dd"),
        durationDays: realDays,
        percentage: (realDays / totalDays) * 100,
      });
      currentDate = addDays(realEnd, 1);
      blockNumber++;
    }

    // Handle remaining days as final realization
    const remainingDays = differenceInDays(competition, currentDate) + 1;
    if (remainingDays > 0) {
      newPhases.push({
        name: `Block ${blockNumber} - Final Realization`,
        color: "bg-primary",
        startDate: format(currentDate, "yyyy-MM-dd"),
        endDate: format(competition, "yyyy-MM-dd"),
        durationDays: remainingDays,
        percentage: (remainingDays / totalDays) * 100,
      });
    }

    setPhases(newPhases);
    toast.success("Block periodization berhasil dibuat");
    fetchTrainingSessions(format(start, "yyyy-MM-dd"), format(competition, "yyyy-MM-dd"));
  };

  const generatePlan = () => {
    if (periodizationType === "block") {
      generateBlockPeriodization();
      return;
    }

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
    const phasesWithLoadData: PhaseWithLoad[] = phases.map((phase, phaseIndex) => {
      const phaseStart = parseISO(phase.startDate);
      const phaseEnd = parseISO(phase.endDate);

      // Calculate actual load from training sessions
      const actualLoad = trainingSessions
        .filter((session) => {
          const sessionDate = parseISO(session.date);
          return isWithinInterval(sessionDate, { start: phaseStart, end: phaseEnd });
        })
        .reduce((sum, session) => sum + (session.load_final || 0), 0);

      // Calculate planned load with auto-adjust
      const phaseKey = phase.name;
      let plannedLoad = 0;
      
      if (editableLoads[phaseKey] !== undefined) {
        plannedLoad = editableLoads[phaseKey];
      } else {
        let plannedLoadPerDay = 0;
        if (phase.name.includes("GPP")) plannedLoadPerDay = 250;
        else if (phase.name.includes("SPP")) plannedLoadPerDay = 350;
        else if (phase.name.includes("Pra")) plannedLoadPerDay = 300;
        else plannedLoadPerDay = 200;

        // Auto-adjust based on previous phase performance
        if (autoAdjust && phaseIndex > 0 && trainingSessions.length > 0) {
          const previousPhase = phases[phaseIndex - 1];
          const prevStart = parseISO(previousPhase.startDate);
          const prevEnd = parseISO(previousPhase.endDate);

          const prevActual = trainingSessions
            .filter((s) => {
              const sd = parseISO(s.date);
              return isWithinInterval(sd, { start: prevStart, end: prevEnd });
            })
            .reduce((sum, s) => sum + (s.load_final || 0), 0);

          const prevPlanned = phasesWithLoad[phaseIndex - 1]?.plannedLoad || (plannedLoadPerDay * previousPhase.durationDays);

          if (prevActual > 0 && prevPlanned > 0) {
            const ratio = prevActual / prevPlanned;
            // Adjust load based on performance
            if (ratio < 0.8) {
              plannedLoadPerDay = plannedLoadPerDay * 0.9; // Reduce by 10%
            } else if (ratio > 1.2) {
              plannedLoadPerDay = plannedLoadPerDay * 1.1; // Increase by 10%
            }
          }
        }

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
            <div className="flex items-center justify-between">
              <CardTitle>Annual Plan Periodization</CardTitle>
              <div className="flex gap-2">
                <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Muat Rencana
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Muat Rencana Tersimpan</DialogTitle>
                      <DialogDescription>
                        Pilih rencana yang ingin dimuat
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {savedPlans.map((p) => (
                        <Button
                          key={p.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => loadPlan(p.id)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{p.plan_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.start_date} - {p.competition_date}
                            </div>
                          </div>
                        </Button>
                      ))}
                      {savedPlans.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Belum ada rencana tersimpan
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={createNewPlan} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Rencana Baru
                </Button>
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Save className="h-4 w-4" />
                      Simpan Rencana
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Simpan Rencana Tahunan</DialogTitle>
                      <DialogDescription>
                        Beri nama rencana untuk menyimpannya
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nama Rencana</Label>
                        <Input
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          placeholder="Contoh: Rencana Kompetisi 2025"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                        Batal
                      </Button>
                      <Button onClick={savePlan}>Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodType">Tipe Periodisasi</Label>
                <Select value={periodizationType} onValueChange={(val: "traditional" | "block") => setPeriodizationType(val)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="traditional">Traditional</SelectItem>
                    <SelectItem value="block">Block Periodization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="autoAdjust">Auto-Adjust Load</Label>
                <div className="flex items-center h-10 space-x-2">
                  <Switch
                    id="autoAdjust"
                    checked={autoAdjust}
                    onCheckedChange={setAutoAdjust}
                  />
                  <span className="text-sm text-muted-foreground">
                    Otomatis sesuaikan
                  </span>
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={generatePlan} className="w-full">
                  Generate Plan
                </Button>
              </div>
            </div>

            {/* Block Periodization Configuration */}
            {periodizationType === "block" && (
              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-medium mb-3 block">Konfigurasi Block (dalam minggu)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accum-weeks" className="text-xs">Accumulation Block</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <Input
                        id="accum-weeks"
                        type="number"
                        min="1"
                        max="6"
                        value={blockWeeks.accumulation}
                        onChange={(e) => setBlockWeeks(prev => ({ ...prev, accumulation: Number(e.target.value) }))}
                        className="h-8"
                      />
                      <span className="text-xs text-muted-foreground">minggu</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trans-weeks" className="text-xs">Transmutation Block</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <Input
                        id="trans-weeks"
                        type="number"
                        min="1"
                        max="6"
                        value={blockWeeks.transmutation}
                        onChange={(e) => setBlockWeeks(prev => ({ ...prev, transmutation: Number(e.target.value) }))}
                        className="h-8"
                      />
                      <span className="text-xs text-muted-foreground">minggu</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="real-weeks" className="text-xs">Realization Block</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary rounded"></div>
                      <Input
                        id="real-weeks"
                        type="number"
                        min="1"
                        max="6"
                        value={blockWeeks.realization}
                        onChange={(e) => setBlockWeeks(prev => ({ ...prev, realization: Number(e.target.value) }))}
                        className="h-8"
                      />
                      <span className="text-xs text-muted-foreground">minggu</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  1 siklus = {blockWeeks.accumulation + blockWeeks.transmutation + blockWeeks.realization} minggu
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {phases.length > 0 && (
          <>
            {/* Editable Percentages Card - Only show for traditional periodization */}
            {periodizationType === "traditional" && (
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
            )}

            <Card>
              <CardHeader>
                <CardTitle>
                  {periodizationType === "block" ? "Block Periodization Timeline" : "Gantt Chart Periodisasi"}
                </CardTitle>
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

            {/* Block Load Distribution Visualization */}
            {periodizationType === "block" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Distribusi Training Load per Blok</CardTitle>
                  <Button
                    variant={isEditingBlockParams ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isEditingBlockParams) {
                        setIsEditingBlockParams(false);
                        toast.success("Parameter blok berhasil diperbarui");
                      } else {
                        setIsEditingBlockParams(true);
                      }
                    }}
                  >
                    {isEditingBlockParams ? "Simpan" : <><Pencil className="w-4 h-4 mr-2" />Edit Parameter</>}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Block Characteristics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Accumulation Block */}
                      <Card className="bg-red-500/10 border-red-500/20">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <h4 className="font-semibold">Accumulation Block</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Volume</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.accumulation.volume}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      accumulation: { ...prev.accumulation, volume: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: `${blockParameters.accumulation.volume}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.accumulation.volume}%</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Intensity</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.accumulation.intensity}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      accumulation: { ...prev.accumulation, intensity: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${blockParameters.accumulation.intensity}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.accumulation.intensity}%</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Peaking</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.accumulation.peaking}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      accumulation: { ...prev.accumulation, peaking: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${blockParameters.accumulation.peaking}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.accumulation.peaking}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Fokus: Volume tinggi, membangun fondasi dan kapasitas kerja
                          </p>
                        </CardContent>
                      </Card>

                      {/* Transmutation Block */}
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <h4 className="font-semibold">Transmutation Block</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Volume</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.transmutation.volume}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      transmutation: { ...prev.transmutation, volume: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: `${blockParameters.transmutation.volume}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.transmutation.volume}%</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Intensity</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.transmutation.intensity}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      transmutation: { ...prev.transmutation, intensity: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${blockParameters.transmutation.intensity}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.transmutation.intensity}%</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Peaking</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.transmutation.peaking}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      transmutation: { ...prev.transmutation, peaking: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${blockParameters.transmutation.peaking}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.transmutation.peaking}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Fokus: Transformasi volume ke intensitas spesifik olahraga
                          </p>
                        </CardContent>
                      </Card>

                      {/* Realization Block */}
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-primary rounded"></div>
                            <h4 className="font-semibold">Realization Block</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Volume</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.realization.volume}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      realization: { ...prev.realization, volume: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500" style={{ width: `${blockParameters.realization.volume}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.realization.volume}%</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Intensity</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.realization.intensity}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      realization: { ...prev.realization, intensity: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${blockParameters.realization.intensity}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.realization.intensity}%</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Peaking</span>
                              {isEditingBlockParams ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={blockParameters.realization.peaking}
                                    onChange={(e) => setBlockParameters(prev => ({
                                      ...prev,
                                      realization: { ...prev.realization, peaking: Number(e.target.value) }
                                    }))}
                                    className="w-16 h-7 text-xs"
                                  />
                                  <span className="text-xs">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${blockParameters.realization.peaking}%` }}></div>
                                  </div>
                                  <span className="font-semibold">{blockParameters.realization.peaking}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Fokus: Performa puncak, tapering, dan kompetisi
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Comparative Bar Chart */}
                    <div className="mt-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            {
                              block: 'Accumulation',
                              Volume: blockParameters.accumulation.volume,
                              Intensity: blockParameters.accumulation.intensity,
                              Peaking: blockParameters.accumulation.peaking,
                            },
                            {
                              block: 'Transmutation',
                              Volume: blockParameters.transmutation.volume,
                              Intensity: blockParameters.transmutation.intensity,
                              Peaking: blockParameters.transmutation.peaking,
                            },
                            {
                              block: 'Realization',
                              Volume: blockParameters.realization.volume,
                              Intensity: blockParameters.realization.intensity,
                              Peaking: blockParameters.realization.peaking,
                            },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="block" 
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            label={{ value: 'Persentase (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="Volume" fill="#FFC107" />
                          <Bar dataKey="Intensity" fill="#F44336" />
                          <Bar dataKey="Peaking" fill="#06B6D4" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend and Explanation */}
                    <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                      <h5 className="font-semibold mb-2">Prinsip Block Periodization:</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• <span className="text-yellow-600 font-medium">Volume</span>: Total kuantitas latihan (repetisi, set, durasi)</li>
                        <li>• <span className="text-red-600 font-medium">Intensity</span>: Beban relatif terhadap maksimal (%1RM, kecepatan, RPE)</li>
                        <li>• <span className="text-primary font-medium">Peaking</span>: Tingkat kesiapan untuk performa kompetisi</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3">
                        Setiap blok memiliki fokus berbeda yang saling melengkapi untuk mencapai performa optimal pada waktu kompetisi.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                            // Block periodization patterns - use custom parameters
                            if (currentPhase.name.includes("Accumulation")) {
                              volume = blockParameters.accumulation.volume + (Math.random() * 10 - 5);
                              intensity = blockParameters.accumulation.intensity + (Math.random() * 10 - 5);
                              peaking = blockParameters.accumulation.peaking + (Math.random() * 10 - 5);
                            } else if (currentPhase.name.includes("Transmutation")) {
                              volume = blockParameters.transmutation.volume + (Math.random() * 10 - 5);
                              intensity = blockParameters.transmutation.intensity + (Math.random() * 10 - 5);
                              peaking = blockParameters.transmutation.peaking + (Math.random() * 10 - 5);
                            } else if (currentPhase.name.includes("Realization")) {
                              volume = blockParameters.realization.volume + (Math.random() * 10 - 5);
                              intensity = blockParameters.realization.intensity + (Math.random() * 10 - 5);
                              peaking = blockParameters.realization.peaking + (Math.random() * 10 - 5);
                            }
                            // Traditional periodization patterns
                            else if (currentPhase.name.includes("GPP")) {
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
