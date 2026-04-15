import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Timer, Ruler, Zap } from "lucide-react";

const DEFAULT_INTENSITIES = [60, 70, 80, 85, 90, 95, 100, 105, 110];

interface VCrCalculatorProps {
  onVCrCalculated?: (vcr: number) => void;
  initialDistance?: number;
  initialTime?: number;
}

export function VCrCalculator({ onVCrCalculated, initialDistance, initialTime }: VCrCalculatorProps) {
  const [distanceKm, setDistanceKm] = useState<string>(initialDistance?.toString() || "");
  const [timeMin, setTimeMin] = useState<string>(initialTime?.toString() || "");
  const [lapDistance, setLapDistance] = useState<string>("400");

  const distanceM = distanceKm ? parseFloat(distanceKm) * 1000 : 0;
  const timeSec = timeMin ? parseFloat(timeMin) * 60 : 0;
  const vcr = distanceM > 0 && timeSec > 0 ? distanceM / timeSec : 0;
  const lapDistanceNum = parseFloat(lapDistance) || 400;

  useEffect(() => {
    if (vcr > 0 && onVCrCalculated) {
      onVCrCalculated(vcr);
    }
  }, [vcr, onVCrCalculated]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs.toFixed(1)}s`;
    }
    return `${secs.toFixed(1)}s`;
  };

  return (
    <div className="space-y-4">
      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Jarak Lari (km)
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            placeholder="contoh: 8"
          />
          {distanceKm && (
            <p className="text-xs text-muted-foreground">
              = <strong>{distanceM.toLocaleString()}</strong> meter
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Waktu Lari (menit)
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={timeMin}
            onChange={(e) => setTimeMin(e.target.value)}
            placeholder="contoh: 30"
          />
          {timeMin && (
            <p className="text-xs text-muted-foreground">
              = <strong>{timeSec.toLocaleString()}</strong> detik
            </p>
          )}
        </div>
      </div>

      {/* VCr Result */}
      {vcr > 0 && (
        <>
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Perhitungan VCr</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    {distanceM.toLocaleString()}m ÷ {timeSec.toLocaleString()}s
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{vcr.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">m/detik (100%)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lap Distance Setting */}
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap text-sm">Keliling Lintasan:</Label>
            <Input
              type="number"
              step="1"
              min="50"
              value={lapDistance}
              onChange={(e) => setLapDistance(e.target.value)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">meter</span>
          </div>

          {/* Intensity Zone Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Zona Intensitas VCr — Lintasan {lapDistanceNum}m
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Intensitas</TableHead>
                    <TableHead>Kecepatan (m/s)</TableHead>
                    <TableHead>Pace (min/km)</TableHead>
                    <TableHead>Waktu per Lap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEFAULT_INTENSITIES.map((pct) => {
                    const speed = vcr * (pct / 100);
                    const lapTime = speed > 0 ? lapDistanceNum / speed : 0;
                    const paceSecPerKm = speed > 0 ? 1000 / speed : 0;
                    const paceMins = Math.floor(paceSecPerKm / 60);
                    const paceSecs = Math.floor(paceSecPerKm % 60);

                    const isHighlight = pct === 100;
                    return (
                      <TableRow key={pct} className={isHighlight ? "bg-primary/10 font-semibold" : ""}>
                        <TableCell>
                          <Badge variant={isHighlight ? "default" : "outline"} className="text-xs">
                            {pct}%
                          </Badge>
                        </TableCell>
                        <TableCell>{speed.toFixed(2)} m/s</TableCell>
                        <TableCell>{paceMins}:{paceSecs.toString().padStart(2, "0")} /km</TableCell>
                        <TableCell>{formatTime(lapTime)}</TableCell>
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
