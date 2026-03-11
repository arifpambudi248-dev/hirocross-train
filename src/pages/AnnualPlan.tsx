import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { differenceInDays, addDays, format, parseISO, isWithinInterval, startOfWeek, eachWeekOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { Pencil, Save, FolderOpen, Plus, FileDown, Trash2, Trophy, Calendar } from "lucide-react";
import { exportAnnualPlanToPDF, type AnnualPlanExportData } from "@/lib/exportUtils";
import { PeriodizationCalendar } from "@/components/PeriodizationCalendar";
import { BiomotorActualsForm } from "@/components/BiomotorActualsForm";
import { BiomotorComparisonChartWrapper } from "@/components/BiomotorComparisonChartWrapper";
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

type Competition = {
  id?: string;
  competition_name: string;
  competition_date: string;
  priority: number;
  notes?: string;
};

type WeeklyData = {
  id?: string;
  week_number: number;
  week_start_date: string;
  planned_volume: number;
  planned_intensity: number;
  notes?: string;
};

type TrainingFocus = {
  id?: string;
  week_number: number;
  focus_type: string;
  intensity_level: number;
  label?: string;
  notes?: string;
};

type WeeklyTest = {
  id?: string;
  week_number: number;
  test_name: string;
  test_date?: string;
  notes?: string;
};

export default function AnnualPlan() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
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
  const [periodizationType, setPeriodizationType] = useState<"linear" | "block" | "undulating">("linear");
  const [blockWeeks, setBlockWeeks] = useState({ accumulation: 3, transmutation: 2, realization: 1 });
  const [isEditingBlockParams, setIsEditingBlockParams] = useState(false);
  const [blockParameters, setBlockParameters] = useState({
    accumulation: { volume: 85, intensity: 50, peaking: 40 },
    transmutation: { volume: 70, intensity: 75, peaking: 60 },
    realization: { volume: 40, intensity: 90, peaking: 95 },
  });
  const [undulatingParameters, setUndulatingParameters] = useState({
    light: { intensity: 60, volume: 70 },
    moderate: { intensity: 75, volume: 85 },
    heavy: { intensity: 90, volume: 100 },
    deload: { intensity: 50, volume: 50 },
    taper: { intensity: 40, volume: 40 },
  });
  
  // Multiple competitions state
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [showCompetitionDialog, setShowCompetitionDialog] = useState(false);
  const [newCompetition, setNewCompetition] = useState<Competition>({
    competition_name: "",
    competition_date: "",
    priority: 1,
    notes: "",
  });
  
  // Weekly volume/intensity editing
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [isEditingWeeklyData, setIsEditingWeeklyData] = useState(false);
  
  // Training focus state
  const [trainingFocus, setTrainingFocus] = useState<TrainingFocus[]>([]);
  
  // Weekly tests state
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>([]);
  
  // Meso configuration - array of weeks per meso (e.g., [4, 4, 3, 5] means meso 1 = 4w, meso 2 = 4w, etc.)
  const [mesoConfig, setMesoConfig] = useState<number[]>([4]);
  
  // Biomotor target configuration (base values at 100% volume)
  const [biomotorConfig, setBiomotorConfig] = useState({
    kekuatan: 10000, // kg or reps
    kecepatan: 800,  // meters
    daya_tahan: 20,  // km
    teknik: 500,     // reps
    taktik: 200,     // reps/sets
  });
  const [isEditingBiomotor, setIsEditingBiomotor] = useState(false);
  const [biomotorActualsKey, setBiomotorActualsKey] = useState(0); // For refreshing actuals
  
  // Biomotor focus data for multi-week labeling (e.g., AA, Hipertrofi)
  const [biomotorFocusData, setBiomotorFocusData] = useState<{
    [weekNumber: number]: {
      [biomotorKey: string]: string;
    };
  }>({});

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadSavedPlans();
    }
  }, [userId, selectedAthleteId]);

  useEffect(() => {
    if (currentPlanId) {
      loadCompetitions();
      loadWeeklyData();
      loadTrainingFocus();
      loadWeeklyTests();
    }
  }, [currentPlanId]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      const userIsCoach = roleData?.role === 'coach';
      setIsCoach(userIsCoach);

      if (userIsCoach) {
        const { data: assignments } = await supabase
          .from("coach_athletes")
          .select("athlete_id")
          .eq("coach_id", user.id)
          .eq("status", "accepted");
        
        if (assignments && assignments.length > 0) {
          const athleteIds = assignments.map(a => a.athlete_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, athlete_name")
            .in("id", athleteIds)
            .order("athlete_name");
          
          if (profilesData) {
            setAthletes(profilesData);
            if (profilesData.length > 0) {
              setSelectedAthleteId(profilesData[0].id);
            }
          }
        } else {
          setAthletes([]);
          toast.info("Belum ada atlet yang di-assign. Silakan tambahkan di halaman Kelola Atlet.");
        }
      } else {
        setSelectedAthleteId(user.id);
      }
    }
  };

  const loadSavedPlans = async () => {
    if (!userId) return;
    
    let query = supabase.from("annual_plans").select("*");
    
    if (isCoach) {
      query = query.eq("user_id", userId);
      if (selectedAthleteId) {
        query = query.eq("athlete_id", selectedAthleteId);
      }
    } else {
      query = query.eq("athlete_id", userId);
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat rencana tersimpan: " + error.message);
    } else {
      setSavedPlans(data || []);
    }
  };

  const loadCompetitions = async () => {
    if (!currentPlanId) return;
    
    const { data, error } = await supabase
      .from("plan_competitions")
      .select("*")
      .eq("plan_id", currentPlanId)
      .order("competition_date", { ascending: true });

    if (!error && data) {
      setCompetitions(data.map(c => ({
        id: c.id,
        competition_name: c.competition_name,
        competition_date: c.competition_date,
        priority: c.priority,
        notes: c.notes,
      })));
    }
  };

  const loadWeeklyData = async () => {
    if (!currentPlanId) return;
    
    const { data, error } = await supabase
      .from("weekly_plan_data")
      .select("*")
      .eq("plan_id", currentPlanId)
      .order("week_number", { ascending: true });

    if (!error && data) {
      setWeeklyData(data.map(w => ({
        id: w.id,
        week_number: w.week_number,
        week_start_date: w.week_start_date,
        planned_volume: w.planned_volume,
        planned_intensity: w.planned_intensity,
        notes: w.notes,
      })));
    }
  };

  const loadTrainingFocus = async () => {
    if (!currentPlanId) return;
    
    const { data, error } = await supabase
      .from("weekly_training_focus")
      .select("*")
      .eq("plan_id", currentPlanId)
      .order("week_number", { ascending: true });

    if (!error && data) {
      setTrainingFocus(data.map(f => ({
        id: f.id,
        week_number: f.week_number,
        focus_type: f.focus_type,
        intensity_level: f.intensity_level,
        label: f.label,
        notes: f.notes,
      })));
    }
  };

  const loadWeeklyTests = async () => {
    if (!currentPlanId) return;
    
    const { data, error } = await supabase
      .from("weekly_tests")
      .select("*")
      .eq("plan_id", currentPlanId)
      .order("week_number", { ascending: true });

    if (!error && data) {
      setWeeklyTests(data.map(t => ({
        id: t.id,
        week_number: t.week_number,
        test_name: t.test_name,
        test_date: t.test_date,
        notes: t.notes,
      })));
    }
  };

  const handleTrainingFocusChange = async (weekNumber: number, focusType: string, intensityLevel: number, label?: string) => {
    if (!currentPlanId) {
      toast.error("Simpan rencana terlebih dahulu");
      return;
    }

    const existing = trainingFocus.find(f => f.week_number === weekNumber && f.focus_type === focusType);

    if (existing) {
      const { error } = await supabase
        .from("weekly_training_focus")
        .update({ intensity_level: intensityLevel, label: label || null })
        .eq("id", existing.id);

      if (error) {
        toast.error("Gagal update fokus: " + error.message);
        return;
      }

      setTrainingFocus(prev => prev.map(f => 
        f.id === existing.id ? { ...f, intensity_level: intensityLevel, label } : f
      ));
    } else {
      const { data, error } = await supabase
        .from("weekly_training_focus")
        .insert({
          plan_id: currentPlanId,
          week_number: weekNumber,
          focus_type: focusType,
          intensity_level: intensityLevel,
          label: label || null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Gagal menambah fokus: " + error.message);
        return;
      }

      setTrainingFocus(prev => [...prev, {
        id: data.id,
        week_number: weekNumber,
        focus_type: focusType,
        intensity_level: intensityLevel,
        label,
      }]);
    }
  };

  const handleBulkTrainingFocusChange = async (weekNumbers: number[], focusType: string, label: string) => {
    if (!currentPlanId) {
      toast.error("Simpan rencana terlebih dahulu");
      return;
    }

    for (const weekNumber of weekNumbers) {
      const existing = trainingFocus.find(f => f.week_number === weekNumber && f.focus_type === focusType);

      if (existing) {
        await supabase
          .from("weekly_training_focus")
          .update({ intensity_level: 1, label })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("weekly_training_focus")
          .insert({
            plan_id: currentPlanId,
            week_number: weekNumber,
            focus_type: focusType,
            intensity_level: 1,
            label,
          });
      }
    }

    await loadTrainingFocus();
    toast.success(`Fokus latihan berhasil diset untuk ${weekNumbers.length} minggu`);
  };

  const handleTrainingFocusRemove = async (weekNumber: number, focusType: string) => {
    const existing = trainingFocus.find(f => f.week_number === weekNumber && f.focus_type === focusType);
    if (!existing?.id) return;

    const { error } = await supabase
      .from("weekly_training_focus")
      .delete()
      .eq("id", existing.id);

    if (error) {
      toast.error("Gagal menghapus fokus: " + error.message);
      return;
    }

    setTrainingFocus(prev => prev.filter(f => f.id !== existing.id));
  };

  // Handle biomotor focus change (multi-week labeling like AA, Hipertrofi)
  const handleBiomotorFocusChange = (weekNumbers: number[], biomotorKey: string, label: string) => {
    setBiomotorFocusData(prev => {
      const newData = { ...prev };
      weekNumbers.forEach(weekNumber => {
        if (!newData[weekNumber]) {
          newData[weekNumber] = {};
        }
        newData[weekNumber][biomotorKey] = label;
      });
      return newData;
    });
    toast.success(`${biomotorKey.toUpperCase()} label "${label}" diset untuk ${weekNumbers.length} minggu`);
  };

  const handleBiomotorFocusRemove = (weekNumber: number, biomotorKey: string) => {
    setBiomotorFocusData(prev => {
      const newData = { ...prev };
      if (newData[weekNumber]) {
        delete newData[weekNumber][biomotorKey];
        if (Object.keys(newData[weekNumber]).length === 0) {
          delete newData[weekNumber];
        }
      }
      return newData;
    });
  };

  const handleTestAdd = async (weekNumber: number, testName: string) => {
    if (!currentPlanId) {
      toast.error("Simpan rencana terlebih dahulu");
      return;
    }

    const { data, error } = await supabase
      .from("weekly_tests")
      .insert({
        plan_id: currentPlanId,
        week_number: weekNumber,
        test_name: testName,
      })
      .select()
      .single();

    if (error) {
      toast.error("Gagal menambah tes: " + error.message);
      return;
    }

    setWeeklyTests(prev => [...prev, {
      id: data.id,
      week_number: weekNumber,
      test_name: testName,
    }]);
    toast.success("Tes berhasil ditambahkan");
  };

  const handleTestRemove = async (weekNumber: number, testId: string) => {
    const { error } = await supabase
      .from("weekly_tests")
      .delete()
      .eq("id", testId);

    if (error) {
      toast.error("Gagal menghapus tes: " + error.message);
      return;
    }

    setWeeklyTests(prev => prev.filter(t => t.id !== testId));
    toast.success("Tes berhasil dihapus");
  };

  const handleCompetitionAddFromCalendar = async (weekNumber: number, competitionName: string, date: string) => {
    if (!currentPlanId) {
      toast.error("Simpan rencana terlebih dahulu");
      return;
    }

    const { data, error } = await supabase
      .from("plan_competitions")
      .insert({
        plan_id: currentPlanId,
        competition_name: competitionName,
        competition_date: date,
        priority: 2,
      })
      .select()
      .single();

    if (error) {
      toast.error("Gagal menambah kompetisi: " + error.message);
      return;
    }

    setCompetitions(prev => [...prev, {
      id: data.id,
      competition_name: competitionName,
      competition_date: date,
      priority: 2,
    }].sort((a, b) => new Date(a.competition_date).getTime() - new Date(b.competition_date).getTime()));
    
    toast.success("Kompetisi berhasil ditambahkan");
  };

  const addCompetition = async () => {
    if (!currentPlanId || !newCompetition.competition_name || !newCompetition.competition_date) {
      toast.error("Harap lengkapi nama dan tanggal kompetisi");
      return;
    }

    const { data, error } = await supabase
      .from("plan_competitions")
      .insert([{
        plan_id: currentPlanId,
        competition_name: newCompetition.competition_name,
        competition_date: newCompetition.competition_date,
        priority: newCompetition.priority,
        notes: newCompetition.notes,
      }])
      .select()
      .single();

    if (error) {
      toast.error("Gagal menambahkan kompetisi: " + error.message);
    } else {
      setCompetitions(prev => [...prev, {
        id: data.id,
        competition_name: data.competition_name,
        competition_date: data.competition_date,
        priority: data.priority,
        notes: data.notes,
      }].sort((a, b) => new Date(a.competition_date).getTime() - new Date(b.competition_date).getTime()));
      
      setNewCompetition({ competition_name: "", competition_date: "", priority: 1, notes: "" });
      setShowCompetitionDialog(false);
      toast.success("Kompetisi berhasil ditambahkan");
    }
  };

  const deleteCompetition = async (id: string) => {
    const { error } = await supabase
      .from("plan_competitions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Gagal menghapus kompetisi: " + error.message);
    } else {
      setCompetitions(prev => prev.filter(c => c.id !== id));
      toast.success("Kompetisi berhasil dihapus");
    }
  };

  // Generate weekly data based on plan dates
  // Volume: 60% → 100% (at end of GPP/start SPP) → 50% (at competition)
  // Intensity: 40% → 100% (at competition)
  const generatedWeeklyData = useMemo(() => {
    if (!startDate || !competitionDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(competitionDate);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    const totalWeeks = weeks.length;
    
    // Calculate phase boundaries based on percentages
    const gppEndWeek = Math.floor(totalWeeks * (editablePercentages.gpp / 100));
    const sppEndWeek = gppEndWeek + Math.floor(totalWeeks * (editablePercentages.spp / 100));
    
    return weeks.map((weekStart, index) => {
      const existing = weeklyData.find(w => w.week_number === index + 1);
      
      // Calculate default values based on periodization phase
      let defaultVolume = 70;
      let defaultIntensity = 50;
      const weekNumber = index + 1;
      
      if (periodizationType === "linear") {
        // NEW LOGIC: Volume and Intensity based on user request
        // Volume: 60% start → 100% at GPP/SPP transition → 50% at competition
        // Intensity: 40% start → 100% at competition
        
        if (weekNumber <= gppEndWeek) {
          // GPP Phase: Volume increases from 60% to 100%
          const gppProgress = weekNumber / gppEndWeek;
          defaultVolume = Math.round(60 + (gppProgress * 40)); // 60 → 100
          defaultIntensity = Math.round(40 + (gppProgress * 20)); // 40 → 60
        } else if (weekNumber <= sppEndWeek) {
          // SPP Phase: Volume starts at 100% then gradually decreases
          const sppWeeks = sppEndWeek - gppEndWeek;
          const sppProgress = (weekNumber - gppEndWeek) / sppWeeks;
          defaultVolume = Math.round(100 - (sppProgress * 20)); // 100 → 80
          defaultIntensity = Math.round(60 + (sppProgress * 20)); // 60 → 80
        } else {
          // Pre-comp and Competition: Volume continues to decrease, Intensity increases to 100%
          const remainingWeeks = totalWeeks - sppEndWeek;
          const finalProgress = (weekNumber - sppEndWeek) / remainingWeeks;
          defaultVolume = Math.round(80 - (finalProgress * 30)); // 80 → 50
          defaultIntensity = Math.round(80 + (finalProgress * 20)); // 80 → 100
        }
      } else if (periodizationType === "block") {
        const cycleLength = blockWeeks.accumulation + blockWeeks.transmutation + blockWeeks.realization;
        const posInCycle = index % cycleLength;
        if (posInCycle < blockWeeks.accumulation) {
          defaultVolume = blockParameters.accumulation.volume;
          defaultIntensity = blockParameters.accumulation.intensity;
        } else if (posInCycle < blockWeeks.accumulation + blockWeeks.transmutation) {
          defaultVolume = blockParameters.transmutation.volume;
          defaultIntensity = blockParameters.transmutation.intensity;
        } else {
          defaultVolume = blockParameters.realization.volume;
          defaultIntensity = blockParameters.realization.intensity;
        }
      } else if (periodizationType === "undulating") {
        const pattern = ["light", "moderate", "heavy", "deload"] as const;
        const patternIndex = index % 4;
        const weekType = pattern[patternIndex];
        defaultVolume = undulatingParameters[weekType].volume;
        defaultIntensity = undulatingParameters[weekType].intensity;
      }
      
      return {
        week_number: index + 1,
        week_start_date: format(weekStart, "yyyy-MM-dd"),
        planned_volume: existing?.planned_volume ?? defaultVolume,
        planned_intensity: existing?.planned_intensity ?? defaultIntensity,
        notes: existing?.notes || "",
        id: existing?.id,
      };
    });
  }, [startDate, competitionDate, weeklyData, periodizationType, blockWeeks, blockParameters, undulatingParameters, editablePercentages]);

  const handleWeeklyDataChange = (weekNumber: number, field: 'planned_volume' | 'planned_intensity', value: number) => {
    const updatedData = [...generatedWeeklyData];
    const weekIndex = updatedData.findIndex(w => w.week_number === weekNumber);
    if (weekIndex >= 0) {
      updatedData[weekIndex] = { ...updatedData[weekIndex], [field]: value };
      // Store in local state for immediate UI feedback
      setWeeklyData(prev => {
        const existing = prev.findIndex(w => w.week_number === weekNumber);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], [field]: value };
          return updated;
        } else {
          return [...prev, { 
            week_number: weekNumber, 
            week_start_date: updatedData[weekIndex].week_start_date,
            planned_volume: field === 'planned_volume' ? value : updatedData[weekIndex].planned_volume,
            planned_intensity: field === 'planned_intensity' ? value : updatedData[weekIndex].planned_intensity,
          }];
        }
      });
    }
  };

  const saveWeeklyData = async () => {
    if (!currentPlanId) {
      toast.error("Simpan rencana terlebih dahulu");
      return;
    }

    try {
      // Upsert all weekly data
      for (const week of generatedWeeklyData) {
        if (week.id) {
          await supabase
            .from("weekly_plan_data")
            .update({
              planned_volume: week.planned_volume,
              planned_intensity: week.planned_intensity,
            })
            .eq("id", week.id);
        } else {
          await supabase
            .from("weekly_plan_data")
            .insert({
              plan_id: currentPlanId,
              week_number: week.week_number,
              week_start_date: week.week_start_date,
              planned_volume: week.planned_volume,
              planned_intensity: week.planned_intensity,
            });
        }
      }
      
      setIsEditingWeeklyData(false);
      await loadWeeklyData();
      toast.success("Data mingguan berhasil disimpan");
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const savePlan = async () => {
    if (!userId || !planName || !startDate || !competitionDate) {
      toast.error("Harap lengkapi semua field");
      return;
    }

    if (!selectedAthleteId) {
      toast.error("Pilih atlet terlebih dahulu");
      return;
    }

    const planData = {
      user_id: userId,
      athlete_id: selectedAthleteId,
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
      const { data, error } = await supabase
        .from("annual_plans")
        .insert([planData])
        .select()
        .single();

      if (error) {
        toast.error("Gagal simpan: " + error.message);
      } else {
        setCurrentPlanId(data.id);
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
      setSelectedAthleteId(selectedPlan.athlete_id);
      setShowLoadDialog(false);
      
      generatePlanWithData(
        selectedPlan.start_date,
        selectedPlan.competition_date,
        selectedPlan.percentages,
        selectedPlan.athlete_id
      );
    }
  };

  const createNewPlan = () => {
    setCurrentPlanId(null);
    setPlanName("");
    setStartDate("");
    setCompetitionDate("");
    setPhases([]);
    setCompetitions([]);
    setWeeklyData([]);
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
    
    const blockCycleDays = (blockWeeks.accumulation + blockWeeks.transmutation + blockWeeks.realization) * 7;
    const numCompleteCycles = Math.floor(totalDays / blockCycleDays);
    
    if (numCompleteCycles < 1) {
      toast.error(`Durasi minimal ${blockCycleDays} hari untuk block periodization`);
      return;
    }

    const newPhases: Phase[] = [];
    let currentDate = start;
    let blockNumber = 1;

    for (let cycle = 0; cycle < numCompleteCycles; cycle++) {
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

  const generatePlanWithData = (
    planStartDate: string,
    planCompetitionDate: string,
    percentages: EditablePercentages,
    athleteId: string
  ) => {
    if (!planStartDate || !planCompetitionDate) {
      toast.error("Harap isi tanggal mulai dan tanggal pertandingan");
      return;
    }

    const start = new Date(planStartDate);
    const competition = new Date(planCompetitionDate);

    if (start >= competition) {
      toast.error("Tanggal pertandingan harus setelah tanggal mulai latihan");
      return;
    }

    const totalDays = differenceInDays(competition, start);

    if (totalDays < 14) {
      toast.error("Durasi perencanaan minimal 14 hari");
      return;
    }

    const gppDays = Math.round(totalDays * (percentages.gpp / 100));
    const sppDays = Math.round(totalDays * (percentages.spp / 100));
    const preDays = Math.round(totalDays * (percentages.pre / 100));
    const compDays = totalDays - gppDays - sppDays - preDays;

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
        percentage: percentages.gpp,
      },
      {
        name: "Persiapan Khusus (SPP)",
        color: "bg-chart-2",
        startDate: format(sppStart, "yyyy-MM-dd"),
        endDate: format(sppEnd, "yyyy-MM-dd"),
        durationDays: sppDays,
        percentage: percentages.spp,
      },
      {
        name: "Pra Kompetisi",
        color: "bg-chart-3",
        startDate: format(preStart, "yyyy-MM-dd"),
        endDate: format(preEnd, "yyyy-MM-dd"),
        durationDays: preDays,
        percentage: percentages.pre,
      },
      {
        name: "Kompetisi",
        color: "bg-chart-4",
        startDate: format(compStart, "yyyy-MM-dd"),
        endDate: format(compEnd, "yyyy-MM-dd"),
        durationDays: compDays,
        percentage: percentages.comp,
      },
    ];

    setPhases(newPhases);
    toast.success("Annual plan berhasil dimuat");
    fetchTrainingSessionsWithId(format(start, "yyyy-MM-dd"), format(competition, "yyyy-MM-dd"), athleteId);
  };

  const fetchTrainingSessionsWithId = async (start: string, end: string, athleteId: string) => {
    if (!athleteId) return;
    
    try {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", athleteId)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      if (error) throw error;
      setTrainingSessions(data || []);
    } catch (error) {
      console.error("Error fetching training sessions:", error);
    }
  };

  const generateUndulatingPeriodization = () => {
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

    if (totalWeeks < 4) {
      toast.error("Durasi minimal 4 minggu untuk undulating periodization");
      return;
    }

    const newPhases: Phase[] = [];
    let currentDate = start;

    const undulatingPattern = [
      { name: "Light Week", color: "bg-green-500", intensity: undulatingParameters.light.intensity, volume: undulatingParameters.light.volume },
      { name: "Moderate Week", color: "bg-yellow-500", intensity: undulatingParameters.moderate.intensity, volume: undulatingParameters.moderate.volume },
      { name: "Heavy Week", color: "bg-red-500", intensity: undulatingParameters.heavy.intensity, volume: undulatingParameters.heavy.volume },
      { name: "Deload Week", color: "bg-blue-500", intensity: undulatingParameters.deload.intensity, volume: undulatingParameters.deload.volume },
    ];

    let weekNumber = 1;
    
    while (differenceInDays(competition, currentDate) >= 7) {
      const patternIndex = (weekNumber - 1) % 4;
      const pattern = undulatingPattern[patternIndex];
      const weekEnd = addDays(currentDate, 6);
      
      const weeksToGo = Math.floor(differenceInDays(competition, currentDate) / 7);
      let weekName = `Week ${weekNumber} - ${pattern.name}`;
      let weekColor = pattern.color;
      
      if (weeksToGo <= 2) {
        weekName = `Week ${weekNumber} - Taper`;
        weekColor = "bg-primary";
      } else if (weeksToGo === 3) {
        weekName = `Week ${weekNumber} - Pre-Competition`;
        weekColor = "bg-chart-3";
      }

      newPhases.push({
        name: weekName,
        color: weekColor,
        startDate: format(currentDate, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
        durationDays: 7,
        percentage: (7 / totalDays) * 100,
      });

      currentDate = addDays(weekEnd, 1);
      weekNumber++;
    }

    const remainingDays = differenceInDays(competition, currentDate) + 1;
    if (remainingDays > 0) {
      newPhases.push({
        name: `Week ${weekNumber} - Competition Week`,
        color: "bg-chart-4",
        startDate: format(currentDate, "yyyy-MM-dd"),
        endDate: format(competition, "yyyy-MM-dd"),
        durationDays: remainingDays,
        percentage: (remainingDays / totalDays) * 100,
      });
    }

    setPhases(newPhases);
    toast.success("Undulating periodization berhasil dibuat");
    fetchTrainingSessions(format(start, "yyyy-MM-dd"), format(competition, "yyyy-MM-dd"));
  };

  const generatePlan = () => {
    if (periodizationType === "block") {
      generateBlockPeriodization();
      return;
    }
    
    if (periodizationType === "undulating") {
      generateUndulatingPeriodization();
      return;
    }

    // Linear periodization (was traditional)

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

    const gppDays = Math.round(totalDays * (editablePercentages.gpp / 100));
    const sppDays = Math.round(totalDays * (editablePercentages.spp / 100));
    const preDays = Math.round(totalDays * (editablePercentages.pre / 100));
    const compDays = totalDays - gppDays - sppDays - preDays;

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
    if (!selectedAthleteId) return;
    
    try {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", selectedAthleteId)
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

      const actualLoad = trainingSessions
        .filter((session) => {
          const sessionDate = parseISO(session.date);
          return isWithinInterval(sessionDate, { start: phaseStart, end: phaseEnd });
        })
        .reduce((sum, session) => sum + (session.load_final || 0), 0);

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
            if (ratio < 0.8) {
              plannedLoadPerDay = plannedLoadPerDay * 0.9;
            } else if (ratio > 1.2) {
              plannedLoadPerDay = plannedLoadPerDay * 1.1;
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
    <div className="min-h-screen bg-background flex">
      <SidebarNavigation />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile + compact header */}
        <div className="lg:hidden">
          <Navigation />
        </div>
        <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Hirocross Logo" className="h-8 w-auto" />
            <h1 className="text-lg font-bold text-primary">HIRO CROSS</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium">{isCoach ? "Admin" : ""}</span>
            <Button variant="destructive" size="sm" onClick={async () => { await supabase.auth.signOut(); }}>
              LOGOUT
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto px-4 lg:px-6 py-4 lg:py-6 space-y-6 pb-bottom-nav lg:pb-6">
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
                          {isCoach ? "Belum ada rencana tersimpan" : "Pelatih belum membuat rencana untuk Anda"}
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                {phases.length > 0 && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const athleteNameData = athletes.find(a => a.id === selectedAthleteId)?.athlete_name || 'Atlet';
                      const exportData: AnnualPlanExportData = {
                        athleteName: athleteNameData,
                        planName: planName || 'Annual Plan',
                        startDate,
                        competitionDate,
                        periodizationType: periodizationType === 'linear' ? 'Linear' : periodizationType === 'block' ? 'Block Periodization' : 'Undulating',
                        phases: phases.map(p => ({
                          name: p.name,
                          startDate: p.startDate,
                          endDate: p.endDate,
                          durationDays: p.durationDays,
                          percentage: p.percentage,
                          plannedLoad: editableLoads[p.name],
                          actualLoad: phasesWithLoad.find(pw => pw.name === p.name)?.actualLoad,
                        })),
                        weeklyData: generatedWeeklyData.map(w => ({
                          week_number: w.week_number,
                          week_start_date: w.week_start_date,
                          planned_volume: w.planned_volume,
                          planned_intensity: w.planned_intensity,
                        })),
                        biomotorConfig,
                        trainingFocus: trainingFocus.map(tf => ({
                          week_number: tf.week_number,
                          focus_type: tf.focus_type,
                          label: tf.label,
                        })),
                        weeklyTests: weeklyTests.map(wt => ({
                          week_number: wt.week_number,
                          test_name: wt.test_name,
                        })),
                        competitions: competitions.map(c => ({
                          competition_name: c.competition_name,
                          competition_date: c.competition_date,
                        })),
                      };
                      exportAnnualPlanToPDF(exportData);
                      toast.success('PDF berhasil diekspor');
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                    Ekspor PDF
                  </Button>
                )}
                {isCoach && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Athlete selector for coaches */}
            {isCoach && athletes.length > 0 && (
              <div className="space-y-2 pb-4 border-b">
                <Label htmlFor="athleteSelect">Pilih Atlet</Label>
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

            {/* Info message for athletes */}
            {!isCoach && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Catatan:</strong> Annual plan dibuat oleh pelatih Anda. Anda dapat melihat dan mengikuti plan yang telah dibuat.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodType">Tipe Periodisasi</Label>
                <Select 
                  value={periodizationType} 
                  onValueChange={(val: "linear" | "block" | "undulating") => setPeriodizationType(val)}
                  disabled={!isCoach}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="block">Block Periodization</SelectItem>
                    <SelectItem value="undulating">Undulating</SelectItem>
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
                  disabled={!isCoach}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitionDate">Tanggal Kompetisi Utama</Label>
                <Input
                  id="competitionDate"
                  type="date"
                  value={competitionDate}
                  onChange={(e) => setCompetitionDate(e.target.value)}
                  disabled={!isCoach}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="autoAdjust">Auto-Adjust Load</Label>
                <div className="flex items-center h-10 space-x-2">
                  <Switch
                    id="autoAdjust"
                    checked={autoAdjust}
                    onCheckedChange={setAutoAdjust}
                    disabled={!isCoach}
                  />
                  <span className="text-sm text-muted-foreground">
                    Otomatis sesuaikan
                  </span>
                </div>
              </div>
              {isCoach && (
                <div className="flex items-end">
                  <Button onClick={generatePlan} className="w-full">
                    Generate Plan
                  </Button>
                </div>
              )}
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
                        disabled={!isCoach}
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
                        disabled={!isCoach}
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
                        disabled={!isCoach}
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

        {/* Multiple Competitions Card */}
        {currentPlanId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Daftar Kompetisi
              </CardTitle>
              {isCoach && (
                <Dialog open={showCompetitionDialog} onOpenChange={setShowCompetitionDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Tambah Kompetisi
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Kompetisi</DialogTitle>
                      <DialogDescription>
                        Tambahkan kompetisi lain dalam periode ini
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nama Kompetisi</Label>
                        <Input
                          value={newCompetition.competition_name}
                          onChange={(e) => setNewCompetition(prev => ({ ...prev, competition_name: e.target.value }))}
                          placeholder="Contoh: Kejuaraan Nasional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tanggal Kompetisi</Label>
                        <Input
                          type="date"
                          value={newCompetition.competition_date}
                          onChange={(e) => setNewCompetition(prev => ({ ...prev, competition_date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prioritas</Label>
                        <Select 
                          value={String(newCompetition.priority)} 
                          onValueChange={(val) => setNewCompetition(prev => ({ ...prev, priority: Number(val) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Utama (A)</SelectItem>
                            <SelectItem value="2">Sekunder (B)</SelectItem>
                            <SelectItem value="3">Tersier (C)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Catatan (opsional)</Label>
                        <Input
                          value={newCompetition.notes || ""}
                          onChange={(e) => setNewCompetition(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Catatan tambahan..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCompetitionDialog(false)}>
                        Batal
                      </Button>
                      <Button onClick={addCompetition}>Tambah</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {competitions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada kompetisi tambahan. Kompetisi utama: {formatDate(competitionDate)}
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Main competition */}
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Kompetisi Utama</p>
                        <p className="text-sm text-muted-foreground">{formatDate(competitionDate)}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">Utama</span>
                  </div>
                  
                  {/* Additional competitions */}
                  {competitions.map((comp) => (
                    <div key={comp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{comp.competition_name}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(comp.competition_date)}</p>
                          {comp.notes && <p className="text-xs text-muted-foreground">{comp.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          comp.priority === 1 ? 'bg-primary text-primary-foreground' :
                          comp.priority === 2 ? 'bg-secondary text-secondary-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {comp.priority === 1 ? 'A' : comp.priority === 2 ? 'B' : 'C'}
                        </span>
                        {isCoach && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => comp.id && deleteCompetition(comp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Biomotor Configuration Card */}
        {phases.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Konfigurasi Target Biomotor</CardTitle>
              {isCoach && (
                <Button
                  variant={isEditingBiomotor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditingBiomotor(!isEditingBiomotor)}
                >
                  {isEditingBiomotor ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Selesai
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Base Values
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Base values adalah nilai target pada 100% volume. Target per minggu dihitung: (volume% × base value)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bio-kekuatan" className="text-xs font-medium flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    Kekuatan
                  </Label>
                  <Input
                    id="bio-kekuatan"
                    type="number"
                    min="0"
                    value={biomotorConfig.kekuatan}
                    onChange={(e) => setBiomotorConfig(prev => ({ ...prev, kekuatan: Number(e.target.value) }))}
                    disabled={!isEditingBiomotor}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">kg/reps</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio-kecepatan" className="text-xs font-medium flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    Kecepatan
                  </Label>
                  <Input
                    id="bio-kecepatan"
                    type="number"
                    min="0"
                    value={biomotorConfig.kecepatan}
                    onChange={(e) => setBiomotorConfig(prev => ({ ...prev, kecepatan: Number(e.target.value) }))}
                    disabled={!isEditingBiomotor}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">meter</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio-dayatahan" className="text-xs font-medium flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    Daya Tahan
                  </Label>
                  <Input
                    id="bio-dayatahan"
                    type="number"
                    min="0"
                    value={biomotorConfig.daya_tahan}
                    onChange={(e) => setBiomotorConfig(prev => ({ ...prev, daya_tahan: Number(e.target.value) }))}
                    disabled={!isEditingBiomotor}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">km</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio-teknik" className="text-xs font-medium flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    Teknik
                  </Label>
                  <Input
                    id="bio-teknik"
                    type="number"
                    min="0"
                    value={biomotorConfig.teknik}
                    onChange={(e) => setBiomotorConfig(prev => ({ ...prev, teknik: Number(e.target.value) }))}
                    disabled={!isEditingBiomotor}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">reps</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio-taktik" className="text-xs font-medium flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    Taktik
                  </Label>
                  <Input
                    id="bio-taktik"
                    type="number"
                    min="0"
                    value={biomotorConfig.taktik}
                    onChange={(e) => setBiomotorConfig(prev => ({ ...prev, taktik: Number(e.target.value) }))}
                    disabled={!isEditingBiomotor}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">reps/sets</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Periodization Calendar */}
        {phases.length > 0 && generatedWeeklyData.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kalender Periodisasi</CardTitle>
              {isCoach && currentPlanId && (
                <Button
                  variant={isEditingWeeklyData ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isEditingWeeklyData) {
                      saveWeeklyData();
                    } else {
                      setIsEditingWeeklyData(true);
                    }
                  }}
                >
                  {isEditingWeeklyData ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <PeriodizationCalendar
                startDate={startDate}
                competitionDate={competitionDate}
                phases={phases}
                competitions={competitions}
                weeklyData={generatedWeeklyData}
                trainingFocus={trainingFocus}
                weeklyTests={weeklyTests}
                periodizationType={periodizationType}
                biomotorConfig={biomotorConfig}
                biomotorFocusData={biomotorFocusData}
                onWeeklyDataChange={handleWeeklyDataChange}
                onTrainingFocusChange={handleTrainingFocusChange}
                onTrainingFocusRemove={handleTrainingFocusRemove}
                onBulkTrainingFocusChange={handleBulkTrainingFocusChange}
                onBiomotorFocusChange={handleBiomotorFocusChange}
                onBiomotorFocusRemove={handleBiomotorFocusRemove}
                onTestAdd={handleTestAdd}
                onTestRemove={handleTestRemove}
                onCompetitionAdd={handleCompetitionAddFromCalendar}
                onMesoConfigChange={setMesoConfig}
                mesoConfig={mesoConfig}
                isEditing={isEditingWeeklyData}
                isEditingVolumeIntensity={isEditingWeeklyData}
                isCoach={isCoach}
              />

              {/* Editable Table - below calendar */}
              {isEditingWeeklyData && (
                <div className="border rounded-lg overflow-hidden mt-6">
                  <h4 className="text-sm font-medium p-3 bg-muted">Edit Volume & Intensitas</h4>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">Minggu</th>
                          <th className="text-left p-2 font-medium">Tanggal</th>
                          <th className="text-center p-2 font-medium">Volume (%)</th>
                          <th className="text-center p-2 font-medium">Intensitas (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedWeeklyData.map((week) => (
                          <tr key={week.week_number} className="border-t">
                            <td className="p-2 font-medium">M{week.week_number}</td>
                            <td className="p-2 text-muted-foreground">
                              {format(new Date(week.week_start_date), "d MMM", { locale: localeId })}
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={week.planned_volume}
                                onChange={(e) => handleWeeklyDataChange(week.week_number, 'planned_volume', Number(e.target.value))}
                                className="h-8 w-20 text-center mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={week.planned_intensity}
                                onChange={(e) => handleWeeklyDataChange(week.week_number, 'planned_intensity', Number(e.target.value))}
                                className="h-8 w-20 text-center mx-auto"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Biomotor Tracking Section */}
        {currentPlanId && generatedWeeklyData.length > 0 && (
          <>
            {/* Planned biomotor data computed from weekly volume */}
            {(() => {
              const plannedBiomotorData = generatedWeeklyData.map(week => ({
                week_number: week.week_number,
                kekuatan: Math.round((week.planned_volume / 100) * biomotorConfig.kekuatan),
                kecepatan: Math.round((week.planned_volume / 100) * biomotorConfig.kecepatan),
                daya_tahan: Math.round((week.planned_volume / 100) * biomotorConfig.daya_tahan),
                teknik: Math.round((week.planned_volume / 100) * biomotorConfig.teknik),
                taktik: Math.round((week.planned_volume / 100) * biomotorConfig.taktik),
              }));

              return (
                <div className="space-y-4">
                  <BiomotorActualsForm
                    key={biomotorActualsKey}
                    planId={currentPlanId}
                    totalWeeks={generatedWeeklyData.length}
                    plannedData={plannedBiomotorData}
                    isCoach={isCoach}
                    onDataChange={() => setBiomotorActualsKey(prev => prev + 1)}
                  />
                  
                  <BiomotorComparisonChartWrapper
                    planId={currentPlanId}
                    plannedData={plannedBiomotorData}
                    refreshKey={biomotorActualsKey}
                  />
                </div>
              );
            })()}
          </>
        )}

        {phases.length > 0 && (
          <>
            {/* Editable Percentages Card - Only show for traditional periodization */}
            {periodizationType === "linear" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Konfigurasi Persentase Fase</CardTitle>
                {isCoach && (
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
                )}
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
                    {/* Competition markers on timeline */}
                    {competitions.map((comp, idx) => {
                      const totalDays = differenceInDays(new Date(competitionDate), new Date(startDate));
                      const compDays = differenceInDays(new Date(comp.competition_date), new Date(startDate));
                      const position = (compDays / totalDays) * 100;
                      return (
                        <div
                          key={idx}
                          className="absolute top-0 w-0.5 h-4 bg-foreground"
                          style={{ left: `${position}%` }}
                          title={comp.competition_name}
                        >
                          <Trophy className="absolute -top-5 -left-2 h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
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
                                  {phase.durationDays}d ({phase.percentage.toFixed(1)}%)
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Perbandingan Planned vs Actual Load</CardTitle>
                <div className="flex items-center gap-4">
                  {isCoach && (
                    <Button
                      variant={isEditingLoads ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (isEditingLoads) {
                          handleSaveLoads();
                        } else {
                          setIsEditingLoads(true);
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
                  )}
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
                        <div
                          className="absolute h-full bg-muted-foreground/30 rounded-lg"
                          style={{
                            width: "100%",
                          }}
                        />
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

        {phases.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Masukkan tanggal mulai latihan dan tanggal pertandingan, lalu klik "Generate Plan" untuk membuat annual plan periodization
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}
