import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

type BiomotorData = {
  week_number: number;
  kekuatan: number;
  kecepatan: number;
  daya_tahan: number;
  teknik: number;
  taktik: number;
};

interface BiomotorComparisonChartProps {
  plannedData: BiomotorData[];
  actualData: BiomotorData[];
  selectedComponent?: string;
}

const BIOMOTOR_COLORS = {
  kekuatan: { planned: "#ef4444", actual: "#fca5a5" },
  kecepatan: { planned: "#eab308", actual: "#fde047" },
  daya_tahan: { planned: "#3b82f6", actual: "#93c5fd" },
  teknik: { planned: "#22c55e", actual: "#86efac" },
  taktik: { planned: "#a855f7", actual: "#d8b4fe" },
};

const COMPONENT_LABELS: Record<string, string> = {
  kekuatan: "Kekuatan",
  kecepatan: "Kecepatan",
  daya_tahan: "Daya Tahan",
  teknik: "Teknik",
  taktik: "Taktik",
};

export function BiomotorComparisonChart({
  plannedData,
  actualData,
  selectedComponent = "all",
}: BiomotorComparisonChartProps) {
  // Calculate aggregate totals per component across all weeks
  const aggregateData = useMemo(() => {
    const components = ["kekuatan", "kecepatan", "daya_tahan", "teknik", "taktik"] as const;
    
    return components.map((comp) => {
      const totalPlanned = plannedData.reduce((sum, d) => sum + (d[comp] || 0), 0);
      const totalActual = actualData.reduce((sum, d) => sum + (d[comp] || 0), 0);
      const percentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
      
      return {
        component: COMPONENT_LABELS[comp],
        key: comp,
        planned: totalPlanned,
        actual: totalActual,
        percentage,
      };
    });
  }, [plannedData, actualData]);

  // Weekly data for a specific component
  const weeklyChartData = useMemo(() => {
    if (selectedComponent === "all") return null;
    
    const comp = selectedComponent as keyof BiomotorData;
    
    return plannedData.map((p) => {
      const actual = actualData.find((a) => a.week_number === p.week_number);
      return {
        week: `M${p.week_number}`,
        week_number: p.week_number,
        planned: p[comp] || 0,
        actual: actual?.[comp] || 0,
        percentage: p[comp] > 0 ? Math.round(((actual?.[comp] || 0) / Number(p[comp])) * 100) : 0,
      };
    });
  }, [plannedData, actualData, selectedComponent]);

  const getBarColor = (percentage: number, isActual: boolean) => {
    if (!isActual) return "hsl(var(--muted-foreground))";
    if (percentage >= 90) return "#22c55e";
    if (percentage >= 70) return "#eab308";
    return "#ef4444";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Perbandingan Planned vs Actual Biomotor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Aggregate Bar Chart - All Components */}
        <div>
          <h4 className="text-sm font-medium mb-3">Total Per Komponen</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={aggregateData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              />
              <YAxis 
                type="category" 
                dataKey="component" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name === "planned" ? "Target" : "Aktual",
                ]}
              />
              <Legend 
                formatter={(value) => value === "planned" ? "Target" : "Aktual"}
              />
              <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" name="planned" barSize={20} radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual" name="actual" barSize={20} radius={[0, 4, 4, 0]}>
                {aggregateData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage, true)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-2">
          {aggregateData.map((item) => (
            <div
              key={item.key}
              className="text-center p-3 rounded-lg border"
              style={{ 
                backgroundColor: item.percentage >= 90 
                  ? "rgba(34, 197, 94, 0.1)" 
                  : item.percentage >= 70 
                    ? "rgba(234, 179, 8, 0.1)" 
                    : "rgba(239, 68, 68, 0.1)" 
              }}
            >
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {item.component}
              </div>
              <div className={`text-lg font-bold ${
                item.percentage >= 90 
                  ? "text-green-600 dark:text-green-400" 
                  : item.percentage >= 70 
                    ? "text-yellow-600 dark:text-yellow-400" 
                    : "text-red-600 dark:text-red-400"
              }`}>
                {item.percentage}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {item.actual.toLocaleString()} / {item.planned.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Breakdown (if a component is selected) */}
        {weeklyChartData && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Detail Mingguan - {COMPONENT_LABELS[selectedComponent]}
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={weeklyChartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="week" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(),
                    name === "planned" ? "Target" : "Aktual",
                  ]}
                />
                <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" name="planned" barSize={12} />
                <Bar dataKey="actual" name="actual" barSize={12}>
                  {weeklyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage, true)} />
                  ))}
                </Bar>
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
