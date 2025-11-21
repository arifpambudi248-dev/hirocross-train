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
import { Plus, Trash2, ChevronLeft, ChevronRight, Activity, Save, Bookmark, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { Droppable } from "@/components/Droppable";
import { Draggable } from "@/components/Draggable";

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

  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

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

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("athlete_name")
      .eq("id", session.user.id)
      .single();
    
    if (profile) {
      setAthleteName(profile.athlete_name);
    }
    
    fetchSessions(session.user.id);
    fetchTemplates(session.user.id);
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
      setSessions(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
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
      toast.error("Gagal memuat template: " + error.message);
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
      toast.error("Gagal memindahkan sesi: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const loadAuto = computeSessionLoad(rpe, duration);
    const loadFinal = loadManual !== null ? loadManual : loadAuto;

    try {
      const { error } = await supabase.from("training_sessions").insert({
        user_id: userId,
        athlete_name: athleteName,
        date,
        session_name: sessionName || null,
        rpe,
        duration_minutes: duration,
        load_auto: loadAuto,
        load_manual: loadManual,
        load_final: loadFinal,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Sesi latihan berhasil ditambahkan");
      setOpen(false);
      resetForm();
      fetchSessions(userId);
    } catch (error: any) {
      toast.error("Gagal menambahkan sesi: " + error.message);
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
      toast.error("Gagal menghapus sesi: " + error.message);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!userId || !templateName.trim()) {
      toast.error("Nama template harus diisi");
      return;
    }

    try {
      const { error } = await supabase.from("training_templates").insert({
        user_id: userId,
        template_name: templateName,
        session_name: sessionName || null,
        rpe,
        duration_minutes: duration,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Template berhasil disimpan");
      setTemplateName("");
      fetchTemplates(userId);
    } catch (error: any) {
      toast.error("Gagal menyimpan template: " + error.message);
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
      fetchTemplates(userId!);
    } catch (error: any) {
      toast.error("Gagal menghapus template: " + error.message);
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

    return { totalLoad, totalDuration, avgRPE, sessionCount: weekSessions.length };
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
                        rows={3}
                        className="bg-slate-950 border-slate-800"
                      />
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Total</span>
                    <span className="text-lg font-bold text-white">{format(currentWeekStart, "dd MMM", { locale: localeId })}</span>
                  </div>
                  <div className="text-sm text-slate-400">Load <span className="text-xl font-bold text-cyan-400">{weeklyMetrics.totalLoad}</span></div>
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
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map((day, idx) => {
              const daySessions = getSessionsForDay(day);
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const dayId = format(day, "yyyy-MM-dd");
              
              return (
                <Droppable key={idx} id={dayId}>
                  <div className="space-y-2">
                    <div className={`text-center p-2 rounded-t-lg ${isToday ? 'bg-cyan-500/20' : 'bg-slate-900'} border-b border-slate-800`}>
                      <div className="text-xs text-slate-400">
                        {format(day, "EEE", { locale: localeId })}
                      </div>
                      <div className={`text-sm font-semibold ${isToday ? 'text-cyan-400' : 'text-white'}`}>
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
                                    <span className="font-semibold text-cyan-400">{session.load_final}</span>
                                  </div>
                                </div>
                                
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
    </DndContext>
  );
}
