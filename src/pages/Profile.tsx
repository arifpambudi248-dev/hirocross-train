import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Activity, Shield, TrendingUp, Brain, AlertCircle, Camera, Heart, Edit, Dumbbell, Ruler, Scale, Gauge } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { computeReadinessScore } from "@/lib/readiness";
import { assessInjuryRisk, getRiskColor, getRiskBgColor } from "@/lib/injuryRisk";
import { calculateMaxHR, calculateTrainingZones, type TrainingZone } from "@/lib/trainingZones";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { SPORT_CATEGORIES, getSportLabel } from "@/lib/sportCategories";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [readinessData, setReadinessData] = useState<any[]>([]);
  const [loadData, setLoadData] = useState<any[]>([]);
  const [physicalTests, setPhysicalTests] = useState<any[]>([]);
  const [injuryRisk, setInjuryRisk] = useState<any>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trainingZones, setTrainingZones] = useState<TrainingZone[]>([]);
  const { toast } = useToast();

  // Edit profile states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAge, setEditAge] = useState("");
  const [editBaselineRHR, setEditBaselineRHR] = useState("");
  const [editBaselineVJ, setEditBaselineVJ] = useState("");
  const [editBodyWeight, setEditBodyWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editGender, setEditGender] = useState<string>("male");
  const [editSport, setEditSport] = useState<string>("");

  // BMI calculation
  const calculateBMI = (weight: number | null, height: number | null): number | null => {
    if (!weight || !height || height <= 0) return null;
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi: number): { label: string; color: string; description: string } => {
    if (bmi < 18.5) return { label: "Kurus", color: "text-blue-500", description: "Di bawah berat normal" };
    if (bmi < 25) return { label: "Normal", color: "text-green-500", description: "Berat badan ideal" };
    if (bmi < 30) return { label: "Kelebihan", color: "text-yellow-500", description: "Kelebihan berat badan" };
    return { label: "Obesitas", color: "text-red-500", description: "Berat badan berlebih" };
  };
  const [isSaving, setIsSaving] = useState(false);
  
  // Avatar upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    if (profile?.age) {
      try {
        const maxHR = calculateMaxHR(profile.age);
        const zones = calculateTrainingZones(maxHR);
        setTrainingZones(zones);
      } catch (error) {
        console.error("Error calculating training zones:", error);
      }
    }
  }, [profile?.age]);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);
      
      // Set edit form values
      if (profileData) {
        setEditAge(profileData.age?.toString() || "");
        setEditBaselineRHR(profileData.baseline_rhr?.toString() || "60");
        setEditBaselineVJ(profileData.baseline_vj?.toString() || "40");
        setEditBodyWeight((profileData as any).body_weight?.toString() || "");
        setEditHeight((profileData as any).height?.toString() || "");
        setEditGender((profileData as any).gender || "male");
        setEditSport((profileData as any).sport || "");
      }

      // Load avatar if exists
      if (profileData?.avatar_url) {
        setAvatarPreview(profileData.avatar_url);
      }

      // Load readiness logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: readinessLogs } = await supabase
        .from("readiness_logs")
        .select("*")
        .eq("athlete_id", user.id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });
      setReadinessData(readinessLogs || []);

      // Load training sessions (last 30 days)
      const { data: sessions } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });
      setLoadData(sessions || []);

      // Load physical tests (all tests, latest per test_name)
      const { data: tests } = await supabase
        .from("physical_tests")
        .select("*")
        .eq("athlete_id", user.id)
        .order("test_date", { ascending: false });
      
      // Get latest test per test_name (not just per category)
      const latestTestsMap = new Map<string, any>();
      tests?.forEach((test) => {
        if (!latestTestsMap.has(test.test_name)) {
          latestTestsMap.set(test.test_name, test);
        }
      });
      setPhysicalTests(Array.from(latestTestsMap.values()));

      // Calculate injury risk
      if (readinessLogs && sessions) {
        const last7DaysReadiness = readinessLogs.slice(-7).map(r => r.readiness_score);
        
        // Group sessions by week
        const weeklyLoads: number[] = [];
        const weeksAgo = 5;
        for (let i = weeksAgo; i > 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          const weekSessions = sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= weekStart && sessionDate < weekEnd;
          });
          const weekLoad = weekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
          weeklyLoads.push(weekLoad);
        }

        const currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        const currentWeekSessions = sessions.filter(s => new Date(s.date) >= currentWeekStart);
        const currentWeekLoad = currentWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);

        // Calculate ACWR
        const acuteLoad = weeklyLoads.slice(-1)[0] || 0;
        const chronicLoad = weeklyLoads.slice(-4).reduce((a, b) => a + b, 0) / 4;
        const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

        const risk = assessInjuryRisk(acwr, last7DaysReadiness, weeklyLoads, currentWeekLoad);
        setInjuryRisk(risk);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading profile data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data profil",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        sonnerToast.error("Ukuran file maksimal 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    
    try {
      setIsUploadingAvatar(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload to storage
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      sonnerToast.success("Avatar berhasil diupload");
      loadProfileData();
      setAvatarFile(null);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      sonnerToast.error("Gagal upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const age = parseInt(editAge);
      const rhr = parseFloat(editBaselineRHR);
      const vj = parseFloat(editBaselineVJ);
      const bodyWeight = editBodyWeight ? parseFloat(editBodyWeight) : null;
      const height = editHeight ? parseFloat(editHeight) : null;

      if (age < 10 || age > 100) {
        sonnerToast.error("Usia harus antara 10-100 tahun");
        return;
      }

      if (bodyWeight && (bodyWeight < 20 || bodyWeight > 200)) {
        sonnerToast.error("Berat badan harus antara 20-200 kg");
        return;
      }

      if (height && (height < 100 || height > 250)) {
        sonnerToast.error("Tinggi badan harus antara 100-250 cm");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          age,
          baseline_rhr: rhr,
          baseline_vj: vj,
          body_weight: bodyWeight,
          height: height,
          gender: editGender,
          sport: editSport || null
        })
        .eq('id', user.id);

      if (error) throw error;

      sonnerToast.success("Profil berhasil diupdate");
      setEditDialogOpen(false);
      loadProfileData();
    } catch (error) {
      console.error("Error saving profile:", error);
      sonnerToast.error("Gagal menyimpan profil");
    } finally {
      setIsSaving(false);
    }
  };

  const getAICoachFeedback = async () => {
    setIsLoadingAI(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const last7DaysReadiness = readinessData.slice(-7).map(r => r.readiness_score);
      const avgReadiness = last7DaysReadiness.length > 0 
        ? last7DaysReadiness.reduce((a, b) => a + b, 0) / last7DaysReadiness.length
        : 0;

      const weeklyLoads = [];
      for (let i = 4; i > 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        const weekSessions = loadData.filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate >= weekStart && sessionDate < weekEnd;
        });
        const weekLoad = weekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);
        weeklyLoads.push(weekLoad);
      }

      const currentWeekStart = new Date();
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      const currentWeekSessions = loadData.filter(s => new Date(s.date) >= currentWeekStart);
      const currentWeekLoad = currentWeekSessions.reduce((sum, s) => sum + (s.load_final || 0), 0);

      const acuteLoad = weeklyLoads.slice(-1)[0] || 0;
      const chronicLoad = weeklyLoads.slice(-4).reduce((a, b) => a + b, 0) / 4;
      const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

      const athleteData = {
        name: profile?.athlete_name || "Atlet",
        age: profile?.age,
        readinessScores: last7DaysReadiness,
        avgReadiness: avgReadiness.toFixed(1),
        injuryRisk: injuryRisk?.overallRisk,
        riskScore: injuryRisk?.riskScore,
        acwr: acwr.toFixed(2),
        currentWeekLoad,
        weeklyLoads,
        physicalTests: physicalTests.map(t => ({
          test_name: t.test_name,
          value: t.value,
          unit: t.unit,
        })),
        riskFactors: injuryRisk?.factors || [],
      };

      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { athleteData },
      });

      if (error) throw error;

      setAiFeedback(data.feedback);
      toast({
        title: "AI Coach Feedback",
        description: "Feedback personal telah dihasilkan",
      });
    } catch (error) {
      console.error("Error getting AI feedback:", error);
      toast({
        title: "Error",
        description: "Gagal mendapatkan feedback dari AI Coach",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const avgReadiness = readinessData.length > 0
    ? readinessData.reduce((sum, r) => sum + r.readiness_score, 0) / readinessData.length
    : 0;

  const totalLoad = loadData.reduce((sum, s) => sum + (s.load_final || 0), 0);

  // Same benchmarks as TesFisik page for consistent scoring
  const BENCHMARKS: { [key: string]: any[] } = {
    daya_tahan: [
      { testName: "VO2max", scale5: 65, scale4: 55, scale3: 45, scale2: 40, scale1: 35, unit: "ml/kg/min", inverse: false },
      { testName: "Cooper Test (12 min)", scale5: 3200, scale4: 2800, scale3: 2400, scale2: 2200, scale1: 2000, unit: "m", inverse: false },
      { testName: "Beep Test", scale5: 15, scale4: 12, scale3: 10, scale2: 7, scale1: 5, unit: "level", inverse: false },
    ],
    kecepatan: [
      { testName: "Sprint 10m", scale5: 1.6, scale4: 1.75, scale3: 1.9, scale2: 2.05, scale1: 2.2, unit: "s", inverse: true },
      { testName: "Sprint 20m", scale5: 2.8, scale4: 3.0, scale3: 3.25, scale2: 3.5, scale1: 3.8, unit: "s", inverse: true },
      { testName: "Sprint 40m", scale5: 4.9, scale4: 5.2, scale3: 5.6, scale2: 6.0, scale1: 6.5, unit: "s", inverse: true },
    ],
    kekuatan: [
      { testName: "Back Squat 1RM", scale5: 2.5, scale4: 2.0, scale3: 1.5, scale2: 1.2, scale1: 1.0, unit: "x BW", inverse: false },
      { testName: "Bench Press 1RM", scale5: 1.8, scale4: 1.5, scale3: 1.2, scale2: 1.0, scale1: 0.8, unit: "x BW", inverse: false },
      { testName: "Deadlift 1RM", scale5: 3.0, scale4: 2.5, scale3: 2.0, scale2: 1.5, scale1: 1.2, unit: "x BW", inverse: false },
      { testName: "Pull Up Max", scale5: 20, scale4: 15, scale3: 10, scale2: 7, scale1: 5, unit: "reps", inverse: false },
    ],
    kelincahan: [
      { testName: "T-Test", scale5: 8.5, scale4: 9.5, scale3: 10.5, scale2: 11.5, scale1: 12.5, unit: "s", inverse: true },
      { testName: "Illinois Agility Test", scale5: 14.0, scale4: 15.5, scale3: 17.0, scale2: 18.5, scale1: 20.0, unit: "s", inverse: true },
      { testName: "505 Agility Test", scale5: 2.0, scale4: 2.2, scale3: 2.4, scale2: 2.6, scale1: 2.8, unit: "s", inverse: true },
      { testName: "Hexagon Test", scale5: 10.0, scale4: 11.5, scale3: 13.0, scale2: 14.5, scale1: 16.0, unit: "s", inverse: true },
    ],
    fleksibilitas: [
      { testName: "Sit and Reach", scale5: 25, scale4: 20, scale3: 15, scale2: 10, scale1: 5, unit: "cm", inverse: false },
      { testName: "Shoulder Flexibility", scale5: -5, scale4: 0, scale3: 5, scale2: 10, scale1: 15, unit: "cm", inverse: true },
      { testName: "Hip Flexion", scale5: 130, scale4: 120, scale3: 110, scale2: 100, scale1: 90, unit: "deg", inverse: false },
    ],
    power: [
      { testName: "CMJ (Counter Movement Jump)", scale5: 65, scale4: 55, scale3: 45, scale2: 35, scale1: 25, unit: "cm", inverse: false },
      { testName: "Standing Broad Jump", scale5: 310, scale4: 270, scale3: 230, scale2: 200, scale1: 170, unit: "cm", inverse: false },
      { testName: "Medicine Ball Throw", scale5: 14, scale4: 12, scale3: 10, scale2: 8, scale1: 6, unit: "m", inverse: false },
      { testName: "Drop Jump", scale5: 70, scale4: 60, scale3: 50, scale2: 40, scale1: 30, unit: "cm", inverse: false },
    ],
  };

  const calculateScore = (value: number, benchmark: any): number => {
    if (benchmark.inverse) {
      if (value <= benchmark.scale5) return 5;
      if (value <= benchmark.scale4) return 4;
      if (value <= benchmark.scale3) return 3;
      if (value <= benchmark.scale2) return 2;
      return 1;
    } else {
      if (value >= benchmark.scale5) return 5;
      if (value >= benchmark.scale4) return 4;
      if (value >= benchmark.scale3) return 3;
      if (value >= benchmark.scale2) return 2;
      return 1;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score === 5) return "bg-green-500 text-white";
    if (score === 4) return "bg-blue-500 text-white";
    if (score === 3) return "bg-yellow-500 text-black";
    if (score === 2) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const getScoreLabel = (score: number): string => {
    if (score === 5) return "Excellent";
    if (score === 4) return "Good";
    if (score === 3) return "Average";
    if (score === 2) return "Below Average";
    return "Poor";
  };

  // Prepare radar chart data from all individual tests
  const allBenchmarks = Object.values(BENCHMARKS).flat();
  const radarData = physicalTests
    .map((test) => {
      const benchmark = allBenchmarks.find((b) => b.testName === test.test_name);
      if (!benchmark) return null;
      const score = calculateScore(test.value, benchmark);
      return {
        subject: test.test_name,
        score: score * 20, // Convert 1-5 to 20-100 scale
        fullMark: 100,
      };
    })
    .filter(Boolean);

  const maxHR = profile?.age ? calculateMaxHR(profile.age) : null;

  return (
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header Section with Avatar */}
        <div className="flex items-start gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-primary">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={profile?.athlete_name} />
              ) : (
                <AvatarFallback className="bg-secondary text-primary text-2xl">
                  {profile?.athlete_name?.charAt(0) || "A"}
                </AvatarFallback>
              )}
            </Avatar>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Avatar</DialogTitle>
                  <DialogDescription>
                    Pilih foto profil baru (maksimal 2MB)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Avatar className="h-32 w-32 border-2 border-border">
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} alt="Preview" />
                      ) : (
                        <AvatarFallback className="text-4xl">
                          {profile?.athlete_name?.charAt(0) || "A"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    onClick={handleUploadAvatar}
                    disabled={!avatarFile || isUploadingAvatar}
                    className="w-full"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{profile?.athlete_name || "Atlet"}</h1>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profil
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profil Atlet</DialogTitle>
                    <DialogDescription>
                      Update data baseline dan informasi personal
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="age">Usia (tahun)</Label>
                      <Input
                        id="age"
                        type="number"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="Contoh: 25"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Digunakan untuk menghitung zona latihan (HR Max = 220 - usia)
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="rhr">Baseline RHR (bpm)</Label>
                      <Input
                        id="rhr"
                        type="number"
                        value={editBaselineRHR}
                        onChange={(e) => setEditBaselineRHR(e.target.value)}
                        placeholder="Contoh: 60"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vj">Baseline Vertical Jump (cm)</Label>
                      <Input
                        id="vj"
                        type="number"
                        value={editBaselineVJ}
                        onChange={(e) => setEditBaselineVJ(e.target.value)}
                        placeholder="Contoh: 40"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bodyWeight">Berat Badan (kg)</Label>
                        <Input
                          id="bodyWeight"
                          type="number"
                          step="0.1"
                          value={editBodyWeight}
                          onChange={(e) => setEditBodyWeight(e.target.value)}
                          placeholder="Contoh: 70"
                        />
                      </div>
                      <div>
                        <Label htmlFor="height">Tinggi Badan (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          step="0.1"
                          value={editHeight}
                          onChange={(e) => setEditHeight(e.target.value)}
                          placeholder="Contoh: 175"
                        />
                      </div>
                    </div>
                    {editBodyWeight && editHeight && (
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-sm font-medium">
                          BMI Preview: {calculateBMI(parseFloat(editBodyWeight), parseFloat(editHeight))?.toFixed(1) || '-'} kg/m²
                        </p>
                        {calculateBMI(parseFloat(editBodyWeight), parseFloat(editHeight)) && (
                          <p className={`text-sm ${getBMICategory(calculateBMI(parseFloat(editBodyWeight), parseFloat(editHeight))!).color}`}>
                            {getBMICategory(calculateBMI(parseFloat(editBodyWeight), parseFloat(editHeight))!).label}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <Label>Jenis Kelamin</Label>
                      <Select value={editGender} onValueChange={setEditGender}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Laki-laki</SelectItem>
                          <SelectItem value="female">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Cabang Olahraga</Label>
                      <Select value={editSport} onValueChange={setEditSport}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Pilih cabang olahraga" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {SPORT_CATEGORIES.map(sport => (
                            <SelectItem key={sport.value} value={sport.value}>
                              {sport.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground mb-2">Profil Komprehensif & Analisis Performa</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile?.age && (
                <Badge variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {profile.age} tahun
                </Badge>
              )}
              {(profile as any)?.gender && (
                <Badge variant="outline">
                  {(profile as any).gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                </Badge>
              )}
              {(profile as any)?.sport && (
                <Badge variant="outline">
                  <Dumbbell className="h-3 w-3 mr-1" />
                  {getSportLabel((profile as any).sport)}
                </Badge>
              )}
              {maxHR && (
                <Badge variant="outline">
                  <Heart className="h-3 w-3 mr-1" />
                  HR Max: {maxHR} bpm
                </Badge>
              )}
              {(profile as any)?.body_weight && (profile as any)?.height && (
                <Badge variant="outline">
                  <Gauge className="h-3 w-3 mr-1" />
                  BMI: {calculateBMI((profile as any).body_weight, (profile as any).height)?.toFixed(1)} kg/m²
                </Badge>
              )}
            </div>
            
            <div className="flex gap-4 mt-4">
              <Button 
                onClick={getAICoachFeedback} 
                disabled={isLoadingAI}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isLoadingAI ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Dapatkan AI Coach Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* BMI Card */}
        {(profile as any)?.body_weight && (profile as any)?.height && (
          <Card className="bg-gradient-to-br from-card to-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Indeks Massa Tubuh (BMI/IMT)
              </CardTitle>
              <CardDescription>
                Kalkulasi otomatis berdasarkan berat dan tinggi badan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const weight = (profile as any).body_weight;
                const height = (profile as any).height;
                const bmi = calculateBMI(weight, height);
                
                if (!bmi) return null;
                
                const category = getBMICategory(bmi);
                const bmiPercentage = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100)); // Scale 15-40 to 0-100
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* BMI Speedometer */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-40 h-24">
                        <svg viewBox="0 0 200 100" className="w-full h-full">
                          {/* Background arc */}
                          <path
                            d="M 20 90 A 80 80 0 0 1 180 90"
                            fill="none"
                            stroke="hsl(var(--muted))"
                            strokeWidth="20"
                            strokeLinecap="round"
                          />
                          {/* Colored segments */}
                          <path
                            d="M 20 90 A 80 80 0 0 1 60 27"
                            fill="none"
                            stroke="hsl(217, 91%, 60%)"
                            strokeWidth="20"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 60 27 A 80 80 0 0 1 140 27"
                            fill="none"
                            stroke="hsl(142, 76%, 36%)"
                            strokeWidth="20"
                          />
                          <path
                            d="M 140 27 A 80 80 0 0 1 165 50"
                            fill="none"
                            stroke="hsl(45, 93%, 47%)"
                            strokeWidth="20"
                          />
                          <path
                            d="M 165 50 A 80 80 0 0 1 180 90"
                            fill="none"
                            stroke="hsl(0, 84%, 60%)"
                            strokeWidth="20"
                            strokeLinecap="round"
                          />
                          {/* Needle */}
                          {(() => {
                            const angle = 180 + (bmiPercentage / 100) * 180;
                            const radians = (angle * Math.PI) / 180;
                            const needleLength = 55;
                            const endX = 100 + needleLength * Math.cos(radians);
                            const endY = 90 + needleLength * Math.sin(radians);
                            return (
                              <>
                                <line
                                  x1="100"
                                  y1="90"
                                  x2={endX}
                                  y2={endY}
                                  stroke="hsl(var(--foreground))"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <circle cx="100" cy="90" r="8" fill="hsl(var(--foreground))" />
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                      <div className="text-center mt-2">
                        <p className="text-3xl font-bold">{bmi.toFixed(1)}</p>
                        <p className="text-sm text-muted-foreground">kg/m²</p>
                      </div>
                    </div>
                    
                    {/* BMI Category */}
                    <div className="flex flex-col justify-center">
                      <div className={`text-2xl font-bold ${category.color}`}>
                        {category.label}
                      </div>
                      <p className="text-muted-foreground mt-1">{category.description}</p>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <span>Berat: <strong>{weight} kg</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          <span>Tinggi: <strong>{height} cm</strong></span>
                        </div>
                      </div>
                    </div>
                    
                    {/* BMI Scale Reference */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold mb-3">Skala BMI:</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>{"< 18.5"}</span>
                          <span className="text-muted-foreground">Kurus</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span>18.5 - 24.9</span>
                          <span className="text-muted-foreground">Normal</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <span>25.0 - 29.9</span>
                          <span className="text-muted-foreground">Kelebihan</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span>≥ 30.0</span>
                          <span className="text-muted-foreground">Obesitas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Training Zones Card */}
        {trainingZones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Zona Latihan Berdasarkan Heart Rate
              </CardTitle>
              <CardDescription>
                Konversi HR ke RPE (Rate of Perceived Exertion) untuk usia {profile?.age} tahun | HR Max: {maxHR} bpm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm">RPE</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Target HR (bpm)</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Zona</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingZones.map((zone) => (
                      <tr 
                        key={zone.rpe}
                        className="border-b border-border/50 hover:bg-accent/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${zone.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                              {zone.rpe}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-lg">
                            {zone.hrMin}–{zone.hrMax}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {zone.percentage} HR Max
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant="outline" 
                            className={`${zone.color} text-white border-0 font-medium`}
                          >
                            {zone.name}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {zone.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Gunakan zona latihan ini sebagai panduan untuk mengatur intensitas latihan. RPE 1-10 sesuai dengan persentase HR Max Anda.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* AI Feedback Section */}
        {aiFeedback && (
          <Card className="border-purple-500/20 bg-secondary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Brain className="h-5 w-5" />
                AI Coach Feedback Personal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none whitespace-pre-line">
                {aiFeedback}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Avg Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgReadiness.toFixed(1)}%
              </div>
              <Badge className={`mt-2 ${
                avgReadiness > 70 ? "bg-green-500/10 text-green-500" :
                avgReadiness > 40 ? "bg-yellow-500/10 text-yellow-500" :
                "bg-orange-500/10 text-orange-500"
              }`}>
                {avgReadiness > 70 ? "Prime" : avgReadiness > 40 ? "Moderate" : "Low"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Total Load (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalLoad} AU
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {loadData.length} sesi latihan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Injury Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              {injuryRisk ? (
                <>
                  <div className="text-2xl font-bold capitalize">
                    {injuryRisk.overallRisk.replace("-", " ")}
                  </div>
                  <Badge className={`mt-2 ${getRiskBgColor(injuryRisk.overallRisk)}`}>
                    Score: {injuryRisk.riskScore}/100
                  </Badge>
                </>
              ) : (
                <div className="text-muted-foreground">Tidak ada data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                Physical Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {physicalTests.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Kategori tersedia
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Readiness Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tren Readiness (30 Hari)</CardTitle>
              <CardDescription>Skor kesiapan harian atlet</CardDescription>
            </CardHeader>
            <CardContent>
              {readinessData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={readinessData}>
                    <defs>
                      <linearGradient id="readinessGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="readiness_score" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#readinessGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Belum ada data readiness
                </div>
              )}
            </CardContent>
          </Card>

          {/* Physical Performance Radar */}
          <Card>
            <CardHeader>
              <CardTitle>Profil Performa Fisik</CardTitle>
              <CardDescription>Radar chart berdasarkan skor tes (skala 1-5 × 20)</CardDescription>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      stroke="hsl(var(--foreground))"
                      tick={{ fontSize: 10 }}
                    />
                    <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))'
                      }}
                      formatter={(value: number) => [`${(value / 20).toFixed(0)}/5`, 'Skor']}
                    />
                    <Radar
                      name="Nilai Anda"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Belum ada data tes fisik. Silakan input di halaman Tes Kondisi Fisik.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Physical Tests Detail Table */}
        {physicalTests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detail Hasil Tes Fisik</CardTitle>
              <CardDescription>Semua hasil tes terbaru dengan skor norma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm">Nama Tes</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Kategori</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Nilai</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Skor</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {physicalTests.map((test) => {
                      const benchmark = allBenchmarks.find((b) => b.testName === test.test_name);
                      const score = benchmark ? calculateScore(test.value, benchmark) : null;
                      const categoryLabels: { [key: string]: string } = {
                        daya_tahan: "Daya Tahan",
                        kecepatan: "Kecepatan",
                        kekuatan: "Kekuatan",
                        kelincahan: "Kelincahan",
                        fleksibilitas: "Fleksibilitas",
                        power: "Power",
                      };
                      return (
                        <tr key={test.id} className="border-b border-border/50 hover:bg-accent/5 transition-colors">
                          <td className="py-3 px-4 font-medium">{test.test_name}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{categoryLabels[test.category] || test.category}</Badge>
                          </td>
                          <td className="py-3 px-4">{test.value} {test.unit}</td>
                          <td className="py-3 px-4">
                            {score ? (
                              <Badge className={getScoreColor(score)}>
                                {score}/5 - {getScoreLabel(score)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(test.test_date).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
}