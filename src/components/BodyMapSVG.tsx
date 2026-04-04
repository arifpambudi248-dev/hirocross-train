import { useMemo } from "react";

interface BodyMapSVGProps {
  upperIntensity: number; // 0-1
  lowerIntensity: number; // 0-1
  coreIntensity?: number; // 0-1
}

const getHeatColor = (intensity: number) => {
  if (intensity <= 0) return "hsl(var(--muted))";
  // Interpolate from muted blue to bright orange/red
  const r = Math.round(50 + intensity * 205);
  const g = Math.round(50 + intensity * 100 - intensity * intensity * 100);
  const b = Math.round(80 - intensity * 80);
  const alpha = 0.3 + intensity * 0.7;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getGlowFilter = (intensity: number) => {
  if (intensity <= 0.1) return "none";
  const blur = 4 + intensity * 12;
  return `drop-shadow(0 0 ${blur}px ${getHeatColor(intensity)})`;
};

export function BodyMapSVG({ upperIntensity, lowerIntensity, coreIntensity = 0 }: BodyMapSVGProps) {
  const upperColor = useMemo(() => getHeatColor(upperIntensity), [upperIntensity]);
  const lowerColor = useMemo(() => getHeatColor(lowerIntensity), [lowerIntensity]);
  const coreColor = useMemo(() => getHeatColor(coreIntensity), [coreIntensity]);

  return (
    <svg viewBox="0 0 200 400" className="w-full max-w-[280px] mx-auto" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="100" cy="35" rx="22" ry="28" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      
      {/* Neck */}
      <rect x="92" y="60" width="16" height="14" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />

      {/* Upper Body Group */}
      <g style={{ filter: getGlowFilter(upperIntensity) }}>
        {/* Torso / Chest */}
        <path
          d="M60 74 Q60 70 70 70 L130 70 Q140 70 140 74 L145 130 Q145 140 135 142 L65 142 Q55 140 55 130 Z"
          fill={upperColor}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        {/* Left Shoulder */}
        <ellipse cx="55" cy="82" rx="14" ry="10" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Right Shoulder */}
        <ellipse cx="145" cy="82" rx="14" ry="10" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Left Upper Arm */}
        <rect x="30" y="82" width="18" height="45" rx="8" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Right Upper Arm */}
        <rect x="152" y="82" width="18" height="45" rx="8" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Left Forearm */}
        <rect x="28" y="127" width="16" height="42" rx="7" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Right Forearm */}
        <rect x="156" y="127" width="16" height="42" rx="7" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Left Hand */}
        <ellipse cx="36" cy="175" rx="8" ry="10" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Right Hand */}
        <ellipse cx="164" cy="175" rx="8" ry="10" fill={upperColor} stroke="hsl(var(--border))" strokeWidth="1" />
      </g>

      {/* Core / Abs */}
      <g style={{ filter: getGlowFilter(coreIntensity) }}>
        <path
          d="M65 142 L135 142 Q140 145 138 180 L130 200 Q120 205 100 205 Q80 205 70 200 L62 180 Q60 145 65 142 Z"
          fill={coreColor}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
      </g>

      {/* Lower Body Group */}
      <g style={{ filter: getGlowFilter(lowerIntensity) }}>
        {/* Hip / Glutes */}
        <path
          d="M62 200 Q60 195 65 190 L135 190 Q140 195 138 200 L140 220 Q130 230 100 230 Q70 230 60 220 Z"
          fill={lowerColor}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        {/* Left Thigh */}
        <path
          d="M68 225 Q65 222 67 220 L90 220 Q95 225 93 230 L88 295 Q85 305 78 305 L72 305 Q65 305 63 295 Z"
          fill={lowerColor}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        {/* Right Thigh */}
        <path
          d="M110 220 Q115 222 132 225 L137 295 Q135 305 128 305 L122 305 Q115 305 112 295 L107 230 Q105 225 110 220 Z"
          fill={lowerColor}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        {/* Left Knee */}
        <ellipse cx="75" cy="310" rx="12" ry="8" fill={lowerColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Right Knee */}
        <ellipse cx="125" cy="310" rx="12" ry="8" fill={lowerColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Left Shin */}
        <rect x="66" y="316" width="18" height="48" rx="8" fill={lowerColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Right Shin */}
        <rect x="116" y="316" width="18" height="48" rx="8" fill={lowerColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Left Foot */}
        <ellipse cx="75" cy="372" rx="12" ry="7" fill={lowerColor} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Right Foot */}
        <ellipse cx="125" cy="372" rx="12" ry="7" fill={lowerColor} stroke="hsl(var(--border))" strokeWidth="1" />
      </g>

      {/* Labels */}
      {upperIntensity > 0 && (
        <text x="100" y="110" textAnchor="middle" className="text-[10px] font-bold fill-foreground">
          {Math.round(upperIntensity * 100)}%
        </text>
      )}
      {coreIntensity > 0 && (
        <text x="100" y="175" textAnchor="middle" className="text-[10px] font-bold fill-foreground">
          {Math.round(coreIntensity * 100)}%
        </text>
      )}
      {lowerIntensity > 0 && (
        <text x="100" y="270" textAnchor="middle" className="text-[10px] font-bold fill-foreground">
          {Math.round(lowerIntensity * 100)}%
        </text>
      )}
    </svg>
  );
}
