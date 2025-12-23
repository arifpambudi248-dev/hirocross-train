import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
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
import { format, subDays, startOfWeek, endOfWeek, addWeeks, addDays, eachDayOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Trash2, ChevronLeft, ChevronRight, Activity, Save, Bookmark, GripVertical, Eye, Dumbbell, Footprints, Target, FileText, BarChart3, CheckCircle, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { Droppable } from "@/components/Droppable";
import { Draggable } from "@/components/Draggable";
import { trainingSessionSchema, templateSchema } from "@/lib/validationSchemas";
import { handleError, getFriendlyErrorMessage } from "@/lib/errorHandling";
import { z } from "zod";
import { ExerciseForm, Exercise, ExerciseType } from "@/components/ExerciseForm";
import { WeeklyVolumeChart } from "@/components/WeeklyVolumeChart";
import { exportSessionDetailToPDF } from "@/lib/exportUtils";

type SessionExercise = {
  id: string;
  session_id: string;
  exercise_name: string;
  exercise_type: string;
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
  // Comprehensive volume columns
  strength_volume?: number;
  cardio_distance?: number;
  skill_reps?: number;
  exercises?: SessionExercise[];
  // Assignment columns
  is_assigned?: boolean;
  assigned_by?: string | null;
};

type Template = {
  id: string;
  template_name: string;
  session_name: string | null;
  rpe: number;
  duration_minutes: number;
  notes: string | null;
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
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sessionName, setSessionName] = useState("");
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<number>(60);
  const [loadManual, setLoadManual] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // View session dialog
  const [viewSessionOpen, setViewSessionOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState<TrainingSession | null>(null);
  
  // Show volume chart
  const [showVolumeChart, setShowVolumeChart] = useState(false);

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
    }
  }, [selectedAthleteId]);

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
      }).select().single();

      if (sessionError) throw sessionError;

      // Insert exercises if any
      if (exercises.length > 0 && sessionData) {
        const exercisesToInsert = exercises.map(ex => ({
          session_id: sessionData.id,
          exercise_name: ex.exercise_name,
          exercise_type: ex.exercise_type,
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
  };

  const handleViewSession = (session: TrainingSession) => {
    setViewingSession(session);
    setViewSessionOpen(true);
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
      .filter(e => e.exercise_type === "cardio")
      .reduce((sum, e) => sum + (e.distance_meters || 0), 0);
    
    const skillTotal = session.exercises
      .filter(e => e.exercise_type === "skill")
      .reduce((sum, e) => sum + (e.repetitions || 0), 0);
    
    return { strengthTotal, cardioTotal, skillTotal };
  };

  const getWeekDays = () => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  };

  const getSessionsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return sessions.filter(s => s.date === dayStr);
  };

  const getWeeklyMetrics = () => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= currentWeekStart && sessionDate <= weekEnd;
    });

    const totalLoad = weekSessions.reduce((sum, s) => sum + s.load_final, 0);
    const totalDuration = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const avgRPE = weekSessions.length > 0 
      ? Math.round(weekSessions.reduce((sum, s) => sum + (s.rpe || 0), 0) / weekSessions.length * 10) / 10
      : 0;

    // Comprehensive volume metrics
    const totalStrengthVolume = weekSessions.reduce((sum, s) => sum + (s.strength_volume || 0), 0);
    const totalCardioDistance = weekSessions.reduce((sum, s) => sum + (s.cardio_distance || 0), 0);
    const totalSkillReps = weekSessions.reduce((sum, s) => sum + (s.skill_reps || 0), 0);

    return { 
      totalLoad, 
      totalDuration, 
      avgRPE, 
      sessionCount: weekSessions.length,
      totalStrengthVolume,
      totalCardioDistance,
      totalSkillReps
    };
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subDays(prev, 7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getRPEColor = (rpe: number) => {
    if (rpe <= 3) return "bg-green-500";
    if (rpe <= 5) return "bg-yellow-500";
    if (rpe <= 7) return "bg-orange-500";
    return "bg-red-500";
  };

  const currentLoadAuto = computeSessionLoad(rpe, duration);
  const weeklyMetrics = getWeeklyMetrics();
  const weekDays = getWeekDays();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-slate-950">
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
                  <SelectTrigger className="w-48 bg-slate-900 border-slate-800">
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
              
              <Select value={format(currentWeekStart, "yyyy-MM")} onValueChange={(val) => {
                const [year, month] = val.split('-');
                setCurrentWeekStart(startOfWeek(new Date(parseInt(year), parseInt(month) - 1, 1), { weekStartsOn: 1 }));
              }}>
                <SelectTrigger className="w-40 bg-slate-900 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = addWeeks(new Date(), -6 + i);
                    return (
                      <SelectItem key={i} value={format(date, "yyyy-MM")}>
                        {format(date, "MMM yyyy", { locale: localeId })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goToPreviousWeek} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToCurrentWeek} className="h-8">
                  Hari Ini
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNextWeek} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
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
                <DialogContent className="max-w-md bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle>Template Sesi Latihan</DialogTitle>
                    <DialogDescription>
                      Kelola template sesi latihan untuk input cepat
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {templates.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        Belum ada template. Buat template dari form tambah sesi.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {templates.map((template) => (
                          <Card key={template.id} className="bg-slate-950 border-slate-800">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-white">{template.template_name}</h4>
                                  <p className="text-sm text-slate-400">{template.session_name || "Tanpa nama"}</p>
                                  <div className="flex gap-3 mt-2 text-xs text-slate-500">
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
                <DialogContent className="max-w-md bg-slate-900 border-slate-800 max-h-[90vh] overflow-y-auto">
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
                          <SelectTrigger className="bg-slate-950 border-slate-800">
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
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="session-name">Nama Sesi</Label>
                      <Input
                        id="session-name"
                        placeholder="Contoh: Latihan Endurance"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        className="bg-slate-950 border-slate-800"
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
                          className="bg-slate-950 border-slate-800"
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
                          className="bg-slate-950 border-slate-800"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-400">
                        Load otomatis: <span className="font-bold text-white">{currentLoadAuto} AU</span>
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
                        className="bg-slate-950 border-slate-800"
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
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>

                    {/* Exercise Details */}
                    <div className="border-t border-slate-800 pt-4">
                      <ExerciseForm exercises={exercises} onChange={setExercises} />
                    </div>

                    {/* Save as Template */}
                    <div className="border-t border-slate-800 pt-4 space-y-2">
                      <Label htmlFor="template-name">Simpan sebagai Template (opsional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="template-name"
                          placeholder="Nama template..."
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="bg-slate-950 border-slate-800"
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

          {/* Weekly Summary */}
          <Card className="mb-6 bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Total</span>
                    <span className="text-lg font-bold text-white">{format(currentWeekStart, "dd MMM", { locale: localeId })}</span>
                  </div>
                  <div className="text-sm text-slate-400">Load <span className="text-xl font-bold text-primary">{weeklyMetrics.totalLoad}</span></div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-slate-400">Durasi</div>
                  <div className="text-xl font-bold text-white">{Math.floor(weeklyMetrics.totalDuration / 60)}j {weeklyMetrics.totalDuration % 60}m</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-slate-400">Avg RPE</div>
                  <div className="text-xl font-bold text-white">{weeklyMetrics.avgRPE}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-slate-400">Sesi</div>
                  <div className="text-xl font-bold text-white">{weeklyMetrics.sessionCount}</div>
                </div>

                {/* Comprehensive Volume Metrics */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-blue-400">
                    <Dumbbell className="w-3 h-3" />
                    <span>Strength</span>
                  </div>
                  <div className="text-xl font-bold text-blue-400">
                    {weeklyMetrics.totalStrengthVolume >= 1000 
                      ? `${(weeklyMetrics.totalStrengthVolume / 1000).toFixed(1)}k` 
                      : weeklyMetrics.totalStrengthVolume} kg
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <Footprints className="w-3 h-3" />
                    <span>Cardio</span>
                  </div>
                  <div className="text-xl font-bold text-green-400">
                    {weeklyMetrics.totalCardioDistance >= 1000 
                      ? `${(weeklyMetrics.totalCardioDistance / 1000).toFixed(1)} km` 
                      : `${weeklyMetrics.totalCardioDistance} m`}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-orange-400">
                    <Target className="w-3 h-3" />
                    <span>Skill</span>
                  </div>
                  <div className="text-xl font-bold text-orange-400">
                    {weeklyMetrics.totalSkillReps} rep
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Volume Chart */}
          {showVolumeChart && (
            <div className="mb-6">
              <WeeklyVolumeChart sessions={sessions} />
            </div>
          )}

          {/* Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map((day, idx) => {
              const daySessions = getSessionsForDay(day);
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const dayId = format(day, "yyyy-MM-dd");
              
              return (
                <Droppable key={idx} id={dayId}>
                  <div className="space-y-2">
                    <div className={`text-center p-2 rounded-t-lg ${isToday ? 'bg-primary/20' : 'bg-slate-900'} border-b border-slate-800`}>
                      <div className="text-xs text-slate-400">
                        {format(day, "EEE", { locale: localeId })}
                      </div>
                      <div className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-white'}`}>
                        {format(day, "dd MMM", { locale: localeId })}
                      </div>
                    </div>
                    
                    <div className="space-y-2 min-h-[200px]">
                      {daySessions.length === 0 ? (
                        <div className="text-center text-slate-600 text-xs py-4">
                          Tidak ada sesi
                        </div>
                      ) : (
                        daySessions.map((session) => (
                          <Draggable key={session.id} id={session.id}>
                            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors group relative cursor-grab active:cursor-grabbing">
                              <CardContent className="p-3 space-y-2">
                                {/* Drag Handle */}
                                <div className="absolute top-2 left-2 text-slate-600 group-hover:text-slate-400">
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                {/* Duration Badge */}
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${getRPEColor(session.rpe || 5)} ml-6`}>
                                  <Activity className="w-3 h-3" />
                                  {session.duration_minutes}m
                                </div>
                                
                                {/* Session Name */}
                                <div className="text-sm font-medium text-white">
                                  {session.session_name || "Latihan"}
                                </div>
                                
                                {/* Metrics */}
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">RPE</span>
                                    <span className="font-semibold text-white">{session.rpe}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Load</span>
                                    <span className="font-semibold text-primary">{session.load_final}</span>
                                  </div>
                                </div>

                                {/* Exercise Summary Icons */}
                                {session.exercises && session.exercises.length > 0 && (
                                  <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
                                    {(() => {
                                      const summary = getExerciseSummary(session);
                                      const completionStatus = getSessionCompletionStatus(session);
                                      return (
                                        <>
                                          {/* Completion indicator */}
                                          {completionStatus && (
                                            <div 
                                              className={`flex items-center gap-0.5 text-xs ${completionStatus.isComplete ? 'text-green-400' : 'text-slate-500'}`} 
                                              title={`${completionStatus.completed}/${completionStatus.total} selesai`}
                                            >
                                              {completionStatus.isComplete ? (
                                                <CheckCircle className="w-3 h-3" />
                                              ) : (
                                                <span className="text-[10px]">{completionStatus.completed}/{completionStatus.total}</span>
                                              )}
                                            </div>
                                          )}
                                          {summary && summary.strengthTotal > 0 && (
                                            <div className="flex items-center gap-0.5 text-xs text-blue-400" title={`${summary.strengthTotal.toLocaleString()} kg`}>
                                              <Dumbbell className="w-3 h-3" />
                                              <span>{summary.strengthTotal >= 1000 ? `${(summary.strengthTotal/1000).toFixed(0)}k` : summary.strengthTotal}</span>
                                            </div>
                                          )}
                                          {summary && summary.cardioTotal > 0 && (
                                            <div className="flex items-center gap-0.5 text-xs text-green-400" title={`${(summary.cardioTotal/1000).toFixed(1)} km`}>
                                              <Footprints className="w-3 h-3" />
                                              <span>{(summary.cardioTotal/1000).toFixed(1)}k</span>
                                            </div>
                                          )}
                                          {summary && summary.skillTotal > 0 && (
                                            <div className="flex items-center gap-0.5 text-xs text-orange-400" title={`${summary.skillTotal} repetisi`}>
                                              <Target className="w-3 h-3" />
                                              <span>{summary.skillTotal}</span>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 ml-auto"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewSession(session);
                                      }}
                                    >
                                      <Eye className="w-3 h-3 text-slate-400" />
                                    </Button>
                                  </div>
                                )}
                                
                                {/* Intensity Bar */}
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${getRPEColor(session.rpe || 5)}`}
                                    style={{ width: `${((session.rpe || 0) / 10) * 100}%` }}
                                  />
                                </div>

                                {/* Delete Button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(session.id)}
                                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </Button>
                                
                                {session.notes && (
                                  <div className="text-xs text-slate-500 truncate" title={session.notes}>
                                    {session.notes}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </Draggable>
                        ))
                      )}
                    </div>
                  </div>
                </Droppable>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeSession ? (
          <Card className="bg-slate-900 border-slate-700 opacity-80 w-48">
            <CardContent className="p-3">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${getRPEColor(activeSession.rpe || 5)}`}>
                <Activity className="w-3 h-3" />
                {activeSession.duration_minutes}m
              </div>
              <div className="text-sm font-medium text-white mt-2">
                {activeSession.session_name || "Latihan"}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

      {/* View Session Detail Dialog */}
      <Dialog open={viewSessionOpen} onOpenChange={setViewSessionOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingSession?.session_name || "Detail Sesi Latihan"}</DialogTitle>
            <DialogDescription>
              {viewingSession && format(new Date(viewingSession.date), "EEEE, dd MMMM yyyy", { locale: localeId })}
            </DialogDescription>
          </DialogHeader>
          
          {viewingSession && (
            <div className="space-y-4">
              {/* Export Button */}
              {viewingSession.exercises && viewingSession.exercises.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => exportSessionDetailToPDF(viewingSession, athleteName)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              )}
              
              {/* Session Metrics */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-center">
                  <div className="text-xs text-slate-400">Durasi</div>
                  <div className="font-semibold text-white">{viewingSession.duration_minutes} menit</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">RPE</div>
                  <div className={`font-semibold ${viewingSession.rpe && viewingSession.rpe >= 8 ? 'text-red-400' : viewingSession.rpe && viewingSession.rpe >= 6 ? 'text-orange-400' : 'text-green-400'}`}>
                    {viewingSession.rpe}/10
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">Load</div>
                  <div className="font-semibold text-primary">{viewingSession.load_final} AU</div>
                </div>
              </div>

              {/* Completion Progress */}
              {(() => {
                const status = getSessionCompletionStatus(viewingSession);
                if (!status) return null;
                return (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Progress Latihan</span>
                      <span className={`text-sm font-semibold ${status.isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                        {status.completed}/{status.total} selesai
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${status.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${(status.completed / status.total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Exercise Details */}
              {viewingSession.exercises && viewingSession.exercises.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-white">Detail Latihan ({viewingSession.exercises.length} latihan)</h4>
                  <p className="text-xs text-slate-400">Klik tombol untuk menandai latihan yang sudah selesai</p>
                  
                  {/* Strength Exercises */}
                  {viewingSession.exercises.filter(e => e.exercise_type === "strength").length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                        <Dumbbell className="w-4 h-4" />
                        Strength
                      </div>
                      <div className="space-y-2">
                        {viewingSession.exercises.filter(e => e.exercise_type === "strength").map((ex) => (
                          <div 
                            key={ex.id} 
                            className={`p-2 rounded-lg flex items-start gap-3 ${
                              ex.is_completed 
                                ? 'bg-green-500/20 border border-green-500/50' 
                                : 'bg-blue-500/10 border border-blue-500/30'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleExerciseComplete(ex.id, ex.is_completed || false)}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {ex.is_completed ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-500 hover:text-blue-400 transition-colors" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className={`font-medium ${ex.is_completed ? 'text-green-300 line-through' : 'text-white'}`}>
                                {ex.exercise_name}
                              </div>
                              <div className="flex gap-4 text-xs text-slate-400 mt-1">
                                <span>{ex.sets} set × {ex.reps} rep</span>
                                <span>{ex.weight_kg} kg</span>
                                <span className="text-blue-400 font-semibold">
                                  Total: {((ex.sets || 0) * (ex.reps || 0) * (ex.weight_kg || 0)).toLocaleString()} kg
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cardio Exercises */}
                  {viewingSession.exercises.filter(e => e.exercise_type === "cardio").length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                        <Footprints className="w-4 h-4" />
                        Cardio
                      </div>
                      <div className="space-y-2">
                        {viewingSession.exercises.filter(e => e.exercise_type === "cardio").map((ex) => (
                          <div 
                            key={ex.id} 
                            className={`p-2 rounded-lg flex items-start gap-3 ${
                              ex.is_completed 
                                ? 'bg-green-500/20 border border-green-500/50' 
                                : 'bg-green-500/10 border border-green-500/30'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleExerciseComplete(ex.id, ex.is_completed || false)}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {ex.is_completed ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-500 hover:text-green-400 transition-colors" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className={`font-medium ${ex.is_completed ? 'text-green-300 line-through' : 'text-white'}`}>
                                {ex.exercise_name}
                              </div>
                              <div className="flex gap-4 text-xs text-slate-400 mt-1">
                                <span>Jarak: {(ex.distance_meters || 0) >= 1000 ? `${((ex.distance_meters || 0)/1000).toFixed(2)} km` : `${ex.distance_meters} m`}</span>
                                {ex.duration_seconds && (
                                  <span>Waktu: {Math.floor((ex.duration_seconds || 0) / 60)}:{String((ex.duration_seconds || 0) % 60).padStart(2, '0')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skill Exercises */}
                  {viewingSession.exercises.filter(e => e.exercise_type === "skill").length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-orange-400">
                        <Target className="w-4 h-4" />
                        Skill
                      </div>
                      <div className="space-y-2">
                        {viewingSession.exercises.filter(e => e.exercise_type === "skill").map((ex) => (
                          <div 
                            key={ex.id} 
                            className={`p-2 rounded-lg flex items-start gap-3 ${
                              ex.is_completed 
                                ? 'bg-green-500/20 border border-green-500/50' 
                                : 'bg-orange-500/10 border border-orange-500/30'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleExerciseComplete(ex.id, ex.is_completed || false)}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {ex.is_completed ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-500 hover:text-orange-400 transition-colors" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className={`font-medium ${ex.is_completed ? 'text-green-300 line-through' : 'text-white'}`}>
                                {ex.exercise_name}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                <span>Repetisi: <span className="text-orange-400 font-semibold">{ex.repetitions}</span></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Summary */}
                  {(() => {
                    const summary = getExerciseSummary(viewingSession);
                    if (!summary) return null;
                    return (
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                        <div className="text-xs font-semibold text-slate-400 mb-2">Total Volume Sesi</div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          {summary.strengthTotal > 0 && (
                            <div>
                              <span className="text-slate-500">Strength:</span>
                              <span className="ml-1 font-bold text-blue-400">{summary.strengthTotal.toLocaleString()} kg</span>
                            </div>
                          )}
                          {summary.cardioTotal > 0 && (
                            <div>
                              <span className="text-slate-500">Cardio:</span>
                              <span className="ml-1 font-bold text-green-400">{(summary.cardioTotal / 1000).toFixed(2)} km</span>
                            </div>
                          )}
                          {summary.skillTotal > 0 && (
                            <div>
                              <span className="text-slate-500">Skill:</span>
                              <span className="ml-1 font-bold text-orange-400">{summary.skillTotal} rep</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Notes */}
              {viewingSession.notes && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 mb-1">Catatan</div>
                  <p className="text-sm text-white">{viewingSession.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
