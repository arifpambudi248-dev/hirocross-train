import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Dumbbell, Timer } from "lucide-react";

const VCR_ZONES = [60, 70, 80, 85, 90, 95, 100, 105];

// Estimate reps for a given % 1RM (Epley-derived approximation)
const estimateRepsForPercent = (pct: number): string => {
  if (pct <= 50) return "20+";
  if (pct <= 60) return "15-18";
  if (pct <= 70) return "10-12";
  if (pct <= 75) return "8-10";
  if (pct <= 80) return "6-8";
  if (pct <= 85) return "4-6";
  if (pct <= 90) return "3-4";
  if (pct <= 95) return "2";
  return "1";
};

interface TrainingRecommendationCardProps {
  athleteId: string;
  weekIntensityPercent: number; // from annual plan e.g. 70
  weekVolumePercent: number;
}

export function TrainingRecommendationCard({
  athleteId,
  weekIntensityPercent,
  weekVolumePercent,
}: TrainingRecommendationCardProps) {
  const [vcrValue, setVcrValue] = useState<number | null>(null);
  const [oneRMTests, setOneRMTests] = useState<{ test_name: string; value: number; unit: string }[]>([]);
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const [lapDistance, setLapDistance] = useState(400);

  useEffect(() => {
    if (!athleteId) return;
    fetchTestData();
  }, [athleteId]);

  const fetchTestData = async () => {
    // Fetch latest VCr test
    const { data: vcrData } = await supabase
      .from("physical_tests")
      .select("value")
      .eq("athlete_id", athleteId)
      .eq("test_name", "VCr (Velocity at Cruise)")
      .order("test_date", { ascending: false })
      .limit(1);

    if (vcrData && vcrData.length > 0) {
      setVcrValue(vcrData[0].value);
    }

    // Fetch latest 1RM tests
    const { data: rmData } = await supabase
      .from("physical_tests")
      .select("test_name, value, unit")
      .eq("athlete_id", athleteId)
      .like("test_name", "%1RM%")
      .order("test_date", { ascending: false });

    if (rmData) {
      // Get latest per test name
      const latest = new Map<string, { test_name: string; value: number; unit: string }>();
      rmData.forEach((d) => {
        if (!latest.has(d.test_name)) latest.set(d.test_name, d);
      });
      setOneRMTests(Array.from(latest.values()));
    }

    // Fetch body weight
    const { data: profile } = await supabase
      .from("profiles")
      .select("body_weight")
      .eq("id", athleteId)
      .single();

    if (profile?.body_weight) setBodyWeight(profile.body_weight);
  };

  // Determine recommended endurance intensity based on weekly plan intensity
  const getRecommendedVCrZone = (): number => {
    if (weekIntensityPercent <= 40) return 70;
    if (weekIntensityPercent <= 55) return 80;
    if (weekIntensityPercent <= 70) return 85;
    if (weekIntensityPercent <= 85) return 90;
    if (weekIntensityPercent <= 95) return 95;
    return 100;
  };

  const getRecommended1RMPercent = (): number => {
    if (weekIntensityPercent <= 40) return 50;
    if (weekIntensityPercent <= 55) return 60;
    if (weekIntensityPercent <= 70) return 70;
    if (weekIntensityPercent <= 85) return 80;
    if (weekIntensityPercent <= 95) return 85;
    return 90;
  };

  const recommendedVCrZone = getRecommendedVCrZone();
  const recommended1RMPercent = getRecommended1RMPercent();

  if (!vcrValue && oneRMTests.length === 0) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs.toFixed(0)}s`;
    return `${secs.toFixed(1)}s`;
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Rekomendasi Latihan Hari Ini (Int. {weekIntensityPercent}%)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* VCr Endurance Recommendation */}
        {vcrValue && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">Daya Tahan (VCr: {vcrValue.toFixed(2)} m/s)</span>
              <Badge variant="outline" className="text-xs">Target: {recommendedVCrZone}% VCr</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-16">Zona</TableHead>
                    <TableHead className="text-xs">Kecepatan</TableHead>
                    <TableHead className="text-xs">Lap {lapDistance}m</TableHead>
                    <TableHead className="text-xs">Pace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VCR_ZONES.map((pct) => {
                    const speed = vcrValue * (pct / 100);
                    const lapTime = lapDistance / speed;
                    const paceSecPerKm = 1000 / speed;
                    const paceMins = Math.floor(paceSecPerKm / 60);
                    const paceSecs = Math.floor(paceSecPerKm % 60);
                    const isRecommended = pct === recommendedVCrZone;

                    return (
                      <TableRow
                        key={pct}
                        className={isRecommended ? "bg-blue-50 dark:bg-blue-950/30 font-semibold" : ""}
                      >
                        <TableCell className="text-xs py-1">
                          <Badge
                            variant={isRecommended ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {pct}%{isRecommended ? " ★" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1">{speed.toFixed(2)} m/s</TableCell>
                        <TableCell className="text-xs py-1">{formatTime(lapTime)}</TableCell>
                        <TableCell className="text-xs py-1">{paceMins}:{paceSecs.toString().padStart(2, "0")}/km</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* 1RM Strength Recommendation */}
        {oneRMTests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold">Kekuatan</span>
              <Badge variant="outline" className="text-xs">Target: {recommended1RMPercent}% 1RM</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Latihan</TableHead>
                    <TableHead className="text-xs">1RM</TableHead>
                    <TableHead className="text-xs">{recommended1RMPercent}% 1RM</TableHead>
                    <TableHead className="text-xs">Est. Reps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oneRMTests.map((test) => {
                    const absoluteRM = test.unit === "x BW" && bodyWeight
                      ? test.value * bodyWeight
                      : test.value;
                    const targetLoad = absoluteRM * (recommended1RMPercent / 100);
                    
                    // Estimate reps from % 1RM
                    let estReps = "1";
                    if (recommended1RMPercent <= 50) estReps = "20+";
                    else if (recommended1RMPercent <= 60) estReps = "15-18";
                    else if (recommended1RMPercent <= 70) estReps = "10-12";
                    else if (recommended1RMPercent <= 75) estReps = "8-10";
                    else if (recommended1RMPercent <= 80) estReps = "6-8";
                    else if (recommended1RMPercent <= 85) estReps = "4-6";
                    else if (recommended1RMPercent <= 90) estReps = "3-4";
                    else if (recommended1RMPercent <= 95) estReps = "2";
                    else estReps = "1";

                    return (
                      <TableRow key={test.test_name}>
                        <TableCell className="text-xs py-1 font-medium">
                          {test.test_name.replace(" 1RM", "")}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {test.unit === "x BW" && bodyWeight
                            ? `${absoluteRM.toFixed(1)} kg (${test.value}×BW)`
                            : `${test.value} ${test.unit}`}
                        </TableCell>
                        <TableCell className="text-xs py-1 font-semibold text-primary">
                          {targetLoad.toFixed(1)} kg
                        </TableCell>
                        <TableCell className="text-xs py-1">{estReps}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
