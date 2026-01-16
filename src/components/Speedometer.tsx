import { useMemo } from "react";

interface SpeedometerProps {
  value: number; // 0-100 percentage
  size?: number;
  label?: string;
  showValue?: boolean;
}

export function Speedometer({ value, size = 200, label, showValue = true }: SpeedometerProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const { color, gradientId, category } = useMemo(() => {
    const id = `speedometer-gradient-${Math.random().toString(36).substring(7)}`;
    if (clampedValue >= 80) {
      return { color: "hsl(142, 76%, 36%)", gradientId: id, category: "Excellent" };
    } else if (clampedValue >= 60) {
      return { color: "hsl(217, 91%, 60%)", gradientId: id, category: "Baik" };
    } else if (clampedValue >= 40) {
      return { color: "hsl(45, 93%, 47%)", gradientId: id, category: "Cukup" };
    } else if (clampedValue >= 20) {
      return { color: "hsl(25, 95%, 53%)", gradientId: id, category: "Kurang" };
    } else {
      return { color: "hsl(0, 84%, 60%)", gradientId: id, category: "Sangat Kurang" };
    }
  }, [clampedValue]);

  const strokeWidth = size * 0.12;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  // Arc from 135° to 405° (270° total sweep)
  const startAngle = 135;
  const endAngle = 405;
  const sweepAngle = endAngle - startAngle;
  
  // Calculate the end angle for the value
  const valueAngle = startAngle + (clampedValue / 100) * sweepAngle;
  
  // Convert to radians
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  
  // Calculate arc path
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
    x: cx + r * Math.cos(toRadians(angle)),
    y: cy + r * Math.sin(toRadians(angle)),
  });
  
  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const startPoint = polarToCartesian(cx, cy, r, start);
    const endPoint = polarToCartesian(cx, cy, r, end);
    const largeArcFlag = end - start <= 180 ? 0 : 1;
    
    return [
      "M", startPoint.x, startPoint.y,
      "A", r, r, 0, largeArcFlag, 1, endPoint.x, endPoint.y,
    ].join(" ");
  };
  
  // Needle calculation
  const needleAngle = valueAngle;
  const needleLength = radius * 0.7;
  const needleEnd = polarToCartesian(center, center, needleLength, needleAngle);
  
  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(0, 84%, 60%)" />
            <stop offset="25%" stopColor="hsl(25, 95%, 53%)" />
            <stop offset="50%" stopColor="hsl(45, 93%, 47%)" />
            <stop offset="75%" stopColor="hsl(217, 91%, 60%)" />
            <stop offset="100%" stopColor="hsl(142, 76%, 36%)" />
          </linearGradient>
        </defs>
        
        {/* Background arc */}
        <path
          d={describeArc(center, center, radius, startAngle, endAngle)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Value arc with gradient */}
        {clampedValue > 0 && (
          <path
            d={describeArc(center, center, radius, startAngle, valueAngle)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        
        {/* Tick marks */}
        {[0, 20, 40, 60, 80, 100].map((tick) => {
          const tickAngle = startAngle + (tick / 100) * sweepAngle;
          const innerR = radius - strokeWidth / 2 - 5;
          const outerR = radius - strokeWidth / 2 - 15;
          const inner = polarToCartesian(center, center, innerR, tickAngle);
          const outer = polarToCartesian(center, center, outerR, tickAngle);
          const labelPos = polarToCartesian(center, center, outerR - 12, tickAngle);
          
          return (
            <g key={tick}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={size * 0.055}
                fontWeight="500"
              >
                {tick}
              </text>
            </g>
          );
        })}
        
        {/* Needle */}
        <line
          x1={center}
          y1={center}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        
        {/* Center circle */}
        <circle
          cx={center}
          cy={center}
          r={strokeWidth * 0.6}
          fill={color}
        />
        
        {/* Value display */}
        {showValue && (
          <>
            <text
              x={center}
              y={center + radius * 0.35}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize={size * 0.14}
              fontWeight="bold"
            >
              {clampedValue.toFixed(0)}%
            </text>
            <text
              x={center}
              y={center + radius * 0.55}
              textAnchor="middle"
              fill={color}
              fontSize={size * 0.07}
              fontWeight="600"
            >
              {category}
            </text>
          </>
        )}
      </svg>
      
      {label && (
        <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
      )}
    </div>
  );
}

// Mini speedometer for inline display
export function MiniSpeedometer({ value, size = 60 }: { value: number; size?: number }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const color = useMemo(() => {
    if (clampedValue >= 80) return "hsl(142, 76%, 36%)";
    if (clampedValue >= 60) return "hsl(217, 91%, 60%)";
    if (clampedValue >= 40) return "hsl(45, 93%, 47%)";
    if (clampedValue >= 20) return "hsl(25, 95%, 53%)";
    return "hsl(0, 84%, 60%)";
  }, [clampedValue]);

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 270 degrees
  const strokeDashoffset = circumference * (1 - clampedValue / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-[135deg]">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference * 0.33}`}
          strokeLinecap="round"
        />
        {/* Value circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span 
        className="absolute font-bold text-xs"
        style={{ color }}
      >
        {clampedValue.toFixed(0)}%
      </span>
    </div>
  );
}
