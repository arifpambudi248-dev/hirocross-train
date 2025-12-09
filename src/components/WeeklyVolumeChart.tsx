import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import { format, startOfWeek, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface SessionExercise {
  exercise_type: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  distance_meters: number | null;
  repetitions: number | null;
}

interface TrainingSession {
  date: string;
  exercises?: SessionExercise[];
}

interface WeeklyVolumeChartProps {
  sessions: TrainingSession[];
}

export function WeeklyVolumeChart({ sessions }: WeeklyVolumeChartProps) {
  const weeklyData = useMemo(() => {
    // Group sessions by week
    const weekMap = new Map<string, {
      strengthVolume: number;
      cardioVolume: number;
      skillVolume: number;
      sessionCount: number;
      weekStart: Date;
    }>();

    sessions.forEach(session => {
      if (!session.exercises || session.exercises.length === 0) return;

      const sessionDate = parseISO(session.date);
      const weekStart = startOfWeek(sessionDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, "yyyy-MM-dd");

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          strengthVolume: 0,
          cardioVolume: 0,
          skillVolume: 0,
          sessionCount: 0,
          weekStart
        });
      }

      const weekData = weekMap.get(weekKey)!;
      weekData.sessionCount++;

      session.exercises.forEach(ex => {
        if (ex.exercise_type === "strength") {
          weekData.strengthVolume += (ex.sets || 0) * (ex.reps || 0) * (ex.weight_kg || 0);
        } else if (ex.exercise_type === "cardio") {
          weekData.cardioVolume += ex.distance_meters || 0;
        } else if (ex.exercise_type === "skill") {
          weekData.skillVolume += ex.repetitions || 0;
        }
      });
    });

    // Convert to array and sort by date
    return Array.from(weekMap.entries())
      .map(([key, data]) => ({
        week: format(data.weekStart, "dd MMM", { locale: localeId }),
        weekKey: key,
        strengthVolume: Math.round(data.strengthVolume),
        strengthVolumeKg: Math.round(data.strengthVolume / 1000), // in thousands
        cardioVolume: Math.round(data.cardioVolume / 1000 * 10) / 10, // in km
        skillVolume: data.skillVolume,
        sessionCount: data.sessionCount
      }))
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
      .slice(-12); // Last 12 weeks
  }, [sessions]);

  if (weeklyData.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-white">Progres Volume Latihan Mingguan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-center py-8">
            Belum ada data latihan dengan detail. Tambahkan detail latihan untuk melihat grafik progres.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasStrength = weeklyData.some(d => d.strengthVolume > 0);
  const hasCardio = weeklyData.some(d => d.cardioVolume > 0);
  const hasSkill = weeklyData.some(d => d.skillVolume > 0);

  // Calculate trend (simple linear regression for strength)
  const calculateTrend = () => {
    if (weeklyData.length < 2) return null;
    const n = weeklyData.length;
    const sumX = weeklyData.reduce((sum, _, i) => sum + i, 0);
    const sumY = weeklyData.reduce((sum, d) => sum + d.strengthVolume, 0);
    const sumXY = weeklyData.reduce((sum, d, i) => sum + i * d.strengthVolume, 0);
    const sumX2 = weeklyData.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgVolume = sumY / n;
    const percentChange = avgVolume > 0 ? (slope / avgVolume) * 100 : 0;
    
    return { slope, percentChange };
  };

  const trend = calculateTrend();

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white">Progres Volume Latihan Mingguan</CardTitle>
          {trend && hasStrength && (
            <div className={`text-sm px-2 py-1 rounded ${trend.slope > 0 ? 'bg-green-500/20 text-green-400' : trend.slope < 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
              {trend.slope > 0 ? '↑' : trend.slope < 0 ? '↓' : '→'} {Math.abs(trend.percentChange).toFixed(1)}% / minggu
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Strength Volume Chart */}
        {hasStrength && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full" />
              Volume Strength (kg)
            </h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#475569' }}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f8fafc' }}
                    formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
                  />
                  <Bar 
                    dataKey="strengthVolume" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    name="Volume"
                  />
                  <Line
                    type="monotone"
                    dataKey="strengthVolume"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={false}
                    name="Trend"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Combined Cardio & Skill Chart */}
        {(hasCardio || hasSkill) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasCardio && (
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full" />
                  Jarak Cardio (km)
                </h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="week" 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={{ stroke: '#475569' }}
                      />
                      <YAxis 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={{ stroke: '#475569' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} km`, 'Jarak']}
                      />
                      <Bar dataKey="cardioVolume" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {hasSkill && (
              <div>
                <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full" />
                  Repetisi Skill
                </h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="week" 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={{ stroke: '#475569' }}
                      />
                      <YAxis 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={{ stroke: '#475569' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} rep`, 'Repetisi']}
                      />
                      <Bar dataKey="skillVolume" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-center">
          {hasStrength && (
            <div>
              <div className="text-xs text-slate-400">Total Strength</div>
              <div className="text-lg font-bold text-blue-400">
                {(weeklyData.reduce((sum, d) => sum + d.strengthVolume, 0) / 1000).toFixed(0)}t
              </div>
            </div>
          )}
          {hasCardio && (
            <div>
              <div className="text-xs text-slate-400">Total Cardio</div>
              <div className="text-lg font-bold text-green-400">
                {weeklyData.reduce((sum, d) => sum + d.cardioVolume, 0).toFixed(1)} km
              </div>
            </div>
          )}
          {hasSkill && (
            <div>
              <div className="text-xs text-slate-400">Total Skill</div>
              <div className="text-lg font-bold text-orange-400">
                {weeklyData.reduce((sum, d) => sum + d.skillVolume, 0).toLocaleString()} rep
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
