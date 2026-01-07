import { useMemo, useState } from "react";
import { format, addDays, parseISO, differenceInDays, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trophy, Dumbbell, FlaskConical, X, Check, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type TrainingFocus = {
  id?: string;
  week_number: number;
  focus_type: string;
  intensity_level: number;
  notes?: string;
};

type WeeklyTest = {
  id?: string;
  week_number: number;
  test_name: string;
  test_date?: string;
  notes?: string;
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
  onWeeklyDataChange?: (weekNumber: number, field: 'planned_volume' | 'planned_intensity', value: number) => void;
  onTrainingFocusChange?: (weekNumber: number, focusType: string, intensityLevel: number) => void;
  onTrainingFocusRemove?: (weekNumber: number, focusType: string) => void;
  onTestAdd?: (weekNumber: number, testName: string) => void;
  onTestRemove?: (weekNumber: number, testId: string) => void;
  onCompetitionAdd?: (weekNumber: number, competitionName: string, date: string) => void;
  isEditing?: boolean;
  isCoach?: boolean;
}

const FOCUS_TYPES = [
  { key: "kekuatan", label: "Kekuatan", color: "bg-red-400 dark:bg-red-600" },
  { key: "kecepatan", label: "Kecepatan", color: "bg-yellow-400 dark:bg-yellow-600" },
  { key: "daya_tahan", label: "Daya Tahan", color: "bg-blue-400 dark:bg-blue-600" },
  { key: "fleksibilitas", label: "Fleksibilitas", color: "bg-green-400 dark:bg-green-600" },
  { key: "mental", label: "Mental", color: "bg-purple-400 dark:bg-purple-600" },
];

const INTENSITY_LEVELS = [
  { level: 1, label: "Rendah", size: "h-2 w-2" },
  { level: 2, label: "Sedang", size: "h-3 w-3" },
  { level: 3, label: "Tinggi", size: "h-4 w-4" },
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
  onWeeklyDataChange,
  onTrainingFocusChange,
  onTrainingFocusRemove,
  onTestAdd,
  onTestRemove,
  onCompetitionAdd,
  isEditing = false,
  isCoach = false,
}: PeriodizationCalendarProps) {
  const [newTestName, setNewTestName] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompDate, setNewCompDate] = useState("");
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const calendarData = useMemo(() => {
    if (!startDate || !competitionDate) return null;

    const start = parseISO(startDate);
    const end = parseISO(competitionDate);
    const totalWeeks = Math.ceil(differenceInDays(end, start) / 7) + 1;

    // Group weeks by month
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
      focus: { [key: string]: number };
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

      // Find phase for this week
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

      // Find weekly data
      const weekDataItem = weeklyData.find(w => w.week_number === i + 1);
      const volume = weekDataItem?.planned_volume ?? 70;
      const intensity = weekDataItem?.planned_intensity ?? 50;

      // Check for competition
      let hasCompetition = false;
      let competitionName: string | undefined;
      let competitionId: string | undefined;
      
      // Check main competition
      const mainCompDate = parseISO(competitionDate);
      if (isWithinInterval(mainCompDate, { start: weekStart, end: weekEnd })) {
        hasCompetition = true;
        competitionName = "Kompetisi Utama";
      }
      
      // Check other competitions
      for (const comp of competitions) {
        const compDate = parseISO(comp.competition_date);
        if (isWithinInterval(compDate, { start: weekStart, end: weekEnd })) {
          hasCompetition = true;
          competitionName = comp.competition_name;
          competitionId = comp.id;
          break;
        }
      }

      // Find tests for this week
      const weekTests = weeklyTests.filter(t => t.week_number === i + 1);

      // Find focus for this week
      const weekFocus: { [key: string]: number } = {};
      trainingFocus
        .filter(f => f.week_number === i + 1)
        .forEach(f => {
          weekFocus[f.focus_type] = f.intensity_level;
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

    // Push last month
    if (currentMonth && monthWeeks.length > 0) {
      months.push({ name: currentMonth, weeks: monthWeeks });
    }

    // Calculate periode spans
    const periodeData = calculatePeriodeSpans(weeks);
    const faseData = calculateFaseSpans(weeks);
    const mesocycleData = calculateMesocycles(weeks);

    return { months, weeks, periodeData, faseData, mesocycleData };
  }, [startDate, competitionDate, phases, competitions, weeklyData, trainingFocus, weeklyTests]);

  const handleFocusClick = (weekNumber: number, focusType: string, currentLevel: number) => {
    if (!isEditing || !isCoach || !onTrainingFocusChange) return;
    
    const newLevel = currentLevel === 0 ? 1 : currentLevel >= 3 ? 0 : currentLevel + 1;
    
    if (newLevel === 0 && onTrainingFocusRemove) {
      onTrainingFocusRemove(weekNumber, focusType);
    } else if (newLevel > 0) {
      onTrainingFocusChange(weekNumber, focusType, newLevel);
    }
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

  const { months, weeks, periodeData, faseData, mesocycleData } = calendarData;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">KALENDER PERIODISASI</h3>
      <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
        <div className="min-w-max">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {/* Row 1: BULAN (Month) */}
              <tr>
                <td className="bg-orange-500 dark:bg-orange-600 text-white font-bold p-2 border border-orange-600 dark:border-orange-700 sticky left-0 z-10 min-w-[100px]">
                  BULAN
                </td>
                {months.map((month, idx) => (
                  <td
                    key={idx}
                    colSpan={month.weeks.length}
                    className="bg-orange-500 dark:bg-orange-600 text-white font-bold p-2 border border-orange-600 dark:border-orange-700 text-center"
                  >
                    {month.name}
                  </td>
                ))}
              </tr>

              {/* Row 2: MINGGU (Week Number) */}
              <tr>
                <td className="bg-orange-400 dark:bg-orange-500 text-white font-bold p-2 border border-orange-500 dark:border-orange-600 sticky left-0 z-10">
                  MINGGU
                </td>
                {weeks.map((week) => (
                  <td
                    key={week.weekNumber}
                    className="bg-orange-400 dark:bg-orange-500 text-white font-medium p-2 border border-orange-500 dark:border-orange-600 text-center min-w-[50px]"
                  >
                    {week.weekNumber}
                  </td>
                ))}
              </tr>

              {/* Row 3: TANGGAL (Date Range) */}
              <tr>
                <td className="bg-orange-300 dark:bg-orange-400 text-orange-900 dark:text-white font-bold p-2 border border-orange-400 dark:border-orange-500 sticky left-0 z-10">
                  TANGGAL
                </td>
                {weeks.map((week) => (
                  <td
                    key={week.weekNumber}
                    className="bg-orange-300 dark:bg-orange-400 text-orange-900 dark:text-white p-2 border border-orange-400 dark:border-orange-500 text-center text-[10px]"
                  >
                    {week.dateRange}
                  </td>
                ))}
              </tr>

              {/* Row 4: PERIODE */}
              <tr>
                <td className="bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100 font-bold p-2 border border-amber-300 dark:border-amber-600 sticky left-0 z-10">
                  PERIODE
                </td>
                {periodeData.map((periode, idx) => (
                  <td
                    key={idx}
                    colSpan={periode.span}
                    className={`${periode.color} text-white font-bold p-2 border border-slate-400 dark:border-slate-600 text-center`}
                  >
                    {periode.name}
                  </td>
                ))}
              </tr>

              {/* Row 5: FASE */}
              <tr>
                <td className="bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold p-2 border border-amber-200 dark:border-amber-700 sticky left-0 z-10">
                  FASE
                </td>
                {faseData.map((fase, idx) => (
                  <td
                    key={idx}
                    colSpan={fase.span}
                    className={`${fase.color} text-white font-bold p-2 border border-slate-400 dark:border-slate-600 text-center`}
                  >
                    {fase.name}
                  </td>
                ))}
              </tr>

              {/* Row 6: TES & KOMP - Editable */}
              <tr>
                <td className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold p-2 border border-slate-300 dark:border-slate-600 sticky left-0 z-10">
                  TES & KOMP
                </td>
                {weeks.map((week) => (
                  <td
                    key={week.weekNumber}
                    className="bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-center"
                  >
                    <div className="flex flex-col items-center gap-0.5 min-h-[24px]">
                      {/* Show competition */}
                      {week.hasCompetition && (
                        <div className="flex items-center gap-0.5" title={week.competitionName}>
                          <Trophy className="h-3 w-3 text-amber-500" />
                        </div>
                      )}
                      
                      {/* Show tests */}
                      {week.tests.map((test, idx) => (
                        <div key={idx} className="flex items-center gap-0.5" title={test.test_name}>
                          <FlaskConical className="h-3 w-3 text-blue-500" />
                          {isEditing && isCoach && onTestRemove && (
                            <button
                              onClick={() => onTestRemove(week.weekNumber, test.id!)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {/* Add button when editing */}
                      {isEditing && isCoach && !week.hasCompetition && (
                        <Popover 
                          open={activePopover === `test-${week.weekNumber}`} 
                          onOpenChange={(open) => setActivePopover(open ? `test-${week.weekNumber}` : null)}
                        >
                          <PopoverTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                              <Plus className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="start">
                            <div className="space-y-3">
                              <div className="font-medium text-sm">Tambah Tes/Kompetisi</div>
                              
                              {/* Add Test */}
                              <div className="space-y-2">
                                <Label className="text-xs">Tes</Label>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Nama tes..."
                                    value={newTestName}
                                    onChange={(e) => setNewTestName(e.target.value)}
                                    className="h-7 text-xs"
                                  />
                                  <Button 
                                    size="sm" 
                                    className="h-7 px-2"
                                    onClick={() => handleAddTest(week.weekNumber)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Add Competition */}
                              <div className="space-y-2 border-t pt-2">
                                <Label className="text-xs">Kompetisi</Label>
                                <Input
                                  placeholder="Nama kompetisi..."
                                  value={newCompName}
                                  onChange={(e) => setNewCompName(e.target.value)}
                                  className="h-7 text-xs"
                                />
                                <Input
                                  type="date"
                                  value={newCompDate}
                                  onChange={(e) => setNewCompDate(e.target.value)}
                                  className="h-7 text-xs"
                                />
                                <Button 
                                  size="sm" 
                                  className="h-7 w-full"
                                  onClick={() => handleAddCompetition(week.weekNumber)}
                                >
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

              {/* Row 7: VOLUME % - Visual bars */}
              <tr>
                <td className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-bold p-2 border border-blue-200 dark:border-blue-800 sticky left-0 z-10">
                  VOLUME %
                </td>
                {weeks.map((week) => (
                  <td
                    key={week.weekNumber}
                    className="bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="h-8 flex items-end justify-center">
                      <div
                        className="w-6 bg-blue-400 dark:bg-blue-500 rounded-t transition-all"
                        style={{ height: `${(week.volume / 100) * 100}%` }}
                        title={`${week.volume}%`}
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 8: INTENSITAS % - Visual bars with number */}
              <tr>
                <td className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 font-bold p-2 border border-red-200 dark:border-red-800 sticky left-0 z-10">
                  INTENSITAS %
                </td>
                {weeks.map((week) => (
                  <td
                    key={week.weekNumber}
                    className="bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="h-10 flex flex-col items-center justify-end">
                      <span className="text-[9px] text-red-500 dark:text-red-400 font-medium mb-0.5">
                        {week.intensity}
                      </span>
                      <div
                        className="w-6 bg-red-400 dark:bg-red-500 rounded-t transition-all"
                        style={{ height: `${(week.intensity / 100) * 70}%` }}
                        title={`${week.intensity}%`}
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 9: MESOCYCLE */}
              <tr>
                <td className="bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold p-2 border border-slate-400 dark:border-slate-500 sticky left-0 z-10">
                  MESOCYCLE
                </td>
                {mesocycleData.map((meso, idx) => (
                  <td
                    key={idx}
                    colSpan={meso.span}
                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium p-2 border border-slate-300 dark:border-slate-600 text-center"
                  >
                    {meso.name}
                  </td>
                ))}
              </tr>

              {/* Training focus rows - Clickable */}
              {FOCUS_TYPES.map((focusType) => (
                <tr key={focusType.key}>
                  <td className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 font-medium p-2 border border-amber-200 dark:border-amber-800 sticky left-0 z-10 italic">
                    {focusType.label}
                  </td>
                  {weeks.map((week) => {
                    const level = week.focus[focusType.key] || 0;
                    return (
                      <td
                        key={week.weekNumber}
                        className={cn(
                          "p-2 border border-slate-200 dark:border-slate-700 text-center",
                          isEditing && isCoach ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : "",
                          level > 0 ? "bg-white dark:bg-slate-900" : "bg-white dark:bg-slate-900"
                        )}
                        onClick={() => handleFocusClick(week.weekNumber, focusType.key, level)}
                        title={level > 0 ? `${focusType.label}: ${INTENSITY_LEVELS.find(l => l.level === level)?.label}` : "Klik untuk menambah"}
                      >
                        {level > 0 ? (
                          <div className="flex items-center justify-center">
                            <div 
                              className={cn(
                                "rounded-full",
                                focusType.color,
                                INTENSITY_LEVELS.find(l => l.level === level)?.size
                              )}
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-4">
        <span className="font-medium">Fokus Latihan:</span>
        {FOCUS_TYPES.map((f) => (
          <div key={f.key} className="flex items-center gap-1">
            <div className={cn("h-3 w-3 rounded-full", f.color)} />
            <span>{f.label}</span>
          </div>
        ))}
        <span className="mx-2">|</span>
        <span className="font-medium">Intensitas:</span>
        {INTENSITY_LEVELS.map((l) => (
          <div key={l.level} className="flex items-center gap-1">
            <div className={cn("rounded-full bg-slate-400", l.size)} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
      
      {isEditing && isCoach && (
        <p className="text-xs text-muted-foreground">
          💡 Klik pada sel fokus latihan untuk menambah/mengubah intensitas. Klik ikon + pada TES & KOMP untuk menambah tes atau kompetisi.
        </p>
      )}
    </div>
  );
}

// Helper function to calculate PERIODE spans
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

// Helper function to calculate FASE spans
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

// Helper function to calculate mesocycles (every 4 weeks)
function calculateMesocycles(weeks: any[]) {
  const mesos: { name: string; span: number }[] = [];
  const weeksPerMeso = 4;
  let mesoNumber = 1;

  for (let i = 0; i < weeks.length; i += weeksPerMeso) {
    const span = Math.min(weeksPerMeso, weeks.length - i);
    mesos.push({ name: `MESO ${mesoNumber}`, span });
    mesoNumber++;
  }

  return mesos;
}
