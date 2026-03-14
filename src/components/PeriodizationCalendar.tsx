import { useMemo, useState, useCallback } from "react";
import { format, addDays, parseISO, differenceInDays, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trophy, FlaskConical, X, Check, Plus, Minus, AlertTriangle, ZoomIn, ZoomOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Phase = {
  name: string;
  color: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  percentage: number;
};

type Competition = {
  id?: string;
  competition_name: string;
  competition_date: string;
  priority: number;
  notes?: string;
};

type WeekData = {
  week_number: number;
  week_start_date: string;
  planned_volume: number;
  planned_intensity: number;
};

type BiomotorTarget = {
  kekuatan: number;
  kecepatan: number;
  daya_tahan: number;
  teknik: number;
  taktik: number;
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

// Biomotor base values (100% volume)
const BIOMOTOR_BASE = {
  kekuatan: 10000, // kg or reps
  kecepatan: 800,  // meters
  daya_tahan: 20,  // km
  teknik: 500,     // reps
  taktik: 200,     // reps/sets
};

// Biomotor types with colors for multi-select editing
const BIOMOTOR_FOCUS_TYPES = [
  { key: "kekuatan", label: "KEKUATAN", color: "bg-red-400 dark:bg-red-600", bgLight: "bg-red-50 dark:bg-red-950", textColor: "text-red-700 dark:text-red-300", headerBg: "bg-red-200 dark:bg-red-800", headerText: "text-red-800 dark:text-red-100", borderColor: "border-red-300 dark:border-red-700" },
  { key: "kecepatan", label: "KECEPATAN", color: "bg-yellow-400 dark:bg-yellow-600", bgLight: "bg-yellow-50 dark:bg-yellow-950", textColor: "text-yellow-700 dark:text-yellow-300", headerBg: "bg-yellow-200 dark:bg-yellow-800", headerText: "text-yellow-800 dark:text-yellow-100", borderColor: "border-yellow-300 dark:border-yellow-700" },
  { key: "daya_tahan", label: "D.TAHAN", color: "bg-blue-400 dark:bg-blue-600", bgLight: "bg-blue-50 dark:bg-blue-950", textColor: "text-blue-700 dark:text-blue-300", headerBg: "bg-blue-200 dark:bg-blue-800", headerText: "text-blue-800 dark:text-blue-100", borderColor: "border-blue-300 dark:border-blue-700" },
  { key: "teknik", label: "TEKNIK", color: "bg-green-400 dark:bg-green-600", bgLight: "bg-green-50 dark:bg-green-950", textColor: "text-green-700 dark:text-green-300", headerBg: "bg-green-200 dark:bg-green-800", headerText: "text-green-800 dark:text-green-100", borderColor: "border-green-300 dark:border-green-700" },
  { key: "taktik", label: "TAKTIK", color: "bg-purple-400 dark:bg-purple-600", bgLight: "bg-purple-50 dark:bg-purple-950", textColor: "text-purple-700 dark:text-purple-300", headerBg: "bg-purple-200 dark:bg-purple-800", headerText: "text-purple-800 dark:text-purple-100", borderColor: "border-purple-300 dark:border-purple-700" },
];

type BiomotorFocusData = {
  [weekNumber: number]: {
    [biomotorKey: string]: string; // e.g., week 1 -> kekuatan -> "AA"
  };
};

interface PeriodizationCalendarProps {
  startDate: string;
  competitionDate: string;
  phases: Phase[];
  competitions: Competition[];
  weeklyData: WeekData[];
  trainingFocus: TrainingFocus[];
  weeklyTests: WeeklyTest[];
  periodizationType: "linear" | "block" | "undulating";
  biomotorConfig?: typeof BIOMOTOR_BASE;
  biomotorFocusData?: BiomotorFocusData;
  sessionDuration?: number;
  maxSessionsPerWeek?: number;
  onWeeklyDataChange?: (weekNumber: number, field: 'planned_volume' | 'planned_intensity', value: number) => void;
  onTrainingFocusChange?: (weekNumber: number, focusType: string, intensityLevel: number, label?: string) => void;
  onTrainingFocusRemove?: (weekNumber: number, focusType: string) => void;
  onBulkTrainingFocusChange?: (weekNumbers: number[], focusType: string, label: string) => void;
  onBiomotorFocusChange?: (weekNumbers: number[], biomotorKey: string, label: string) => void;
  onBiomotorFocusRemove?: (weekNumber: number, biomotorKey: string) => void;
  onTestAdd?: (weekNumber: number, testName: string) => void;
  onTestRemove?: (weekNumber: number, testId: string) => void;
  onCompetitionAdd?: (weekNumber: number, competitionName: string, date: string) => void;
  onMesoConfigChange?: (mesoConfig: number[]) => void;
  mesoConfig?: number[];
  isEditing?: boolean;
  isEditingVolumeIntensity?: boolean;
  isCoach?: boolean;
}

const FOCUS_TYPES = [
  { key: "kekuatan", label: "Kekuatan", color: "bg-red-400 dark:bg-red-600", textColor: "text-red-700 dark:text-red-300" },
  { key: "kecepatan", label: "Kecepatan", color: "bg-yellow-400 dark:bg-yellow-600", textColor: "text-yellow-700 dark:text-yellow-300" },
  { key: "daya_tahan", label: "Daya Tahan", color: "bg-blue-400 dark:bg-blue-600", textColor: "text-blue-700 dark:text-blue-300" },
  { key: "fleksibilitas", label: "Fleksibilitas", color: "bg-green-400 dark:bg-green-600", textColor: "text-green-700 dark:text-green-300" },
  { key: "mental", label: "Mental", color: "bg-purple-400 dark:bg-purple-600", textColor: "text-purple-700 dark:text-purple-300" },
];

export function PeriodizationCalendar({
  startDate,
  competitionDate,
  phases,
  competitions,
  weeklyData,
  trainingFocus = [],
  weeklyTests = [],
  periodizationType,
  biomotorConfig = BIOMOTOR_BASE,
  biomotorFocusData = {},
  sessionDuration = 120,
  maxSessionsPerWeek = 12,
  onWeeklyDataChange,
  onTrainingFocusChange,
  onTrainingFocusRemove,
  onBulkTrainingFocusChange,
  onBiomotorFocusChange,
  onBiomotorFocusRemove,
  onTestAdd,
  onTestRemove,
  onCompetitionAdd,
  onMesoConfigChange,
  mesoConfig = [4],
  isEditing = false,
  isEditingVolumeIntensity = false,
  isCoach = false,
}: PeriodizationCalendarProps) {
  const [newTestName, setNewTestName] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompDate, setNewCompDate] = useState("");
  const [activePopover, setActivePopover] = useState<string | null>(null);
  
  // Multi-select for training focus
  const [selectedWeeks, setSelectedWeeks] = useState<{ [focusType: string]: number[] }>({});
  const [bulkLabel, setBulkLabel] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState<string | null>(null);
  
  // Multi-select for biomotor focus (kekuatan, kecepatan, etc)
  const [selectedBiomotorWeeks, setSelectedBiomotorWeeks] = useState<{ [biomotorKey: string]: number[] }>({});
  const [biomotorBulkLabel, setBiomotorBulkLabel] = useState("");
  const [showBiomotorBulkDialog, setShowBiomotorBulkDialog] = useState<string | null>(null);

  // Zoom level: 0 = fit-all, 1 = compact, 2 = normal, 3 = wide
  const ZOOM_LEVELS = [
    { label: "Fit", colWidth: 0, fontSize: "text-[8px]", padding: "px-0.5 py-1" },
    { label: "S", colWidth: 30, fontSize: "text-[9px]", padding: "px-1 py-1" },
    { label: "M", colWidth: 45, fontSize: "text-xs", padding: "p-2" },
    { label: "L", colWidth: 65, fontSize: "text-xs", padding: "p-2" },
  ];
  const [zoomLevel, setZoomLevel] = useState(2);

  const calendarData = useMemo(() => {
    if (!startDate || !competitionDate) return null;

    const start = parseISO(startDate);
    const end = parseISO(competitionDate);
    const totalWeeks = Math.ceil(differenceInDays(end, start) / 7) + 1;

    const months: { name: string; weeks: number[] }[] = [];
    const weeks: {
      weekNumber: number;
      startDate: Date;
      endDate: Date;
      dateRange: string;
      phase: string | null;
      phaseColor: string;
      volume: number;
      intensity: number;
      hasCompetition: boolean;
      competitionName?: string;
      competitionId?: string;
      tests: WeeklyTest[];
      focus: { [key: string]: { level: number; label?: string } };
    }[] = [];

    let currentMonth = "";
    let monthWeeks: number[] = [];

    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = addDays(start, i * 7);
      const weekEnd = addDays(weekStart, 6);
      const monthName = format(weekStart, "MMMM", { locale: localeId }).toUpperCase();

      if (monthName !== currentMonth) {
        if (currentMonth && monthWeeks.length > 0) {
          months.push({ name: currentMonth, weeks: [...monthWeeks] });
        }
        currentMonth = monthName;
        monthWeeks = [];
      }
      monthWeeks.push(i + 1);

      let weekPhase: string | null = null;
      let phaseColor = "bg-muted";
      
      for (const phase of phases) {
        const phaseStart = parseISO(phase.startDate);
        const phaseEnd = parseISO(phase.endDate);
        if (isWithinInterval(weekStart, { start: phaseStart, end: phaseEnd }) ||
            isWithinInterval(weekEnd, { start: phaseStart, end: phaseEnd })) {
          if (phase.name.includes("GPP") || phase.name.includes("Umum") || phase.name.includes("Accumulation")) {
            weekPhase = "UMUM";
            phaseColor = "bg-cyan-400 dark:bg-cyan-600";
          } else if (phase.name.includes("SPP") || phase.name.includes("Khusus") || phase.name.includes("Transmutation")) {
            weekPhase = "KHUSUS";
            phaseColor = "bg-green-400 dark:bg-green-600";
          } else if (phase.name.includes("Pra") || phase.name.includes("Pre")) {
            weekPhase = "PRA-KOMP";
            phaseColor = "bg-orange-400 dark:bg-orange-600";
          } else if (phase.name.includes("Kompetisi") || phase.name.includes("Realization") || phase.name.includes("Competition")) {
            weekPhase = "KOMPETISI";
            phaseColor = "bg-purple-400 dark:bg-purple-600";
          }
          break;
        }
      }

      const weekDataItem = weeklyData.find(w => w.week_number === i + 1);
      const volume = weekDataItem?.planned_volume ?? 70;
      const intensity = weekDataItem?.planned_intensity ?? 50;

      let hasCompetition = false;
      let competitionName: string | undefined;
      let competitionId: string | undefined;
      
      const mainCompDate = parseISO(competitionDate);
      if (isWithinInterval(mainCompDate, { start: weekStart, end: weekEnd })) {
        hasCompetition = true;
        competitionName = "Kompetisi Utama";
      }
      
      for (const comp of competitions) {
        const compDate = parseISO(comp.competition_date);
        if (isWithinInterval(compDate, { start: weekStart, end: weekEnd })) {
          hasCompetition = true;
          competitionName = comp.competition_name;
          competitionId = comp.id;
          break;
        }
      }

      const weekTests = weeklyTests.filter(t => t.week_number === i + 1);

      const weekFocus: { [key: string]: { level: number; label?: string } } = {};
      trainingFocus
        .filter(f => f.week_number === i + 1)
        .forEach(f => {
          weekFocus[f.focus_type] = { level: f.intensity_level, label: f.label };
        });

      weeks.push({
        weekNumber: i + 1,
        startDate: weekStart,
        endDate: weekEnd,
        dateRange: `${format(weekStart, "d")}-${format(weekEnd, "d")}`,
        phase: weekPhase,
        phaseColor,
        volume,
        intensity,
        hasCompetition,
        competitionName,
        competitionId,
        tests: weekTests,
        focus: weekFocus,
      });
    }

    if (currentMonth && monthWeeks.length > 0) {
      months.push({ name: currentMonth, weeks: monthWeeks });
    }

    const periodeData = calculatePeriodeSpans(weeks);
    const faseData = calculateFaseSpans(weeks);
    const mesocycleData = calculateMesocyclesFromConfig(weeks, mesoConfig);

    return { months, weeks, periodeData, faseData, mesocycleData, totalWeeks };
  }, [startDate, competitionDate, phases, competitions, weeklyData, trainingFocus, weeklyTests, mesoConfig]);

  const toggleWeekSelection = useCallback((focusType: string, weekNumber: number) => {
    if (!isEditing || !isCoach) return;
    
    setSelectedWeeks(prev => {
      const current = prev[focusType] || [];
      if (current.includes(weekNumber)) {
        return { ...prev, [focusType]: current.filter(w => w !== weekNumber) };
      } else {
        return { ...prev, [focusType]: [...current, weekNumber].sort((a, b) => a - b) };
      }
    });
  }, [isEditing, isCoach]);

  const handleBulkSave = (focusType: string) => {
    const weeks = selectedWeeks[focusType] || [];
    if (weeks.length === 0 || !bulkLabel.trim()) return;
    
    if (onBulkTrainingFocusChange) {
      onBulkTrainingFocusChange(weeks, focusType, bulkLabel.trim());
    } else if (onTrainingFocusChange) {
      weeks.forEach(week => {
        onTrainingFocusChange(week, focusType, 1, bulkLabel.trim());
      });
    }
    
    setSelectedWeeks(prev => ({ ...prev, [focusType]: [] }));
    setBulkLabel("");
    setShowBulkDialog(null);
  };

  // Toggle week selection for biomotor focus
  const toggleBiomotorWeekSelection = useCallback((biomotorKey: string, weekNumber: number) => {
    if (!isEditing || !isCoach) return;
    
    setSelectedBiomotorWeeks(prev => {
      const current = prev[biomotorKey] || [];
      if (current.includes(weekNumber)) {
        return { ...prev, [biomotorKey]: current.filter(w => w !== weekNumber) };
      } else {
        return { ...prev, [biomotorKey]: [...current, weekNumber].sort((a, b) => a - b) };
      }
    });
  }, [isEditing, isCoach]);

  const handleBiomotorBulkSave = (biomotorKey: string) => {
    const weeks = selectedBiomotorWeeks[biomotorKey] || [];
    if (weeks.length === 0 || !biomotorBulkLabel.trim()) return;
    
    if (onBiomotorFocusChange) {
      onBiomotorFocusChange(weeks, biomotorKey, biomotorBulkLabel.trim());
    }
    
    setSelectedBiomotorWeeks(prev => ({ ...prev, [biomotorKey]: [] }));
    setBiomotorBulkLabel("");
    setShowBiomotorBulkDialog(null);
  };

  const handleAddTest = (weekNumber: number) => {
    if (!newTestName.trim() || !onTestAdd) return;
    onTestAdd(weekNumber, newTestName.trim());
    setNewTestName("");
    setActivePopover(null);
  };

  const handleAddCompetition = (weekNumber: number) => {
    if (!newCompName.trim() || !newCompDate || !onCompetitionAdd) return;
    onCompetitionAdd(weekNumber, newCompName.trim(), newCompDate);
    setNewCompName("");
    setNewCompDate("");
    setActivePopover(null);
  };

  if (!calendarData) {
    return <div className="text-muted-foreground text-center py-8">Belum ada data kalender</div>;
  }

  const { months, weeks, periodeData, faseData, mesocycleData, totalWeeks } = calendarData;
  
  // Check if any meso exceeds 6 weeks
  const hasMesoWarning = mesoConfig.some(w => w > 6);
  
  // Calculate total configured weeks
  const totalConfiguredWeeks = mesoConfig.reduce((sum, w) => sum + w, 0);
  const weeksDifference = totalWeeks - totalConfiguredWeeks;

  // Update meso config for a specific meso
  const updateMesoWeeks = (mesoIndex: number, delta: number) => {
    if (!onMesoConfigChange) return;
    const newConfig = [...mesoConfig];
    const newValue = (newConfig[mesoIndex] || 4) + delta;
    if (newValue >= 1 && newValue <= 12) {
      newConfig[mesoIndex] = newValue;
      onMesoConfigChange(newConfig);
    }
  };

  // Add a new meso
  const addMeso = () => {
    if (!onMesoConfigChange) return;
    if (weeksDifference > 0) {
      // Add remaining weeks as new meso
      const weeksToAdd = Math.min(weeksDifference, 4);
      onMesoConfigChange([...mesoConfig, weeksToAdd]);
    }
  };

  // Remove the last meso
  const removeMeso = (mesoIndex: number) => {
    if (!onMesoConfigChange || mesoConfig.length <= 1) return;
    const newConfig = mesoConfig.filter((_, idx) => idx !== mesoIndex);
    onMesoConfigChange(newConfig);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">KALENDER PERIODISASI</h3>
        
        {/* Info about total weeks */}
        {isEditing && isCoach && (
          <div className="text-xs text-muted-foreground">
            Total: {totalWeeks} minggu | Terkonfigurasi: {totalConfiguredWeeks} minggu
            {weeksDifference > 0 && <span className="text-amber-500 ml-1">(+{weeksDifference} belum diatur)</span>}
            {weeksDifference < 0 && <span className="text-red-500 ml-1">({weeksDifference} kelebihan)</span>}
          </div>
        )}
      </div>
      
      {/* Meso Warning */}
      {hasMesoWarning && isEditing && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Ada mesocycle yang lebih dari 6 minggu. Pertimbangkan untuk membaginya.
          </AlertDescription>
        </Alert>
      )}
      
      {weeksDifference > 0 && isEditing && isCoach && (
        <Alert className="py-2 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
            Masih ada {weeksDifference} minggu yang belum dikonfigurasi. 
            <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={addMeso}>
              Tambah Meso
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Zoom Controls */}
      <div className="flex items-center justify-end gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Zoom:</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={zoomLevel <= 0}
          onClick={() => setZoomLevel(z => Math.max(0, z - 1))}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs font-medium w-6 text-center">{ZOOM_LEVELS[zoomLevel].label}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={zoomLevel >= ZOOM_LEVELS.length - 1}
          onClick={() => setZoomLevel(z => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
        <div>
          <table className={cn("w-full border-collapse", ZOOM_LEVELS[zoomLevel].fontSize)}>
            <tbody>
              {/* Row 1: BULAN */}
              <tr>
                <td className="bg-orange-500 dark:bg-orange-600 text-white font-bold p-2 border border-orange-600 dark:border-orange-700 sticky left-0 z-20 min-w-[80px]">
                  BULAN
                </td>
                {months.map((month, idx) => (
                  <td key={idx} colSpan={month.weeks.length} className={cn("bg-orange-500 dark:bg-orange-600 text-white font-bold border border-orange-600 dark:border-orange-700 text-center whitespace-nowrap", ZOOM_LEVELS[zoomLevel].padding)}>
                    {month.name}
                  </td>
                ))}
              </tr>

              {/* Row 2: MINGGU */}
              <tr>
                <td className="bg-orange-400 dark:bg-orange-500 text-white font-bold p-2 border border-orange-500 dark:border-orange-600 sticky left-0 z-20">
                  MINGGU
                </td>
                {weeks.map((week) => (
                  <td
                    key={week.weekNumber}
                    className={cn("bg-orange-400 dark:bg-orange-500 text-white font-medium border border-orange-500 dark:border-orange-600 text-center", ZOOM_LEVELS[zoomLevel].padding)}
                    style={ZOOM_LEVELS[zoomLevel].colWidth > 0 ? { minWidth: ZOOM_LEVELS[zoomLevel].colWidth } : undefined}
                  >
                    {week.weekNumber}
                  </td>
                ))}
              </tr>

              {/* Row 3: TANGGAL */}
              <tr>
                <td className="bg-orange-300 dark:bg-orange-400 text-orange-900 dark:text-white font-bold p-2 border border-orange-400 dark:border-orange-500 sticky left-0 z-20">
                  TANGGAL
                </td>
                {weeks.map((week) => (
                  <td key={week.weekNumber} className="bg-orange-300 dark:bg-orange-400 text-orange-900 dark:text-white p-2 border border-orange-400 dark:border-orange-500 text-center text-[10px]">
                    {week.dateRange}
                  </td>
                ))}
              </tr>

              {/* Row 4: PERIODE */}
              <tr>
                <td className="bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100 font-bold p-2 border border-amber-300 dark:border-amber-600 sticky left-0 z-20">
                  PERIODE
                </td>
                {periodeData.map((periode, idx) => (
                  <td key={idx} colSpan={periode.span} className={`${periode.color} text-white font-bold p-2 border border-slate-400 dark:border-slate-600 text-center whitespace-nowrap`}>
                    {periode.name}
                  </td>
                ))}
              </tr>

              {/* Row 5: FASE */}
              <tr>
                <td className="bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold p-2 border border-amber-200 dark:border-amber-700 sticky left-0 z-20">
                  FASE
                </td>
                {faseData.map((fase, idx) => (
                  <td key={idx} colSpan={fase.span} className={`${fase.color} text-white font-bold p-2 border border-slate-400 dark:border-slate-600 text-center whitespace-nowrap`}>
                    {fase.name}
                  </td>
                ))}
              </tr>

              {/* Row 6: TES & KOMP */}
              <tr>
                <td className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold p-2 border border-slate-300 dark:border-slate-600 sticky left-0 z-20">
                  TES & KOMP
                </td>
                {weeks.map((week) => (
                  <td key={week.weekNumber} className="bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-center">
                    <div className="flex flex-col items-center gap-0.5 min-h-[24px]">
                      {week.hasCompetition && (
                        <div className="flex items-center gap-0.5" title={week.competitionName}>
                          <Trophy className="h-3 w-3 text-amber-500" />
                        </div>
                      )}
                      
                      {week.tests.map((test, idx) => (
                        <div key={idx} className="flex items-center gap-0.5" title={test.test_name}>
                          <FlaskConical className="h-3 w-3 text-blue-500" />
                          {isEditing && isCoach && onTestRemove && (
                            <button onClick={() => onTestRemove(week.weekNumber, test.id!)} className="text-red-500 hover:text-red-700">
                              <X className="h-2 w-2" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {isEditing && isCoach && (
                        <Popover open={activePopover === `test-${week.weekNumber}`} onOpenChange={(open) => setActivePopover(open ? `test-${week.weekNumber}` : null)}>
                          <PopoverTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                              <Plus className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="start">
                            <div className="space-y-3">
                              <div className="font-medium text-sm">Tambah Tes/Kompetisi</div>
                              <div className="space-y-2">
                                <Label className="text-xs">Tes</Label>
                                <div className="flex gap-2">
                                  <Input placeholder="Nama tes..." value={newTestName} onChange={(e) => setNewTestName(e.target.value)} className="h-7 text-xs" />
                                  <Button size="sm" className="h-7 px-2" onClick={() => handleAddTest(week.weekNumber)}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2 border-t pt-2">
                                <Label className="text-xs">Kompetisi</Label>
                                <Input placeholder="Nama kompetisi..." value={newCompName} onChange={(e) => setNewCompName(e.target.value)} className="h-7 text-xs" />
                                <Input type="date" value={newCompDate} onChange={(e) => setNewCompDate(e.target.value)} className="h-7 text-xs" />
                                <Button size="sm" className="h-7 w-full" onClick={() => handleAddCompetition(week.weekNumber)}>
                                  Tambah Kompetisi
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      
                      {!week.hasCompetition && week.tests.length === 0 && !isEditing && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 7: MESOCYCLE with individual editing */}
              <tr>
                <td className="bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold p-2 border border-slate-400 dark:border-slate-500 sticky left-0 z-20">
                  MESOCYCLE
                </td>
                {mesocycleData.map((meso, idx) => (
                  <td key={idx} colSpan={meso.span} className={cn(
                    "font-medium p-1 border border-slate-300 dark:border-slate-600 text-center whitespace-nowrap",
                    meso.span > 6 
                      ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200" 
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  )}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold">{meso.name}</span>
                      <span className="text-[9px] text-muted-foreground">({meso.span}w)</span>
                      {isEditing && isCoach && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => updateMesoWeeks(idx, -1)}
                            disabled={mesoConfig[idx] <= 1}
                          >
                            <Minus className="h-2 w-2" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => updateMesoWeeks(idx, 1)}
                            disabled={mesoConfig[idx] >= 12}
                          >
                            <Plus className="h-2 w-2" />
                          </Button>
                          {mesoConfig.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                              onClick={() => removeMeso(idx)}
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

{/* Training focus rows with multi-select and merged cells */}
              {FOCUS_TYPES.map((focusType) => {
                const selectedForType = selectedWeeks[focusType.key] || [];
                const hasSelection = selectedForType.length > 0;
                
                // Calculate merged cell spans for consecutive weeks with same label
                const getMergedCells = () => {
                  const cells: { weekNumber: number; span: number; label?: string; isSkipped?: boolean }[] = [];
                  let i = 0;
                  
                  while (i < weeks.length) {
                    const week = weeks[i];
                    const focusData = week.focus[focusType.key];
                    const currentLabel = focusData?.label;
                    
                    if (currentLabel) {
                      // Count consecutive weeks with same label
                      let span = 1;
                      while (i + span < weeks.length) {
                        const nextWeek = weeks[i + span];
                        const nextFocusData = nextWeek.focus[focusType.key];
                        if (nextFocusData?.label === currentLabel) {
                          span++;
                        } else {
                          break;
                        }
                      }
                      cells.push({ weekNumber: week.weekNumber, span, label: currentLabel });
                      // Mark subsequent weeks as skipped
                      for (let j = 1; j < span; j++) {
                        cells.push({ weekNumber: weeks[i + j].weekNumber, span: 0, isSkipped: true });
                      }
                      i += span;
                    } else {
                      cells.push({ weekNumber: week.weekNumber, span: 1 });
                      i++;
                    }
                  }
                  return cells;
                };
                
                const mergedCells = getMergedCells();
                
                return (
                  <tr key={focusType.key}>
                    <td className={cn(
                      "font-medium p-2 border sticky left-0 z-20 italic",
                      focusType.color.replace("bg-", "bg-").replace("-400", "-100").replace("-600", "-900"),
                      focusType.textColor
                    )}>
                      <div className="flex items-center justify-between gap-1">
                        <span>{focusType.label}</span>
                        {isEditing && isCoach && hasSelection && (
                          <Popover open={showBulkDialog === focusType.key} onOpenChange={(open) => setShowBulkDialog(open ? focusType.key : null)}>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="secondary" className="h-5 px-1 text-[9px]">
                                Set ({selectedForType.length})
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3" align="start">
                              <div className="space-y-3">
                                <div className="font-medium text-sm">
                                  {focusType.label} - Minggu {selectedForType.join(", ")}
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Label Tujuan</Label>
                                  <Input
                                    placeholder="Contoh: Adaptasi Anatomi"
                                    value={bulkLabel}
                                    onChange={(e) => setBulkLabel(e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="flex-1" onClick={() => handleBulkSave(focusType.key)}>
                                    <Check className="h-3 w-3 mr-1" /> Simpan
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setSelectedWeeks(prev => ({ ...prev, [focusType.key]: [] }));
                                    setShowBulkDialog(null);
                                  }}>
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </td>
                    {mergedCells.map((cellData, idx) => {
                      // Skip cells that are part of a merged span
                      if (cellData.isSkipped) return null;
                      
                      const week = weeks.find(w => w.weekNumber === cellData.weekNumber)!;
                      const isSelected = selectedForType.includes(week.weekNumber);
                      const hasLabel = !!cellData.label;
                      
                      if (hasLabel && cellData.span > 0) {
                        // Merged cell with label
                        return (
                          <td
                            key={`${focusType.key}-${cellData.weekNumber}`}
                            colSpan={cellData.span}
                            className={cn(
                              "p-2 border border-slate-200 dark:border-slate-700 text-center transition-all",
                              focusType.color
                            )}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-sm font-bold text-white drop-shadow-sm">
                                {cellData.label}
                              </span>
                              {isEditing && isCoach && onTrainingFocusRemove && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Remove label from all weeks in this span
                                    for (let w = cellData.weekNumber; w < cellData.weekNumber + cellData.span; w++) {
                                      onTrainingFocusRemove(w, focusType.key);
                                    }
                                  }} 
                                  className="text-white/70 hover:text-white ml-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }
                      
                      // Regular cell without label
                      return (
                        <td
                          key={`${focusType.key}-${cellData.weekNumber}`}
                          onClick={() => isEditing && isCoach && toggleWeekSelection(focusType.key, week.weekNumber)}
                          className={cn(
                            "p-1 border border-slate-200 dark:border-slate-700 text-center transition-all",
                            isEditing && isCoach ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : "",
                            "bg-white dark:bg-slate-900",
                            isSelected ? "ring-2 ring-primary ring-inset bg-primary/20" : ""
                          )}
                        >
                          <span className={cn(
                            "text-[9px]",
                            isSelected ? "text-primary font-bold" : "text-muted-foreground"
                          )}>
                            {isSelected ? "✓" : "-"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}


              {/* Volume & Intensity Line Graph Row - Integrated into table */}
              <tr>
                <td colSpan={weeks.length + 1} className="bg-slate-100 dark:bg-slate-800 p-0 border border-slate-200 dark:border-slate-700">
                  <div className="flex">
                    {/* Left label column */}
                    <div className="min-w-[100px] flex flex-col justify-between p-2 bg-slate-200 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600">
                      <div className="text-[9px] font-bold text-muted-foreground">100%</div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-[3px] bg-blue-500 rounded"></div>
                          <span className="text-[9px] text-blue-700 dark:text-blue-300 font-medium">Volume</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-[3px] bg-red-500 rounded"></div>
                          <span className="text-[9px] text-red-700 dark:text-red-300 font-medium">Intensitas</span>
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-muted-foreground">0%</div>
                    </div>
                    {/* Line Graph SVG */}
                    <div className="flex-1 relative bg-gradient-to-b from-muted/20 to-background">
                      <svg 
                        className="w-full h-40" 
                        viewBox={`0 0 ${weeks.length * 45} 140`}
                        preserveAspectRatio="none"
                      >
                        {/* Y-axis grid lines */}
                        <line x1="0" y1="20" x2={weeks.length * 45} y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.5" strokeDasharray="2,2" />
                        <line x1="0" y1="50" x2={weeks.length * 45} y2="50" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.5" strokeDasharray="2,2" />
                        <line x1="0" y1="80" x2={weeks.length * 45} y2="80" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.5" strokeDasharray="2,2" />
                        <line x1="0" y1="110" x2={weeks.length * 45} y2="110" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="0.5" strokeDasharray="2,2" />
                        
                        {/* Gradient definitions */}
                        <defs>
                          <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                          </linearGradient>
                          <linearGradient id="intensityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        
                        {/* Volume Area Fill */}
                        <polygon
                          fill="url(#volumeGradient)"
                          points={`22.5,130 ${weeks.map((week, idx) => {
                            const x = (idx * 45) + 22.5;
                            const y = 130 - (week.volume / 100) * 110;
                            return `${x},${y}`;
                          }).join(' ')} ${(weeks.length - 1) * 45 + 22.5},130`}
                        />
                        
                        {/* Intensity Area Fill */}
                        <polygon
                          fill="url(#intensityGradient)"
                          points={`22.5,130 ${weeks.map((week, idx) => {
                            const x = (idx * 45) + 22.5;
                            const y = 130 - (week.intensity / 100) * 110;
                            return `${x},${y}`;
                          }).join(' ')} ${(weeks.length - 1) * 45 + 22.5},130`}
                        />
                        
                        {/* Volume Line (blue) */}
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={weeks.map((week, idx) => {
                            const x = (idx * 45) + 22.5;
                            const y = 130 - (week.volume / 100) * 110;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                        
                        {/* Intensity Line (red) */}
                        <polyline
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={weeks.map((week, idx) => {
                            const x = (idx * 45) + 22.5;
                            const y = 130 - (week.intensity / 100) * 110;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                        
                        {/* Volume data points */}
                        {weeks.map((week, idx) => {
                          const x = (idx * 45) + 22.5;
                          const y = 130 - (week.volume / 100) * 110;
                          return (
                            <g key={`vol-${week.weekNumber}`}>
                              <circle cx={x} cy={y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                              <title>M{week.weekNumber}: Volume {week.volume}%</title>
                            </g>
                          );
                        })}
                        
                        {/* Intensity data points */}
                        {weeks.map((week, idx) => {
                          const x = (idx * 45) + 22.5;
                          const y = 130 - (week.intensity / 100) * 110;
                          return (
                            <g key={`int-${week.weekNumber}`}>
                              <circle cx={x} cy={y} r="5" fill="#ef4444" stroke="white" strokeWidth="2" />
                              <title>M{week.weekNumber}: Intensitas {week.intensity}%</title>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                </td>
              </tr>


            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Biomotor Target Table - Separate section below graph */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">TARGET BIOMOTOR PER MINGGU</h4>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <table className="border-collapse text-center w-full">
              <thead>
                <tr>
                  <th className="p-2 border bg-muted sticky left-0 z-20 text-xs font-bold min-w-[100px]">Komponen</th>
                  {weeks.map((week) => (
                    <th key={`bio-header-${week.weekNumber}`} className={cn("p-1 border text-center min-w-[40px]", ZOOM_LEVELS[zoomLevel].fontSize)}>
                      <div className="font-bold">M{week.weekNumber}</div>
                      <div className="text-muted-foreground text-[8px]">{week.volume}%</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BIOMOTOR_FOCUS_TYPES.map((bio) => (
                  <tr key={`bio-target-${bio.key}`}>
                    <td className={cn(
                      "font-medium p-2 border sticky left-0 z-20",
                      bio.headerBg, bio.headerText
                    )}>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">{bio.label}</span>
                        <span className="text-[8px] opacity-70">
                          {bio.key === 'kekuatan' ? 'kg' : bio.key === 'kecepatan' ? 'm' : bio.key === 'daya_tahan' ? 'km' : 'reps'}
                        </span>
                      </div>
                    </td>
                    {weeks.map((week) => {
                      const volumePercent = week.volume / 100;
                      const baseValue = biomotorConfig[bio.key as keyof typeof biomotorConfig] || 0;
                      const targetValue = Math.round(volumePercent * baseValue);
                      
                      const displayValue = targetValue >= 1000 
                        ? `${(targetValue / 1000).toFixed(1)}k` 
                        : targetValue.toString();
                      
                      return (
                        <td
                          key={`bio-${bio.key}-${week.weekNumber}`}
                          className={cn(
                            "p-1 border text-center",
                            bio.bgLight, bio.borderColor
                          )}
                        >
                          <span className={cn("font-semibold", bio.textColor, ZOOM_LEVELS[zoomLevel].fontSize)}>
                            {displayValue}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
      </div>

      {/* Weekly Load Estimation Table */}
      {sessionDuration > 0 && maxSessionsPerWeek > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">ESTIMASI WEEKLY LOAD</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Durasi: {sessionDuration} menit | Max Sesi/Minggu: {maxSessionsPerWeek} | 
            Session Max Load: {Math.round(140 * (sessionDuration / 60))} TSS | 
            Max Weekly Load: {Math.round(140 * (sessionDuration / 60) * maxSessionsPerWeek)} TSS
          </p>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <table className="border-collapse text-center w-full">
                <thead>
                  <tr>
                    <th className="p-2 border bg-muted sticky left-0 z-20 text-xs font-bold min-w-[100px]">Parameter</th>
                    {weeks.map((week) => (
                      <th key={`load-header-${week.weekNumber}`} className={cn("p-1 border text-center min-w-[40px]", ZOOM_LEVELS[zoomLevel].fontSize)}>
                        <div className="font-bold">M{week.weekNumber}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Weekly Load row */}
                  <tr>
                    <td className="font-medium p-2 border sticky left-0 z-20 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">WEEKLY LOAD</span>
                        <span className="text-[8px] opacity-70">TSS</span>
                      </div>
                    </td>
                    {weeks.map((week) => {
                      const sessionMaxLoad = 140 * (sessionDuration / 60);
                      const maxWeeklyLoad = sessionMaxLoad * maxSessionsPerWeek;
                      const weeklyLoad = Math.round(maxWeeklyLoad * (week.volume / 100) * (week.intensity / 100));
                      return (
                        <td key={`wl-${week.weekNumber}`} className={cn("p-1 border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800", ZOOM_LEVELS[zoomLevel].fontSize)}>
                          <span className="font-semibold text-amber-700 dark:text-amber-300">
                            {weeklyLoad >= 1000 ? `${(weeklyLoad / 1000).toFixed(1)}k` : weeklyLoad}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Load per Session row */}
                  <tr>
                    <td className="font-medium p-2 border sticky left-0 z-20 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">LOAD/SESI</span>
                        <span className="text-[8px] opacity-70">TSS</span>
                      </div>
                    </td>
                    {weeks.map((week) => {
                      const sessionMaxLoad = 140 * (sessionDuration / 60);
                      const maxWeeklyLoad = sessionMaxLoad * maxSessionsPerWeek;
                      const weeklyLoad = maxWeeklyLoad * (week.volume / 100) * (week.intensity / 100);
                      const loadPerSession = Math.round(weeklyLoad / maxSessionsPerWeek);
                      return (
                        <td key={`ls-${week.weekNumber}`} className={cn("p-1 border bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800", ZOOM_LEVELS[zoomLevel].fontSize)}>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {loadPerSession}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Estimated RPE row */}
                  <tr>
                    <td className="font-medium p-2 border sticky left-0 z-20 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">EST. RPE</span>
                        <span className="text-[8px] opacity-70">target</span>
                      </div>
                    </td>
                    {weeks.map((week) => {
                      const sessionMaxLoad = 140 * (sessionDuration / 60);
                      const maxWeeklyLoad = sessionMaxLoad * maxSessionsPerWeek;
                      const weeklyLoad = maxWeeklyLoad * (week.volume / 100) * (week.intensity / 100);
                      const loadPerSession = weeklyLoad / maxSessionsPerWeek;
                      
                      // Convert load per session back to RPE
                      // Load at 60min: RPE table values. Scale by duration.
                      const durationFactor = sessionDuration / 60;
                      const loadAt60 = loadPerSession / durationFactor;
                      const RPE_TABLE = [
                        { rpe: 1, load: 20 }, { rpe: 2, load: 30 }, { rpe: 3, load: 40 },
                        { rpe: 4, load: 50 }, { rpe: 5, load: 60 }, { rpe: 6, load: 70 },
                        { rpe: 7, load: 80 }, { rpe: 8, load: 100 }, { rpe: 9, load: 120 },
                        { rpe: 10, load: 140 },
                      ];
                      let estRpe = 1;
                      for (const entry of RPE_TABLE) {
                        if (loadAt60 >= entry.load) estRpe = entry.rpe;
                      }
                      // Interpolate for better precision
                      const lowerEntry = RPE_TABLE.find(e => e.rpe === estRpe)!;
                      const upperEntry = RPE_TABLE.find(e => e.rpe === estRpe + 1);
                      let displayRpe = estRpe.toString();
                      if (upperEntry && loadAt60 > lowerEntry.load) {
                        const fraction = (loadAt60 - lowerEntry.load) / (upperEntry.load - lowerEntry.load);
                        displayRpe = (estRpe + fraction).toFixed(1);
                      }
                      
                      const rpeColor = estRpe <= 4 ? "text-green-600 dark:text-green-400" :
                                       estRpe <= 6 ? "text-yellow-600 dark:text-yellow-400" :
                                       estRpe <= 8 ? "text-orange-600 dark:text-orange-400" :
                                       "text-red-600 dark:text-red-400";
                      
                      return (
                        <td key={`rpe-${week.weekNumber}`} className={cn("p-1 border bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800", ZOOM_LEVELS[zoomLevel].fontSize)}>
                          <span className={cn("font-bold", rpeColor)}>
                            {displayRpe}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      {isEditing && isCoach && (
        <p className="text-xs text-muted-foreground">
          💡 Klik beberapa minggu pada baris fokus latihan untuk memilih, lalu klik tombol "Set" untuk mengisi label sekaligus. Klik ikon X untuk menghapus.
        </p>
      )}
    </div>
  );
}

function calculatePeriodeSpans(weeks: any[]) {
  const periodes: { name: string; span: number; color: string }[] = [];
  let currentPeriode = "";
  let currentSpan = 0;

  for (const week of weeks) {
    let periodeName = "PERSIAPAN";
    if (week.phase === "KOMPETISI" || week.phase === "PRA-KOMP") {
      periodeName = "PERTANDINGAN";
    }

    if (periodeName !== currentPeriode) {
      if (currentPeriode) {
        periodes.push({
          name: currentPeriode,
          span: currentSpan,
          color: currentPeriode === "PERSIAPAN" ? "bg-amber-500 dark:bg-amber-600" : "bg-purple-500 dark:bg-purple-600",
        });
      }
      currentPeriode = periodeName;
      currentSpan = 1;
    } else {
      currentSpan++;
    }
  }

  if (currentPeriode) {
    periodes.push({
      name: currentPeriode,
      span: currentSpan,
      color: currentPeriode === "PERSIAPAN" ? "bg-amber-500 dark:bg-amber-600" : "bg-purple-500 dark:bg-purple-600",
    });
  }

  return periodes;
}

function calculateFaseSpans(weeks: any[]) {
  const fases: { name: string; span: number; color: string }[] = [];
  let currentFase = "";
  let currentSpan = 0;
  let currentColor = "";

  for (const week of weeks) {
    const faseName = week.phase || "-";
    const faseColor = week.phaseColor;

    if (faseName !== currentFase) {
      if (currentFase) {
        fases.push({ name: currentFase, span: currentSpan, color: currentColor });
      }
      currentFase = faseName;
      currentSpan = 1;
      currentColor = faseColor;
    } else {
      currentSpan++;
    }
  }

  if (currentFase) {
    fases.push({ name: currentFase, span: currentSpan, color: currentColor });
  }

  return fases;
}

function calculateMesocyclesFromConfig(weeks: any[], mesoConfig: number[]) {
  const mesos: { name: string; span: number }[] = [];
  let weekIndex = 0;
  let mesoNumber = 1;

  for (const mesoWeeks of mesoConfig) {
    const remainingWeeks = weeks.length - weekIndex;
    if (remainingWeeks <= 0) break;
    
    const span = Math.min(mesoWeeks, remainingWeeks);
    mesos.push({ name: `MESO ${mesoNumber}`, span });
    weekIndex += span;
    mesoNumber++;
  }

  // If there are remaining weeks not covered by config, add them as extra mesos
  while (weekIndex < weeks.length) {
    const remainingWeeks = weeks.length - weekIndex;
    const span = Math.min(4, remainingWeeks); // Default 4 weeks per meso
    mesos.push({ name: `MESO ${mesoNumber}`, span });
    weekIndex += span;
    mesoNumber++;
  }

  return mesos;
}
