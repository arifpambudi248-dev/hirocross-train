import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dumbbell } from "lucide-react";

const RM_PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
const RM_REPS_MAP: Record<number, string> = {
  100: "1 RM",
  95: "2 reps",
  90: "3-4 reps",
  85: "5-6 reps",
  80: "7-8 reps",
  75: "9-10 reps",
  70: "11-12 reps",
  65: "13-15 reps",
  60: "16-18 reps",
  55: "19-20 reps",
  50: "20+ reps",
};

interface OneRMCalculatorProps {
  onOneRMCalculated?: (oneRM: number) => void;
  exerciseName?: string;
}

/**
 * Epley Formula: 1RM = weight × (1 + reps / 30)
 * Brzycki Formula: 1RM = weight × (36 / (37 - reps))
 * We use average of both for better estimation
 */
function calculateOneRM(weight: number, reps: number): { epley: number; brzycki: number; average: number } {
  if (reps <= 0 || weight <= 0) return { epley: 0, brzycki: 0, average: 0 };
  if (reps === 1) return { epley: weight, brzycki: weight, average: weight };

  const epley = weight * (1 + reps / 30);
  const brzycki = reps < 37 ? weight * (36 / (37 - reps)) : weight * (1 + reps / 30);
  const average = (epley + brzycki) / 2;

  return { epley, brzycki, average };
}

export function OneRMCalculator({ onOneRMCalculated, exerciseName }: OneRMCalculatorProps) {
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>("");
  const [customExercise, setCustomExercise] = useState<string>(exerciseName || "");

  const weightNum = parseFloat(weight) || 0;
  const repsNum = parseInt(reps) || 0;
  const result = calculateOneRM(weightNum, repsNum);

  useEffect(() => {
    if (result.average > 0 && onOneRMCalculated) {
      onOneRMCalculated(result.average);
    }
  }, [result.average, onOneRMCalculated]);

  return (
    <div className="space-y-4">
      {/* Exercise Name */}
      <div className="space-y-2">
        <Label>Nama Latihan / Item Tes</Label>
        <Input
          value={customExercise}
          onChange={(e) => setCustomExercise(e.target.value)}
          placeholder="contoh: Back Squat, Bench Press, Deadlift..."
        />
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Berat Beban (kg)
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="contoh: 80"
          />
        </div>
        <div className="space-y-2">
          <Label>Jumlah Repetisi</Label>
          <Input
            type="number"
            step="1"
            min="1"
            max="30"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="contoh: 5"
          />
        </div>
      </div>

      {/* 1RM Result */}
      {result.average > 0 && (
        <>
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="text-center mb-3">
                {customExercise && (
                  <p className="text-sm font-medium text-muted-foreground mb-1">{customExercise}</p>
                )}
                <p className="text-3xl font-bold text-primary">{result.average.toFixed(1)} kg</p>
                <p className="text-sm text-muted-foreground">Estimasi 1 RM</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center text-xs">
                <div className="p-2 bg-secondary/50 rounded">
                  <p className="text-muted-foreground">Epley Formula</p>
                  <p className="font-semibold">{result.epley.toFixed(1)} kg</p>
                  <p className="text-muted-foreground font-mono">W × (1 + R/30)</p>
                </div>
                <div className="p-2 bg-secondary/50 rounded">
                  <p className="text-muted-foreground">Brzycki Formula</p>
                  <p className="font-semibold">{result.brzycki.toFixed(1)} kg</p>
                  <p className="text-muted-foreground font-mono">W × 36/(37-R)</p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Input: {weightNum} kg × {repsNum} reps
              </p>
            </CardContent>
          </Card>

          {/* RM Percentage Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                Tabel Persentase 1RM {customExercise && `— ${customExercise}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">% 1RM</TableHead>
                    <TableHead>Beban (kg)</TableHead>
                    <TableHead>Estimasi Reps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RM_PERCENTAGES.map((pct) => {
                    const loadKg = result.average * (pct / 100);
                    const isMax = pct === 100;
                    return (
                      <TableRow key={pct} className={isMax ? "bg-primary/10 font-semibold" : ""}>
                        <TableCell>
                          <Badge variant={isMax ? "default" : "outline"} className="text-xs">
                            {pct}%
                          </Badge>
                        </TableCell>
                        <TableCell>{loadKg.toFixed(1)} kg</TableCell>
                        <TableCell>{RM_REPS_MAP[pct]}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export { calculateOneRM };
