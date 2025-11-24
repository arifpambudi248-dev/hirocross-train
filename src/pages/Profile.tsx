import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, User, Activity, Shield, TrendingUp, Brain, AlertCircle, Camera, Heart, Edit } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { computeReadinessScore } from "@/lib/readiness";
import { assessInjuryRisk, getRiskColor, getRiskBgColor } from "@/lib/injuryRisk";
import { calculateMaxHR, calculateTrainingZones, type TrainingZone } from "@/lib/trainingZones";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

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

      // Load physical tests (latest per category)
      const { data: tests } = await supabase
        .from("physical_tests")
        .select("*")
        .eq("athlete_id", user.id)
        .order("test_date", { ascending: false });
      
      // Get latest test per category
      const latestTests: any[] = [];
      const categories = new Set<string>();
      tests?.forEach((test) => {
        if (!categories.has(test.category)) {
          categories.add(test.category);
          latestTests.push(test);
        }
      });
      setPhysicalTests(latestTests);

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

      if (age < 10 || age > 100) {
        sonnerToast.error("Usia harus antara 10-100 tahun");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          age,
          baseline_rhr: rhr,
          baseline_vj: vj
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

  // Prepare radar chart data
  const benchmarks: { [key: string]: number[] } = {
    "daya_tahan": [2000, 2200, 2400, 2600, 2800],
    "kecepatan": [7.5, 7.0, 6.5, 6.0, 5.5],
    "kekuatan": [40, 50, 60, 70, 80],
    "kelincahan": [20, 18, 16, 14, 12],
    "fleksibilitas": [10, 15, 20, 25, 30],
    "power": [30, 35, 40, 45, 50],
  };

  const radarData = [
    { category: "Daya Tahan", value: 0, benchmark: 0 },
    { category: "Kecepatan", value: 0, benchmark: 0 },
    { category: "Kekuatan", value: 0, benchmark: 0 },
    { category: "Kelincahan", value: 0, benchmark: 0 },
    { category: "Fleksibilitas", value: 0, benchmark: 0 },
    { category: "Power", value: 0, benchmark: 0 },
  ];

  physicalTests.forEach((test) => {
    const categoryMap: { [key: string]: string } = {
      "daya_tahan": "Daya Tahan",
      "kecepatan": "Kecepatan",
      "kekuatan": "Kekuatan",
      "kelincahan": "Kelincahan",
      "fleksibilitas": "Fleksibilitas",
      "power": "Power",
    };
    
    const categoryName = categoryMap[test.category];
    if (categoryName) {
      const dataPoint = radarData.find(d => d.category === categoryName);
      if (dataPoint) {
        const benchmarkArray = benchmarks[test.category];
        const minBench = benchmarkArray[0];
        const maxBench = benchmarkArray[4];
        
        let normalizedValue: number;
        if (test.category === "kecepatan" || test.category === "kelincahan") {
          normalizedValue = ((maxBench - test.value) / (maxBench - minBench)) * 100;
        } else {
          normalizedValue = ((test.value - minBench) / (maxBench - minBench)) * 100;
        }
        
        dataPoint.value = Math.max(0, Math.min(100, normalizedValue));
        dataPoint.benchmark = 60;
      }
    }
  });

  const maxHR = profile?.age ? calculateMaxHR(profile.age) : null;

  return (
    <div className="min-h-screen bg-background">
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
            {profile?.age && (
              <Badge variant="outline" className="mr-2">
                <User className="h-3 w-3 mr-1" />
                {profile.age} tahun
              </Badge>
            )}
            {maxHR && (
              <Badge variant="outline">
                <Heart className="h-3 w-3 mr-1" />
                HR Max: {maxHR} bpm
              </Badge>
            )}
            
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
              <CardDescription>Perbandingan dengan benchmark standar</CardDescription>
            </CardHeader>
            <CardContent>
              {physicalTests.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="category" 
                      stroke="hsl(var(--foreground))"
                    />
                    <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Legend />
                    <Radar
                      name="Nilai Anda"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Benchmark"
                      dataKey="benchmark"
                      stroke="hsl(var(--muted-foreground))"
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.1}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Belum ada data tes fisik
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}