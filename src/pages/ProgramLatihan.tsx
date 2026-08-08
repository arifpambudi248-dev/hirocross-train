import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeSessionLoad } from "@/lib/trainingLoad";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Trash2, ChevronLeft, ChevronRight, Activity, Save, Bookmark, GripVertical, Eye, Dumbbell, Footprints, Target, FileText, BarChart3, CheckCircle, Circle, Zap, Crosshair, Pencil, Users, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { Droppable } from "@/components/Droppable";
import { Draggable } from "@/components/Draggable";
import { trainingSessionSchema, templateSchema } from "@/lib/validationSchemas";
import { handleError, getFriendlyErrorMessage } from "@/lib/errorHandling";
import { z } from "zod";
import { ExerciseForm, Exercise, ExercisePhase, PhaseNotes } from "@/components/ExerciseForm";
import { WeeklyVolumeChart } from "@/components/WeeklyVolumeChart";
import { BodyMapSection } from "@/components/BodyMapSection";
import { exportSessionDetailToPDF, exportDailyProgramToPDF, exportWeeklyProgramToPDF } from "@/lib/exportUtils";
import { TrainingSessionForm, SessionFormData, MainExercise, ExerciseType } from "@/components/TrainingSessionForm";
import { BulkSessionForm } from "@/components/BulkSessionForm";
import { TrainingRecommendationCard } from "@/components/TrainingRecommendationCard";

type SessionExercise = {
  id: string;
  session_id: string;
  exercise_name: string;
  exercise_type: string;
  exercise_phase?: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  repetitions: number | null;
  total_volume: number | null;
  notes: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
};

type TrainingSession = {
  id: string;
  date: string;
  session_name: string | null;
  rpe: number | null;
  duration_minutes: number | null;
  load_auto: number;
  load_manual: number | null;
  load_final: number;
  notes: string | null;
  strength_volume?: number;
  cardio_distance?: number;
  skill_reps?: number;
  exercises?: SessionExercise[];
  is_assigned?: boolean;
  assigned_by?: string | null;
  warmup_notes?: string | null;
  cooldown_notes?: string | null;
  recovery_notes?: string | null;
};

type Template = {
  id: string;
  template_name: string;
  session_name: string | null;
  rpe: number;
  duration_minutes: number;
  notes: string | null;
};

type AnnualPlanOption = {
  id: string;
  plan_name: string;
  start_date: string;
  competition_date: string;
  biomotor_config: unknown;
  planned_loads: unknown;
};

export default function ProgramLatihan() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [athleteName, setAthleteName] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sessionName, setSessionName] = useState("");
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<number>(60);
  const [loadManual, setLoadManual] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [phaseNotes, setPhaseNotes] = useState<PhaseNotes>({ warmup: "", cooldown: "", recovery: "" });

  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // View session dialog
  const [viewSessionOpen, setViewSessionOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState<TrainingSession | null>(null);
  
  // New form dialog
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [selectedFormDate, setSelectedFormDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // Edit form dialog
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  
  // Bulk session dialog
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  
  // Show volume chart
  const [showVolumeChart, setShowVolumeChart] = useState(false);
  
  // Exercise type filter
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string>("all");

  // Body Map range (selalu tampil, bisa dipilih periode)
  const [bodyMapRange, setBodyMapRange] = useState<"today" | "week" | "month">("week");

  // Annual plan & weekly targets
  const [annualPlans, setAnnualPlans] = useState<AnnualPlanOption[]>([]);
  const [selectedAnnualPlanId, setSelectedAnnualPlanId] = useState<string>("");
  const [weeklyBiomotorTarget, setWeeklyBiomotorTarget] = useState<{
    planName: string;
    weekNumber: number;
    totalWeeks: number;
    volume: number;
    intensity: number;
    weeklyLoad: number;
    loadPerSession: number;
    estRpe: string;
    maxSessionsPerWeek: number;
    targets: { kekuatan: number; kecepatan: number; daya_tahan: number; teknik: number; taktik: number };
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedAthleteId) {
      fetchSessions(selectedAthleteId);
      fetchTemplates(selectedAthleteId);
      fetchAnnualPlans(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  useEffect(() => {
    if (selectedAthleteId) {
      fetchActiveBiomotorTargets(selectedAthleteId, selectedAnnualPlanId || undefined);
    }
  }, [selectedAthleteId, selectedAnnualPlanId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    
    // Check if user is coach
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();
    
    const userIsCoach = roleData?.role === 'coach';
    setIsCoach(userIsCoach);

    if (userIsCoach) {
      // Load only assigned athletes with accepted status
      const { data: assignments } = await supabase
        .from("coach_athletes")
        .select("athlete_id")
        .eq("coach_id", session.user.id)
        .eq("status", "accepted");

      if (assignments && assignments.length > 0) {
        const athleteIds = assignments.map(a => a.athlete_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, athlete_name")
          .in("id", athleteIds)
          .order("athlete_name");
        
        if (profilesData && profilesData.length > 0) {
          setAthletes(profilesData);
          setSelectedAthleteId(profilesData[0].id);
          setAthleteName(profilesData[0].athlete_name);
        }
      }
    } else {
      // Load own profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("athlete_name")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setAthleteName(profile.athlete_name);
      }
      
      setSelectedAthleteId(session.user.id);
    }
  };

  const fetchSessions = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: false });

      if (error) throw error;
      
      // Fetch exercises for all sessions
      if (data && data.length > 0) {
        const sessionIds = data.map(s => s.id);
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("session_exercises")
          .select("*")
          .in("session_id", sessionIds);
        
        if (exercisesError) throw exercisesError;
        
        // Map exercises to sessions
        const sessionsWithExercises = data.map(session => ({
          ...session,
          exercises: exercisesData?.filter(e => e.session_id === session.id) || []
        }));
        
        setSessions(sessionsWithExercises);
      } else {
        setSessions([]);
      }
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("training_templates")
        .select("*")
        .eq("user_id", uid)
        .order("template_name", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };
  const fetchAnnualPlans = async (athleteId: string) => {
    try {
      const { data, error } = await supabase
        .from("annual_plans")
        .select("id, plan_name, start_date, competition_date, biomotor_config, planned_loads")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnualPlans((data || []) as AnnualPlanOption[]);
      // Reset to most recent plan when athlete changes (or current id no longer valid)
      const ids = (data || []).map(d => d.id);
      if (data && data.length > 0 && !ids.includes(selectedAnnualPlanId)) {
        setSelectedAnnualPlanId(data[0].id);
      } else if (!data || data.length === 0) {
        setSelectedAnnualPlanId("");
      }
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const fetchActiveBiomotorTargets = async (athleteId: string, planId?: string) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      let query = supabase
        .from("annual_plans")
        .select("id, plan_name, start_date, competition_date, biomotor_config, planned_loads")
        .eq("athlete_id", athleteId);

      if (planId) {
        query = query.eq("id", planId);
      } else {
        query = query.lte("start_date", today).gte("competition_date", today);
      }

      const { data: plans, error } = await query
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !plans || plans.length === 0) {
        setWeeklyBiomotorTarget(null);
        return;
      }

      const plan = plans[0];
      const bc = plan.biomotor_config as any;
      if (!bc) { setWeeklyBiomotorTarget(null); return; }

      const { data: weeklyPlanData } = await supabase
        .from("weekly_plan_data")
        .select("week_number, planned_volume, planned_intensity, week_start_date")
        .eq("plan_id", plan.id)
        .order("week_number", { ascending: true });

      const planStart = new Date(plan.start_date);
      const nowDate = new Date();
      const daysDiff = Math.floor((nowDate.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
      const currentWeekNumber = Math.max(1, Math.floor(daysDiff / 7) + 1);

      const currentWeekData = weeklyPlanData?.find(w => w.week_number === currentWeekNumber);
      const volumePercent = (currentWeekData?.planned_volume ?? 70) / 100;
      const intensityPercent = (currentWeekData?.planned_intensity ?? 50) / 100;

      const totalDays = Math.floor((new Date(plan.competition_date).getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
      const totalWeeks = Math.ceil(totalDays / 7);

      // Load calculations
      const pl = plan.planned_loads as any;
      const sessionDuration = pl?.sessionDuration ?? 120;
      const maxSessions = pl?.maxSessionsPerWeek ?? 12;
      const sessionMaxLoad = 140 * (sessionDuration / 60);
      const maxWeeklyLoad = sessionMaxLoad * maxSessions;
      const weeklyLoad = Math.round(maxWeeklyLoad * volumePercent * intensityPercent);
      const loadPerSession = Math.round(weeklyLoad / maxSessions);

      // Fixed RPE conversion (duration-independent)
      const RPE_LOAD_MAP = [
        { rpe: 1, load: 20 }, { rpe: 2, load: 30 }, { rpe: 3, load: 40 },
        { rpe: 4, load: 50 }, { rpe: 5, load: 60 }, { rpe: 6, load: 70 },
        { rpe: 7, load: 80 }, { rpe: 8, load: 100 }, { rpe: 9, load: 120 },
        { rpe: 10, load: 140 },
      ];
      let estRpe = 1;
      for (const entry of RPE_LOAD_MAP) {
        if (loadPerSession >= entry.load) estRpe = entry.rpe;
      }
      const lowerEntry = RPE_LOAD_MAP.find(e => e.rpe === estRpe)!;
      const upperEntry = RPE_LOAD_MAP.find(e => e.rpe === estRpe + 1);
      let displayRpe = estRpe.toString();
      if (upperEntry && loadPerSession > lowerEntry.load) {
        const fraction = (loadPerSession - lowerEntry.load) / (upperEntry.load - lowerEntry.load);
        displayRpe = (estRpe + fraction).toFixed(1);
      }

      setWeeklyBiomotorTarget({
        planName: plan.plan_name,
        weekNumber: currentWeekNumber,
        totalWeeks,
        volume: Math.round(volumePercent * 100),
        intensity: Math.round(intensityPercent * 100),
        weeklyLoad,
        loadPerSession,
        estRpe: displayRpe,
        maxSessionsPerWeek: maxSessions,
        targets: {
          kekuatan: Math.round(volumePercent * (bc.kekuatan ?? 10000)),
          kecepatan: Math.round(volumePercent * (bc.kecepatan ?? 800)),
          daya_tahan: Math.round(volumePercent * (bc.dayaTahan ?? bc.daya_tahan ?? 20)),
          teknik: Math.round(volumePercent * (bc.teknik ?? 500)),
          taktik: Math.round(volumePercent * (bc.taktik ?? 200)),
        },
      });
    } catch (err) {
      console.error("Error fetching biomotor targets:", err);
      setWeeklyBiomotorTarget(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const session = sessions.find(s => s.id === event.active.id);
    setActiveSession(session || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSession(null);

    if (!over || !userId) return;

    const sessionId = active.id as string;
    const newDate = over.id as string;

    if (newDate === sessions.find(s => s.id === sessionId)?.date) return;

    try {
      const { error } = await supabase
        .from("training_sessions")
        .update({ date: newDate })
        .eq("id", sessionId);

      if (error) throw error;

      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId ? { ...s, date: newDate } : s
        )
      );

      toast.success("Sesi berhasil dipindahkan");
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      // Validate input data
      const validatedData = trainingSessionSchema.parse({
        date,
        session_name: sessionName || undefined,
        rpe,
        duration_minutes: duration,
        load_manual: loadManual,
        notes: notes || undefined,
      });

      const loadAuto = computeSessionLoad(validatedData.rpe, validatedData.duration_minutes);
      const loadFinal = validatedData.load_manual !== null ? validatedData.load_manual : loadAuto;

      // Insert training session
      const { data: sessionData, error: sessionError } = await supabase.from("training_sessions").insert({
        user_id: selectedAthleteId,
        athlete_name: athleteName,
        date: validatedData.date,
        session_name: validatedData.session_name || null,
        rpe: validatedData.rpe,
        duration_minutes: validatedData.duration_minutes,
        load_auto: loadAuto,
        load_manual: validatedData.load_manual,
        load_final: loadFinal,
        notes: validatedData.notes || null,
        // Track if coach assigned this session
        is_assigned: isCoach && selectedAthleteId !== userId,
        assigned_by: isCoach && selectedAthleteId !== userId ? userId : null,
        // Phase notes
        warmup_notes: phaseNotes.warmup || null,
        cooldown_notes: phaseNotes.cooldown || null,
        recovery_notes: phaseNotes.recovery || null,
      }).select().single();

      if (sessionError) throw sessionError;

      // Insert exercises if any
      if (exercises.length > 0 && sessionData) {
        const exercisesToInsert = exercises.map(ex => ({
          session_id: sessionData.id,
          exercise_name: ex.exercise_name,
          exercise_type: ex.exercise_type,
          exercise_phase: ex.exercise_phase || 'main',
          sets: ex.sets || null,
          reps: ex.reps || null,
          weight_kg: ex.weight_kg || null,
          distance_meters: ex.distance_meters || null,
          duration_seconds: ex.duration_seconds || null,
          repetitions: ex.repetitions || null,
          total_volume: ex.total_volume || null,
          notes: ex.notes || null,
        }));

        const { error: exercisesError } = await supabase
          .from("session_exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      toast.success("Sesi latihan berhasil ditambahkan");
      setOpen(false);
      resetForm();
      fetchSessions(selectedAthleteId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        handleError(error, getFriendlyErrorMessage(error));
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Sesi latihan berhasil dihapus");
      if (userId) fetchSessions(userId);
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!userId || !templateName.trim()) {
      toast.error("Nama template harus diisi");
      return;
    }

    try {
      // Validate template data
      const validatedData = templateSchema.parse({
        template_name: templateName,
        session_name: sessionName || undefined,
        rpe,
        duration_minutes: duration,
        notes: notes || undefined,
      });

      const { error } = await supabase.from("training_templates").insert({
        user_id: selectedAthleteId,
        template_name: validatedData.template_name,
        session_name: validatedData.session_name || null,
        rpe: validatedData.rpe,
        duration_minutes: validatedData.duration_minutes,
        notes: validatedData.notes || null,
      });

      if (error) throw error;

      toast.success("Template berhasil disimpan");
      setTemplateName("");
      fetchTemplates(selectedAthleteId!);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        handleError(error, getFriendlyErrorMessage(error));
      }
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setSessionName(template.session_name || "");
    setRpe(template.rpe);
    setDuration(template.duration_minutes);
    setNotes(template.notes || "");
    toast.success(`Template "${template.template_name}" dimuat`);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("training_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template berhasil dihapus");
      fetchTemplates(selectedAthleteId!);
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), "yyyy-MM-dd"));
    setSessionName("");
    setRpe(5);
    setDuration(60);
    setLoadManual(null);
    setNotes("");
    setSelectedTemplateId("");
    setExercises([]);
    setPhaseNotes({ warmup: "", cooldown: "", recovery: "" });
  };

  const handleViewSession = (session: TrainingSession) => {
    setViewingSession(session);
    setViewSessionOpen(true);
  };

  const handleOpenNewForm = (dateStr: string) => {
    setSelectedFormDate(dateStr);
    setNewFormOpen(true);
  };

  const handleNewFormSubmit = async (formData: SessionFormData) => {
    if (!userId) return;

    try {
      const loadAuto = computeSessionLoad(formData.rpe, formData.durationMinutes);
      const loadFinal = loadAuto;

      // Determine session name from session type
      const sessionNames: Record<string, string> = {
        rest: "Rest Day",
        strength: "Latihan Strength",
        cardio: "Latihan Cardio",
        skill: "Latihan Skill",
        speed: "Latihan Speed",
        technique: "Latihan Teknik",
        mixed: "Latihan Campuran",
      };

      // Count existing sessions on this date for auto-numbering
      const existingOnDate = sessions.filter(s => s.date === formData.date).length;
      const sessionNumber = existingOnDate + 1;
      const baseName = sessionNames[formData.sessionType] || "Latihan";
      const sessionName = `${baseName} - Sesi ${sessionNumber}`;

      // Insert training session
      const { data: sessionData, error: sessionError } = await supabase.from("training_sessions").insert({
        user_id: selectedAthleteId,
        athlete_name: athleteName,
        date: formData.date,
        session_name: sessionName,
        rpe: formData.rpe,
        duration_minutes: formData.durationMinutes,
        load_auto: loadAuto,
        load_manual: null,
        load_final: loadFinal,
        notes: formData.notes || null,
        is_assigned: isCoach && selectedAthleteId !== userId,
        assigned_by: isCoach && selectedAthleteId !== userId ? userId : null,
        warmup_notes: formData.warmupNotes || null,
        cooldown_notes: formData.cooldownNotes || null,
        recovery_notes: formData.recoveryNotes || null,
      }).select().single();

      if (sessionError) throw sessionError;

      // Insert main exercises if any
      if (formData.mainExercises.length > 0 && sessionData) {
        const exercisesToInsert = formData.mainExercises.map(ex => ({
          session_id: sessionData.id,
          exercise_name: ex.exercise_name,
          exercise_type: ex.exercise_type,
          exercise_phase: 'main',
          sets: ex.sets || null,
          reps: ex.reps || null,
          weight_kg: ex.exercise_type === 'strength' ? ex.weight_or_distance : null,
          distance_meters: (ex.exercise_type === 'endurance' || ex.exercise_type === 'speed') ? ex.weight_or_distance : null,
          repetitions: (ex.exercise_type === 'skill' || ex.exercise_type === 'technique' || ex.exercise_type === 'tactics') ? ex.weight_or_distance : null,
          total_volume: ex.exercise_type === 'strength' 
            ? (ex.sets || 0) * (ex.reps || 0) * (ex.weight_or_distance || 0)
            : ex.weight_or_distance || 0,
          notes: null,
        }));

        const { error: exercisesError } = await supabase
          .from("session_exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      toast.success("Sesi latihan berhasil ditambahkan");
      setNewFormOpen(false);
      fetchSessions(selectedAthleteId);
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const handleEditSession = (session: TrainingSession) => {
    setEditingSession(session);
    setEditFormOpen(true);
  };

  const handleEditFormSubmit = async (formData: SessionFormData) => {
    if (!userId || !editingSession) return;

    try {
      const loadAuto = computeSessionLoad(formData.rpe, formData.durationMinutes);
      const loadFinal = loadAuto;

      // Update training session
      const { error: sessionError } = await supabase
        .from("training_sessions")
        .update({
          session_name: formData.sessionType !== 'rest' ? `Latihan ${formData.sessionType.charAt(0).toUpperCase() + formData.sessionType.slice(1)}` : 'Rest Day',
          rpe: formData.rpe,
          duration_minutes: formData.durationMinutes,
          load_auto: loadAuto,
          load_final: loadFinal,
          notes: formData.notes || null,
          warmup_notes: formData.warmupNotes || null,
          cooldown_notes: formData.cooldownNotes || null,
          recovery_notes: formData.recoveryNotes || null,
        })
        .eq('id', editingSession.id);

      if (sessionError) throw sessionError;

      // Delete old exercises
      await supabase
        .from("session_exercises")
        .delete()
        .eq('session_id', editingSession.id);

      // Insert new exercises if any
      if (formData.mainExercises.length > 0) {
        const exercisesToInsert = formData.mainExercises.map(ex => ({
          session_id: editingSession.id,
          exercise_name: ex.exercise_name,
          exercise_type: ex.exercise_type,
          exercise_phase: 'main',
          sets: ex.sets || null,
          reps: ex.reps || null,
          weight_kg: ex.exercise_type === 'strength' ? ex.weight_or_distance : null,
          distance_meters: (ex.exercise_type === 'endurance' || ex.exercise_type === 'speed') ? ex.weight_or_distance : null,
          repetitions: (ex.exercise_type === 'skill' || ex.exercise_type === 'technique' || ex.exercise_type === 'tactics') ? ex.weight_or_distance : null,
          total_volume: ex.exercise_type === 'strength' 
            ? (ex.sets || 0) * (ex.reps || 0) * (ex.weight_or_distance || 0)
            : ex.weight_or_distance || 0,
          notes: null,
        }));

        const { error: exercisesError } = await supabase
          .from("session_exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      toast.success("Sesi latihan berhasil diperbarui");
      setEditFormOpen(false);
      setEditingSession(null);
      setViewSessionOpen(false);
      fetchSessions(selectedAthleteId);
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const handleBulkFormSubmit = async (formData: SessionFormData, selectedAthleteIds: string[], selectedDate: string) => {
    if (!userId || selectedAthleteIds.length === 0) return;

    try {
      const loadAuto = computeSessionLoad(formData.rpe, formData.durationMinutes);
      const loadFinal = loadAuto;

      const sessionNames: Record<string, string> = {
        rest: "Rest Day",
        strength: "Latihan Strength",
        cardio: "Latihan Cardio",
        skill: "Latihan Skill",
        speed: "Latihan Speed",
        technique: "Latihan Teknik",
        tactics: "Latihan Taktik",
        mixed: "Latihan Campuran",
      };

      // Create sessions for all selected athletes
      for (const athleteId of selectedAthleteIds) {
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) continue;

        // Insert training session
        const { data: sessionData, error: sessionError } = await supabase.from("training_sessions").insert({
          user_id: athleteId,
          athlete_name: athlete.athlete_name,
          date: selectedDate,
          session_name: sessionNames[formData.sessionType] || "Latihan",
          rpe: formData.rpe,
          duration_minutes: formData.durationMinutes,
          load_auto: loadAuto,
          load_manual: null,
          load_final: loadFinal,
          notes: formData.notes || null,
          is_assigned: true,
          assigned_by: userId,
          warmup_notes: formData.warmupNotes || null,
          cooldown_notes: formData.cooldownNotes || null,
          recovery_notes: formData.recoveryNotes || null,
        }).select().single();

        if (sessionError) throw sessionError;

        // Insert main exercises if any
        if (formData.mainExercises.length > 0 && sessionData) {
          const exercisesToInsert = formData.mainExercises.map(ex => ({
            session_id: sessionData.id,
            exercise_name: ex.exercise_name,
            exercise_type: ex.exercise_type,
            exercise_phase: 'main',
            sets: ex.sets || null,
            reps: ex.reps || null,
            weight_kg: ex.exercise_type === 'strength' ? ex.weight_or_distance : null,
            distance_meters: (ex.exercise_type === 'endurance' || ex.exercise_type === 'speed') ? ex.weight_or_distance : null,
            repetitions: (ex.exercise_type === 'skill' || ex.exercise_type === 'technique' || ex.exercise_type === 'tactics') ? ex.weight_or_distance : null,
            total_volume: ex.exercise_type === 'strength' 
              ? (ex.sets || 0) * (ex.reps || 0) * (ex.weight_or_distance || 0)
              : ex.weight_or_distance || 0,
            notes: null,
          }));

          const { error: exercisesError } = await supabase
            .from("session_exercises")
            .insert(exercisesToInsert);

          if (exercisesError) throw exercisesError;
        }
      }

      toast.success(`Program latihan berhasil dibuat untuk ${selectedAthleteIds.length} atlet`);
      setBulkFormOpen(false);
      fetchSessions(selectedAthleteId);
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const getEditFormInitialData = (session: TrainingSession): Partial<SessionFormData> => {
    return {
      sessionType: session.session_name?.toLowerCase().includes('strength') ? 'strength' :
                   session.session_name?.toLowerCase().includes('endurance') ? 'endurance' :
                   session.session_name?.toLowerCase().includes('cardio') ? 'endurance' :
                   session.session_name?.toLowerCase().includes('speed') ? 'speed' :
                   session.session_name?.toLowerCase().includes('skill') ? 'skill' :
                   session.session_name?.toLowerCase().includes('teknik') ? 'technique' :
                   session.session_name?.toLowerCase().includes('taktik') ? 'tactics' :
                   session.session_name?.toLowerCase().includes('rest') ? 'rest' : 'mixed',
      warmupNotes: session.warmup_notes || "",
      cooldownNotes: session.cooldown_notes || "",
      recoveryNotes: session.recovery_notes || "",
      durationMinutes: session.duration_minutes || 60,
      rpe: session.rpe || 5,
      notes: session.notes || "",
      mainExercises: session.exercises?.map(ex => ({
        id: ex.id,
        exercise_name: ex.exercise_name,
        exercise_type: (ex.exercise_type === 'cardio' ? 'endurance' : ex.exercise_type) as ExerciseType,
        sets: ex.sets || undefined,
        reps: ex.reps || undefined,
        weight_or_distance: ex.weight_kg || ex.distance_meters || ex.repetitions || undefined,
      })) || [],
    };
  };

  const handleToggleExerciseComplete = async (exerciseId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from("session_exercises")
        .update({
          is_completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null
        })
        .eq("id", exerciseId);

      if (error) throw error;

      // Update local state
      if (viewingSession) {
        const updatedExercises = viewingSession.exercises?.map(ex =>
          ex.id === exerciseId ? { ...ex, is_completed: newStatus, completed_at: newStatus ? new Date().toISOString() : null } : ex
        );
        setViewingSession({ ...viewingSession, exercises: updatedExercises });
        
        // Also update in sessions list
        setSessions(prev => prev.map(s =>
          s.id === viewingSession.id ? { ...s, exercises: updatedExercises } : s
        ));
      }

      toast.success(newStatus ? "Latihan ditandai selesai" : "Status latihan dibatalkan");
    } catch (error: any) {
      handleError(error, getFriendlyErrorMessage(error));
    }
  };

  const getSessionCompletionStatus = (session: TrainingSession) => {
    if (!session.exercises || session.exercises.length === 0) return null;
    const completed = session.exercises.filter(e => e.is_completed).length;
    const total = session.exercises.length;
    return { completed, total, isComplete: completed === total };
  };

  const getExerciseSummary = (session: TrainingSession) => {
    if (!session.exercises || session.exercises.length === 0) return null;
    
    const strengthTotal = session.exercises
      .filter(e => e.exercise_type === "strength")
      .reduce((sum, e) => sum + ((e.sets || 0) * (e.reps || 0) * (e.weight_kg || 0)), 0);
    
    const cardioTotal = session.exercises
      .filter(e => e.exercise_type === "cardio" || e.exercise_type === "endurance")
      .reduce((sum, e) => sum + (e.distance_meters || 0), 0);
    
    const speedTotal = session.exercises
      .filter(e => e.exercise_type === "speed")
      .reduce((sum, e) => sum + (e.distance_meters || 0), 0);
    
    const skillTotal = session.exercises
      .filter(e => e.exercise_type === "skill")
      .reduce((sum, e) => sum + (e.repetitions || 0), 0);
    
    const techniqueTotal = session.exercises
      .filter(e => e.exercise_type === "technique")
      .reduce((sum, e) => sum + (e.repetitions || 0), 0);

    const tacticsTotal = session.exercises
      .filter(e => e.exercise_type === "tactics")
      .reduce((sum, e) => sum + (e.repetitions || 0), 0);
    
    return { strengthTotal, cardioTotal, speedTotal, skillTotal, techniqueTotal, tacticsTotal };
  };

  const renderExercisesByType = (exercises: SessionExercise[], type: string, label: string, Icon: any, color: string) => {
    const filtered = exercises.filter(e => e.exercise_type === type);
    if (filtered.length === 0) return null;
    
    const colorClasses: Record<string, { text: string; bg: string; border: string }> = {
      blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
      green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
      yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
      orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
      pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
      purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    };
    const c = colorClasses[color] || colorClasses.blue;

    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-sm font-medium ${c.text}`}>
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className="space-y-2">
          {filtered.map((ex) => (
            <div 
              key={ex.id} 
              className={`p-2 rounded-lg flex items-start gap-3 ${
                ex.is_completed ? 'bg-green-500/20 border border-green-500/50' : `${c.bg} border ${c.border}`
              }`}
            >
              <button
                onClick={() => handleToggleExerciseComplete(ex.id, ex.is_completed || false)}
                className="mt-0.5 flex-shrink-0"
              >
                {ex.is_completed ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className={`w-5 h-5 text-muted-foreground hover:${c.text} transition-colors`} />
                )}
              </button>
              <div className="flex-1">
                <div className={`font-medium ${ex.is_completed ? 'text-green-300 line-through' : 'text-foreground'}`}>
                  {ex.exercise_name}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  {type === 'strength' && (
                    <>
                      <span>{ex.sets} set × {ex.reps} rep</span>
                      <span>{ex.weight_kg} kg</span>
                    </>
                  )}
                  {(type === 'cardio' || type === 'endurance' || type === 'speed') && (
                    <span>Jarak: {(ex.distance_meters || 0) >= 1000 ? `${((ex.distance_meters || 0)/1000).toFixed(2)} km` : `${ex.distance_meters} m`}</span>
                  )}
                  {(type === 'skill' || type === 'technique' || type === 'tactics') && (
                    <span>Repetisi: <span className={`${c.text} font-semibold`}>{ex.repetitions}</span></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      warmup: "Warm Up",
      main: "Inti",
      cooldown: "Cooling Down",
      recovery: "Recovery"
    };
    return labels[phase] || "Inti";
  };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      warmup: "bg-amber-500/20 border-amber-500/50 text-amber-400",
      main: "bg-primary/20 border-primary/50 text-primary",
      cooldown: "bg-cyan-500/20 border-cyan-500/50 text-cyan-400",
      recovery: "bg-purple-500/20 border-purple-500/50 text-purple-400"
    };
    return colors[phase] || colors.main;
  };

  const getMonthDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get the start of the first week (may include days from previous month)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    // Get the end of the last week (may include days from next month)
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const getSessionsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const daySessions = sessions.filter(s => s.date === dayStr);
    
    // Apply exercise type filter
    if (exerciseTypeFilter === "all") {
      return daySessions;
    }
    
    return daySessions.filter(session => {
      if (!session.exercises || session.exercises.length === 0) return false;
      return session.exercises.some(ex => {
        if (exerciseTypeFilter === "strength") return ex.exercise_type === "strength";
        if (exerciseTypeFilter === "endurance") return ex.exercise_type === "cardio" || ex.exercise_type === "endurance";
        if (exerciseTypeFilter === "sprint") return ex.exercise_type === "speed";
        if (exerciseTypeFilter === "teknik") return ex.exercise_type === "technique";
        if (exerciseTypeFilter === "taktik") return ex.exercise_type === "tactics";
        return false;
      });
    });
  };

  const getMonthlyMetrics = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= monthStart && sessionDate <= monthEnd;
    });

    const totalLoad = monthSessions.reduce((sum, s) => sum + s.load_final, 0);
    const totalDuration = monthSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const avgRPE = monthSessions.length > 0 
      ? Math.round(monthSessions.reduce((sum, s) => sum + (s.rpe || 0), 0) / monthSessions.length * 10) / 10
      : 0;

    // Calculate volume from exercises
    let totalStrengthVolume = 0;
    let totalEnduranceDistance = 0;
    let totalSprintDistance = 0;
    let totalTeknikReps = 0;
    let totalTaktikReps = 0;

    monthSessions.forEach(session => {
      if (session.exercises) {
        session.exercises.forEach(ex => {
          if (ex.exercise_type === 'strength') {
            totalStrengthVolume += (ex.sets || 0) * (ex.reps || 0) * (ex.weight_kg || 0);
          } else if (ex.exercise_type === 'cardio' || ex.exercise_type === 'endurance') {
            totalEnduranceDistance += ex.distance_meters || 0;
          } else if (ex.exercise_type === 'speed') {
            totalSprintDistance += ex.distance_meters || 0;
          } else if (ex.exercise_type === 'technique') {
            totalTeknikReps += ex.repetitions || 0;
          } else if (ex.exercise_type === 'tactics') {
            totalTaktikReps += ex.repetitions || 0;
          }
        });
      }
    });

    return { 
      totalLoad, 
      totalDuration, 
      avgRPE, 
      sessionCount: monthSessions.length,
      totalStrengthVolume,
      totalEnduranceDistance,
      totalSprintDistance,
      totalTeknikReps,
      totalTaktikReps
    };
  };

  const getBodyMapExercises = () => {
    const today = new Date();
    let startDate: Date;
    if (bodyMapRange === "today") {
      startDate = today;
    } else if (bodyMapRange === "week") {
      startDate = startOfWeek(today, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(currentMonth);
    }
    const endDate = bodyMapRange === "month" ? endOfMonth(currentMonth) : today;
    return sessions
      .filter(s => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      })
      .flatMap(s => s.exercises || []);
  };
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(startOfMonth(new Date()));
  };

  const getRPEColor = (rpe: number) => {
    if (rpe <= 3) return "bg-green-500";
    if (rpe <= 5) return "bg-yellow-500";
    if (rpe <= 7) return "bg-orange-500";
    return "bg-red-500";
  };

  const currentLoadAuto = computeSessionLoad(rpe, duration);
  const monthlyMetrics = getMonthlyMetrics();
  const monthDays = getMonthDays();
  const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background pb-bottom-nav">
        <Navigation />
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Athlete selector for coaches */}
              {isCoach && athletes.length > 0 && (
                <Select value={selectedAthleteId} onValueChange={(val) => {
                  setSelectedAthleteId(val);
                  const athlete = athletes.find(a => a.id === val);
                  if (athlete) setAthleteName(athlete.athlete_name);
                }}>
                  <SelectTrigger className="w-48 bg-card border-border">
                    <SelectValue placeholder="Pilih atlet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.map((athlete) => (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        {athlete.athlete_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Annual Plan selector — useful when athlete has multiple plans */}
              {annualPlans.length > 0 && (
                <Select value={selectedAnnualPlanId} onValueChange={setSelectedAnnualPlanId}>
                  <SelectTrigger className="w-56 bg-card border-border">
                    <SelectValue placeholder="Pilih Annual Plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {annualPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.plan_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={format(currentMonth, "yyyy-MM")} onValueChange={(val) => {
                const [year, month] = val.split('-');
                setCurrentMonth(startOfMonth(new Date(parseInt(year), parseInt(month) - 1, 1)));
              }}>
                <SelectTrigger className="w-40 bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = addMonths(new Date(), -6 + i);
                    return (
                      <SelectItem key={i} value={format(date, "yyyy-MM")}>
                        {format(date, "MMMM yyyy", { locale: localeId })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="h-8">
                  Bulan Ini
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Bulk Session Button - Only for coaches */}
              {isCoach && athletes.length > 1 && (
                <Dialog open={bulkFormOpen} onOpenChange={setBulkFormOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Multi-Atlet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>Buat Program untuk Beberapa Atlet</DialogTitle>
                      <DialogDescription>
                        Pilih atlet yang akan mendapatkan program latihan yang sama
                      </DialogDescription>
                    </DialogHeader>
                    <BulkSessionForm
                      athletes={athletes}
                      onSubmit={handleBulkFormSubmit}
                      onCancel={() => setBulkFormOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
              
              {isCoach && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        const today = format(new Date(), "yyyy-MM-dd");
                        const todaySessions = sessions.filter(s => s.date === today);
                        exportDailyProgramToPDF(today, todaySessions as any, athleteName || "Atlet");
                        toast.success("PDF harian berhasil diunduh");
                      } catch (err: any) {
                        console.error("PDF harian failed:", err);
                        toast.error(`Gagal unduh PDF harian: ${err?.message || err}`);
                      }
                    }}
                    title="Download program latihan hari ini"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Harian
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        const ref = new Date();
                        const ws = startOfWeek(ref, { weekStartsOn: 1 });
                        const we = endOfWeek(ref, { weekStartsOn: 1 });
                        const wsStr = format(ws, "yyyy-MM-dd");
                        const weStr = format(we, "yyyy-MM-dd");
                        const weekSessions = sessions.filter(s => s.date >= wsStr && s.date <= weStr);
                        exportWeeklyProgramToPDF(wsStr, weStr, weekSessions as any, athleteName || "Atlet");
                        toast.success("PDF mingguan berhasil diunduh");
                      } catch (err: any) {
                        console.error("PDF mingguan failed:", err);
                        toast.error(`Gagal unduh PDF mingguan: ${err?.message || err}`);
                      }
                    }}
                    title="Download program latihan minggu ini"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Mingguan
                  </Button>
                </>
              )}

              <Button
                variant={showVolumeChart ? "default" : "outline"}
                onClick={() => setShowVolumeChart(!showVolumeChart)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Grafik
              </Button>
              
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Template Sesi Latihan</DialogTitle>
                    <DialogDescription>
                      Kelola template sesi latihan untuk input cepat
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {templates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Belum ada template. Buat template dari form tambah sesi.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {templates.map((template) => (
                          <Card key={template.id} className="bg-background border-border">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-foreground">{template.template_name}</h4>
                                  <p className="text-sm text-muted-foreground">{template.session_name || "Tanpa nama"}</p>
                                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                    <span>RPE: {template.rpe}</span>
                                    <span>Durasi: {template.duration_minutes}m</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Sesi
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tambah Sesi Latihan</DialogTitle>
                    <DialogDescription>
                      Isi detail sesi latihan. Load akan dihitung otomatis berdasarkan RPE dan durasi.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Load Template */}
                    {templates.length > 0 && (
                      <div className="space-y-2">
                        <Label>Muat dari Template</Label>
                        <Select value={selectedTemplateId} onValueChange={(val) => {
                          setSelectedTemplateId(val);
                          handleLoadTemplate(val);
                        }}>
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue placeholder="Pilih template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.template_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="date">Tanggal</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session-name">Nama Sesi</Label>
                      <Input
                        id="session-name"
                        placeholder="Contoh: Latihan Endurance"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rpe">RPE (1-10)</Label>
                        <Input
                          id="rpe"
                          type="number"
                          min="1"
                          max="10"
                          value={rpe}
                          onChange={(e) => setRpe(Number(e.target.value))}
                          required
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Durasi (menit)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          required
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">
                        Load otomatis: <span className="font-bold text-foreground">{currentLoadAuto} AU</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="load-manual">Load Manual (opsional)</Label>
                      <Input
                        id="load-manual"
                        type="number"
                        placeholder="Kosongkan untuk gunakan load otomatis"
                        value={loadManual || ""}
                        onChange={(e) =>
                          setLoadManual(e.target.value ? Number(e.target.value) : null)
                        }
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Catatan</Label>
                      <Textarea
                        id="notes"
                        placeholder="Catatan tambahan..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="bg-background border-border"
                      />
                    </div>

                    {/* Exercise Details */}
                    <div className="border-t border-border pt-4">
                      <ExerciseForm exercises={exercises} onChange={setExercises} phaseNotes={phaseNotes} onPhaseNotesChange={setPhaseNotes} />
                    </div>

                    {/* Save as Template */}
                    <div className="border-t border-border pt-4 space-y-2">
                      <Label htmlFor="template-name">Simpan sebagai Template (opsional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="template-name"
                          placeholder="Nama template..."
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="bg-background border-border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveAsTemplate}
                          disabled={!templateName.trim()}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      Simpan Sesi
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Monthly Summary */}
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground">{format(currentMonth, "MMMM yyyy", { locale: localeId })}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Load <span className="text-xl font-bold text-primary">{monthlyMetrics.totalLoad}</span></div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Durasi</div>
                  <div className="text-xl font-bold text-foreground">{Math.floor(monthlyMetrics.totalDuration / 60)}j {monthlyMetrics.totalDuration % 60}m</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Avg RPE</div>
                  <div className="text-xl font-bold text-foreground">{monthlyMetrics.avgRPE}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Sesi</div>
                  <div className="text-xl font-bold text-foreground">{monthlyMetrics.sessionCount}</div>
                </div>

                {/* Comprehensive Volume Metrics */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-blue-400">
                    <Dumbbell className="w-3 h-3" />
                    <span>Strength</span>
                  </div>
                  <div className="text-xl font-bold text-blue-400">
                    {monthlyMetrics.totalStrengthVolume >= 1000 
                      ? `${(monthlyMetrics.totalStrengthVolume / 1000).toFixed(1)}k` 
                      : monthlyMetrics.totalStrengthVolume} kg
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <Footprints className="w-3 h-3" />
                    <span>Endurance</span>
                  </div>
                  <div className="text-xl font-bold text-green-400">
                    {monthlyMetrics.totalEnduranceDistance >= 1000 
                      ? `${(monthlyMetrics.totalEnduranceDistance / 1000).toFixed(1)} km` 
                      : `${monthlyMetrics.totalEnduranceDistance} m`}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-yellow-400">
                    <Zap className="w-3 h-3" />
                    <span>Sprint</span>
                  </div>
                  <div className="text-xl font-bold text-yellow-400">
                    {monthlyMetrics.totalSprintDistance} m
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-pink-400">
                    <Crosshair className="w-3 h-3" />
                    <span>Teknik</span>
                  </div>
                  <div className="text-xl font-bold text-pink-400">
                    {monthlyMetrics.totalTeknikReps} repetisi
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-purple-400">
                    <Target className="w-3 h-3" />
                    <span>Taktik</span>
                  </div>
                  <div className="text-xl font-bold text-purple-400">
                    {monthlyMetrics.totalTaktikReps} repetisi
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Volume Chart */}
          {showVolumeChart && (
            <div className="mb-6">
              <WeeklyVolumeChart sessions={sessions} />
            </div>
          )}

          {/* Body Map — hanya tampilkan latihan hari ini */}
          <BodyMapSection exercises={sessions.filter(s => s.date === format(new Date(), "yyyy-MM-dd")).flatMap(s => s.exercises || [])} />

          {/* Weekly Target from Annual Plan */}
          {weeklyBiomotorTarget && (
            <Card className="mb-6 border-primary/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Target Minggu {weeklyBiomotorTarget.weekNumber}/{weeklyBiomotorTarget.totalWeeks}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {weeklyBiomotorTarget.planName} • Vol {weeklyBiomotorTarget.volume}% • Int {weeklyBiomotorTarget.intensity}%
                  </span>
                </div>

                {/* Weekly Load & RPE Target */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-center">
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Weekly Load</div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{weeklyBiomotorTarget.weeklyLoad.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">TSS</div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Load/Sesi</div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{weeklyBiomotorTarget.loadPerSession}</div>
                    <div className="text-[9px] text-muted-foreground">TSS ({weeklyBiomotorTarget.maxSessionsPerWeek} sesi)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center">
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Target RPE</div>
                    <div className="text-sm font-bold text-rose-700 dark:text-rose-300">{weeklyBiomotorTarget.estRpe}</div>
                    <div className="text-[9px] text-muted-foreground">per sesi</div>
                  </div>
                </div>

                {/* Biomotor Targets */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-center">
                    <div className="text-[10px] text-red-600 dark:text-red-400 font-medium">Kekuatan</div>
                    <div className="text-sm font-bold text-red-700 dark:text-red-300">{weeklyBiomotorTarget.targets.kekuatan.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">kg/reps</div>
                  </div>
                  <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 text-center">
                    <div className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">Kecepatan</div>
                    <div className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{weeklyBiomotorTarget.targets.kecepatan.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">meter</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-center">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">D.Tahan</div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{weeklyBiomotorTarget.targets.daya_tahan}</div>
                    <div className="text-[9px] text-muted-foreground">km</div>
                  </div>
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-center">
                    <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">Teknik</div>
                    <div className="text-sm font-bold text-green-700 dark:text-green-300">{weeklyBiomotorTarget.targets.teknik}</div>
                    <div className="text-[9px] text-muted-foreground">reps</div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-center">
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Taktik</div>
                    <div className="text-sm font-bold text-purple-700 dark:text-purple-300">{weeklyBiomotorTarget.targets.taktik}</div>
                    <div className="text-[9px] text-muted-foreground">reps/sets</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Training Recommendations based on VCr and 1RM */}
          {weeklyBiomotorTarget && selectedAthleteId && (
            <div className="mb-6">
              <TrainingRecommendationCard
                athleteId={selectedAthleteId}
                weekIntensityPercent={weeklyBiomotorTarget.intensity}
                weekVolumePercent={weeklyBiomotorTarget.volume}
              />
            </div>
          )}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Filter Bar */}
            <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={exerciseTypeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExerciseTypeFilter("all")}
                  className="h-7 text-xs"
                >
                  Semua
                </Button>
                <Button
                  variant={exerciseTypeFilter === "strength" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExerciseTypeFilter("strength")}
                  className={`h-7 text-xs ${exerciseTypeFilter === "strength" ? "bg-blue-600 hover:bg-blue-700" : "text-blue-400 border-blue-400/50 hover:bg-blue-400/10"}`}
                >
                  <Dumbbell className="w-3 h-3 mr-1" />
                  Strength
                </Button>
                <Button
                  variant={exerciseTypeFilter === "endurance" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExerciseTypeFilter("endurance")}
                  className={`h-7 text-xs ${exerciseTypeFilter === "endurance" ? "bg-green-600 hover:bg-green-700" : "text-green-400 border-green-400/50 hover:bg-green-400/10"}`}
                >
                  <Footprints className="w-3 h-3 mr-1" />
                  Endurance
                </Button>
                <Button
                  variant={exerciseTypeFilter === "sprint" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExerciseTypeFilter("sprint")}
                  className={`h-7 text-xs ${exerciseTypeFilter === "sprint" ? "bg-yellow-600 hover:bg-yellow-700" : "text-yellow-400 border-yellow-400/50 hover:bg-yellow-400/10"}`}
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Sprint
                </Button>
                <Button
                  variant={exerciseTypeFilter === "teknik" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExerciseTypeFilter("teknik")}
                  className={`h-7 text-xs ${exerciseTypeFilter === "teknik" ? "bg-pink-600 hover:bg-pink-700" : "text-pink-400 border-pink-400/50 hover:bg-pink-400/10"}`}
                >
                  <Crosshair className="w-3 h-3 mr-1" />
                  Teknik
                </Button>
                <Button
                  variant={exerciseTypeFilter === "taktik" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExerciseTypeFilter("taktik")}
                  className={`h-7 text-xs ${exerciseTypeFilter === "taktik" ? "bg-purple-600 hover:bg-purple-700" : "text-purple-400 border-purple-400/50 hover:bg-purple-400/10"}`}
                >
                  <Target className="w-3 h-3 mr-1" />
                  Taktik
                </Button>
              </div>
            </div>
            
            {/* Week Day Headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {weekDayNames.map((dayName, idx) => (
                <div key={idx} className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/50">
                  {dayName}
                </div>
              ))}
            </div>
            
            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7">
              {monthDays.map((day, idx) => {
                const daySessions = getSessionsForDay(day);
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const dayId = format(day, "yyyy-MM-dd");
                const isCurrentMonth = format(day, "MM") === format(currentMonth, "MM");
                
                return (
                  <Droppable key={idx} id={dayId}>
                    <div
                      className={`min-h-[120px] border-b border-r border-border cursor-pointer hover:bg-primary/5 transition-colors ${!isCurrentMonth ? 'bg-muted/30' : ''}`}
                      onClick={(e) => {
                        // Only open new form if clicking the cell itself (not a session inside)
                        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.daycell === "1") {
                          handleOpenNewForm(dayId);
                        }
                      }}
                      data-daycell="1"
                    >
                      {/* Day Header */}
                      <div
                        className={`p-2 flex items-center justify-between ${isToday ? 'bg-primary/10' : ''}`}
                        data-daycell="1"
                        title="Klik untuk menambah sesi"
                      >
                        <span className={`text-sm font-semibold ${isToday ? 'text-primary bg-primary/20 px-2 py-0.5 rounded-full' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}`} data-daycell="1">
                          {format(day, "d")}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); handleOpenNewForm(dayId); }}
                          title="Tambah sesi baru"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      {/* Sessions */}
                      <div className="px-1 pb-1 space-y-1 max-h-[150px] overflow-y-auto">
                        {daySessions.map((session) => (
                          <Draggable key={session.id} id={session.id}>
                            <div 
                              className={`group relative p-1.5 rounded text-xs cursor-grab active:cursor-grabbing ${getRPEColor(session.rpe || 5)} bg-opacity-20 border border-border hover:border-muted-foreground`}
                              onClick={() => handleViewSession(session)}
                            >
                              <div className="flex items-center gap-1">
                                <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                <Activity className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium text-foreground truncate flex-1">
                                  {session.session_name || "Latihan"}
                                </span>
                                <span className="text-muted-foreground">{session.duration_minutes}m</span>
                              </div>
                              
                              {/* Quick metrics */}
                              <div className="flex items-center gap-2 mt-1 pl-4">
                                <span className="text-muted-foreground">RPE {session.rpe}</span>
                                <span className="text-primary font-semibold">{session.load_final} AU</span>
                              </div>

                              {/* Exercise indicators */}
                              {session.exercises && session.exercises.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 pl-4">
                                  {(() => {
                                    const summary = getExerciseSummary(session);
                                    const completionStatus = getSessionCompletionStatus(session);
                                    return (
                                      <>
                                        {completionStatus && (
                                          <div className={`flex items-center gap-0.5 ${completionStatus.isComplete ? 'text-green-400' : 'text-muted-foreground'}`}>
                                            {completionStatus.isComplete ? (
                                              <CheckCircle className="w-3 h-3" />
                                            ) : (
                                              <span className="text-[10px]">{completionStatus.completed}/{completionStatus.total}</span>
                                            )}
                                          </div>
                                        )}
                                        {summary && summary.strengthTotal > 0 && (
                                          <div className="flex items-center gap-0.5 text-blue-400">
                                            <Dumbbell className="w-3 h-3" />
                                          </div>
                                        )}
                                        {summary && summary.cardioTotal > 0 && (
                                          <div className="flex items-center gap-0.5 text-green-400">
                                            <Footprints className="w-3 h-3" />
                                          </div>
                                        )}
                                        {summary && summary.skillTotal > 0 && (
                                          <div className="flex items-center gap-0.5 text-orange-400">
                                            <Target className="w-3 h-3" />
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {/* Delete button on hover */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(session.id);
                                }}
                                className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </Button>
                            </div>
                          </Draggable>
                        ))}
                      </div>
                    </div>
                  </Droppable>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeSession ? (
          <Card className="bg-card border-border opacity-80 w-48">
            <CardContent className="p-3">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-foreground ${getRPEColor(activeSession.rpe || 5)}`}>
                <Activity className="w-3 h-3" />
                {activeSession.duration_minutes}m
              </div>
              <div className="text-sm font-medium text-foreground mt-2">
                {activeSession.session_name || "Latihan"}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

      {/* View Session Detail Dialog */}
      <Dialog open={viewSessionOpen} onOpenChange={setViewSessionOpen}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingSession?.session_name || "Detail Sesi Latihan"}</DialogTitle>
            <DialogDescription>
              {viewingSession && format(new Date(viewingSession.date), "EEEE, dd MMMM yyyy", { locale: localeId })}
            </DialogDescription>
          </DialogHeader>
          
          {viewingSession && (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEditSession(viewingSession)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Sesi
                </Button>
                {viewingSession.exercises && viewingSession.exercises.length > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => exportSessionDetailToPDF(viewingSession, athleteName)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                )}
              </div>
              
              {/* Session Metrics */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-background rounded-lg border border-border">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Durasi</div>
                  <div className="font-semibold text-foreground">{viewingSession.duration_minutes} menit</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">RPE</div>
                  <div className={`font-semibold ${viewingSession.rpe && viewingSession.rpe >= 8 ? 'text-red-400' : viewingSession.rpe && viewingSession.rpe >= 6 ? 'text-orange-400' : 'text-green-400'}`}>
                    {viewingSession.rpe}/10
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Load</div>
                  <div className="font-semibold text-primary">{viewingSession.load_final} AU</div>
                </div>
              </div>

              {/* Completion Progress */}
              {(() => {
                const status = getSessionCompletionStatus(viewingSession);
                if (!status) return null;
                return (
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Progress Latihan</span>
                      <span className={`text-sm font-semibold ${status.isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                        {status.completed}/{status.total} selesai
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${status.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${(status.completed / status.total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Warm Up Section */}
              {viewingSession.warmup_notes && (
                <div className="p-3 rounded-lg border bg-amber-500/20 border-amber-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase">🔥 Warm Up</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line">{viewingSession.warmup_notes}</p>
                </div>
              )}

              {/* Main/Inti Exercise Details */}
              {viewingSession.exercises && viewingSession.exercises.length > 0 && (
                <div className="space-y-3 p-3 rounded-lg border bg-primary/20 border-primary/50">
                  <h4 className="font-semibold text-primary">💪 Main Set ({viewingSession.exercises.length} latihan)</h4>
                  <p className="text-xs text-muted-foreground">Klik tombol untuk menandai latihan yang sudah selesai</p>
                  
                  {/* Render exercises by type */}
                  {renderExercisesByType(viewingSession.exercises, "strength", "Strength", Dumbbell, "blue")}
                  {renderExercisesByType(viewingSession.exercises, "endurance", "Endurance", Footprints, "green")}
                  {renderExercisesByType(viewingSession.exercises, "cardio", "Cardio", Footprints, "green")}
                  {renderExercisesByType(viewingSession.exercises, "speed", "Speed", Zap, "yellow")}
                  {renderExercisesByType(viewingSession.exercises, "skill", "Skill", Target, "orange")}
                  {renderExercisesByType(viewingSession.exercises, "technique", "Teknik", Crosshair, "pink")}
                  {renderExercisesByType(viewingSession.exercises, "tactics", "Taktik", Target, "purple")}

                  {/* Total Summary */}
                  {(() => {
                    const summary = getExerciseSummary(viewingSession);
                    if (!summary) return null;
                    return (
                      <div className="p-3 bg-background rounded-lg border border-border">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">Total Volume Sesi</div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          {summary.strengthTotal > 0 && (
                            <div>
                              <span className="text-muted-foreground">Strength:</span>
                              <span className="ml-1 font-bold text-blue-400">{summary.strengthTotal.toLocaleString()} kg</span>
                            </div>
                          )}
                          {summary.cardioTotal > 0 && (
                            <div>
                              <span className="text-muted-foreground">Endurance:</span>
                              <span className="ml-1 font-bold text-green-400">{(summary.cardioTotal / 1000).toFixed(2)} km</span>
                            </div>
                          )}
                          {summary.skillTotal > 0 && (
                            <div>
                              <span className="text-muted-foreground">Skill:</span>
                              <span className="ml-1 font-bold text-orange-400">{summary.skillTotal} rep</span>
                            </div>
                          )}
                          {summary.speedTotal > 0 && (
                            <div>
                              <span className="text-muted-foreground">Speed:</span>
                              <span className="ml-1 font-bold text-yellow-400">{summary.speedTotal} m</span>
                            </div>
                          )}
                          {summary.techniqueTotal > 0 && (
                            <div>
                              <span className="text-muted-foreground">Teknik:</span>
                              <span className="ml-1 font-bold text-pink-400">{summary.techniqueTotal} rep</span>
                            </div>
                          )}
                          {summary.tacticsTotal > 0 && (
                            <div>
                              <span className="text-muted-foreground">Taktik:</span>
                              <span className="ml-1 font-bold text-purple-400">{summary.tacticsTotal} rep</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Cooling Down Section */}
              {viewingSession.cooldown_notes && (
                <div className="p-3 rounded-lg border bg-cyan-500/20 border-cyan-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-cyan-400 uppercase">❄️ Cooling Down</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line">{viewingSession.cooldown_notes}</p>
                </div>
              )}

              {/* Recovery & Notes Section */}
              {viewingSession.recovery_notes && (
                <div className="p-3 rounded-lg border bg-emerald-500/20 border-emerald-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase">✨ Recovery & Notes</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line">{viewingSession.recovery_notes}</p>
                </div>
              )}

              {/* Additional Notes */}
              {viewingSession.notes && (
                <div className="p-3 bg-background rounded-lg border border-border">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Catatan Tambahan</div>
                  <p className="text-sm text-foreground">{viewingSession.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Training Session Form Dialog */}
      <Dialog open={newFormOpen} onOpenChange={setNewFormOpen}>
        <DialogContent className="max-w-2xl bg-background border-border max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <TrainingSessionForm
            selectedDate={selectedFormDate}
            onSubmit={handleNewFormSubmit}
            onCancel={() => setNewFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Training Session Form Dialog */}
      <Dialog open={editFormOpen} onOpenChange={setEditFormOpen}>
        <DialogContent className="max-w-2xl bg-background border-border max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          {editingSession && (
            <TrainingSessionForm
              selectedDate={editingSession.date}
              initialData={getEditFormInitialData(editingSession)}
              onSubmit={handleEditFormSubmit}
              onCancel={() => {
                setEditFormOpen(false);
                setEditingSession(null);
              }}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
      <BottomNavigation />
    </DndContext>
  );
}
