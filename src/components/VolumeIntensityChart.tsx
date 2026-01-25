import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

type WeekData = {
  week_number: number;
  week_start_date: string;
  planned_volume: number;
  planned_intensity: number;
};

interface VolumeIntensityChartProps {
  weeklyData: WeekData[];
}

export function VolumeIntensityChart({ weeklyData }: VolumeIntensityChartProps) {
  const chartWidth = weeklyData.length * 30;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = Math.max(chartWidth, 600);
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Generate path points
  const volumePoints = useMemo(() => {
    return weeklyData.map((week, idx) => {
      const x = padding.left + (idx / (weeklyData.length - 1 || 1)) * (innerWidth - padding.left - padding.right);
      const y = padding.top + innerHeight - (week.planned_volume / 100) * innerHeight;
      return { x, y, value: week.planned_volume };
    });
  }, [weeklyData, innerWidth, innerHeight]);

  const intensityPoints = useMemo(() => {
    return weeklyData.map((week, idx) => {
      const x = padding.left + (idx / (weeklyData.length - 1 || 1)) * (innerWidth - padding.left - padding.right);
      const y = padding.top + innerHeight - (week.planned_intensity / 100) * innerHeight;
      return { x, y, value: week.planned_intensity };
    });
  }, [weeklyData, innerWidth, innerHeight]);

  const createLinePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    return points.reduce((path, point, idx) => {
      if (idx === 0) return `M ${point.x} ${point.y}`;
      
      // Smooth curve using bezier
      const prev = points[idx - 1];
      const controlX = (prev.x + point.x) / 2;
      return `${path} C ${controlX} ${prev.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
    }, "");
  };

  const createAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    const baseline = padding.top + innerHeight;
    const linePath = createLinePath(points);
    return `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  };

  const yAxisLabels = [0, 25, 50, 75, 100];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Legend */}
        <div className="flex items-center gap-6 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Volume (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Intensitas (%)</span>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative overflow-x-auto">
          <div className="flex">
            {/* Y-Axis Labels (fixed) */}
            <div className="flex-shrink-0 w-12 bg-background relative" style={{ height: chartHeight }}>
              <div className="absolute top-2 right-2 text-[10px] font-bold text-muted-foreground">100%</div>
              <div className="absolute right-2 text-[10px] text-muted-foreground" style={{ top: chartHeight * 0.25 }}>75%</div>
              <div className="absolute right-2 text-[10px] text-muted-foreground" style={{ top: chartHeight * 0.5 - 6 }}>50%</div>
              <div className="absolute right-2 text-[10px] text-muted-foreground" style={{ top: chartHeight * 0.75 - 12 }}>25%</div>
              <div className="absolute bottom-6 right-2 text-[10px] font-bold text-muted-foreground">0%</div>
              
              {/* Axis labels */}
              <div className="absolute left-0 top-1/3 -rotate-90 origin-center text-[9px] font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                VOL
              </div>
              <div className="absolute left-0 top-2/3 -rotate-90 origin-center text-[9px] font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                INT
              </div>
            </div>

            {/* SVG Chart */}
            <div className="flex-1 overflow-x-auto">
              <svg
                width={innerWidth}
                height={chartHeight}
                className="bg-gradient-to-b from-muted/20 to-background"
              >
                {/* Grid lines */}
                {yAxisLabels.map((label) => {
                  const y = padding.top + innerHeight - (label / 100) * innerHeight;
                  return (
                    <line
                      key={label}
                      x1={padding.left}
                      y1={y}
                      x2={innerWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="1"
                      strokeDasharray={label === 0 || label === 100 ? "0" : "4,4"}
                      opacity={label === 50 ? 0.8 : 0.4}
                    />
                  );
                })}

                {/* Vertical grid lines (per week) */}
                {weeklyData.map((_, idx) => {
                  const x = padding.left + (idx / (weeklyData.length - 1 || 1)) * (innerWidth - padding.left - padding.right);
                  return (
                    <line
                      key={idx}
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + innerHeight}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                  );
                })}

                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="volumeAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="intensityAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Volume Area Fill */}
                <path
                  d={createAreaPath(volumePoints)}
                  fill="url(#volumeAreaGradient)"
                />

                {/* Intensity Area Fill */}
                <path
                  d={createAreaPath(intensityPoints)}
                  fill="url(#intensityAreaGradient)"
                />

                {/* Volume Line */}
                <path
                  d={createLinePath(volumePoints)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Intensity Line */}
                <path
                  d={createLinePath(intensityPoints)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Volume data points */}
                {volumePoints.map((point, idx) => (
                  <g key={`vol-${idx}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="2"
                      className="drop-shadow-sm"
                    />
                    <title>Minggu {idx + 1}: Volume {point.value}%</title>
                  </g>
                ))}

                {/* Intensity data points */}
                {intensityPoints.map((point, idx) => (
                  <g key={`int-${idx}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth="2"
                      className="drop-shadow-sm"
                    />
                    <title>Minggu {idx + 1}: Intensitas {point.value}%</title>
                  </g>
                ))}

                {/* Week labels at bottom */}
                {weeklyData.map((week, idx) => {
                  const x = padding.left + (idx / (weeklyData.length - 1 || 1)) * (innerWidth - padding.left - padding.right);
                  // Only show every few labels if there are many weeks
                  const showLabel = weeklyData.length <= 20 || idx % Math.ceil(weeklyData.length / 20) === 0;
                  if (!showLabel) return null;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[9px]"
                    >
                      {week.week_number}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
