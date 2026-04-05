import { useMemo } from "react";
import bodyMapImage from "@/assets/body-map.avif";

interface BodyMapSVGProps {
  upperIntensity: number; // 0-1
  lowerIntensity: number; // 0-1
  coreIntensity?: number; // 0-1
}

const getHeatColor = (intensity: number) => {
  if (intensity <= 0) return "transparent";
  const r = Math.round(50 + intensity * 205);
  const g = Math.round(50 + intensity * 100 - intensity * intensity * 100);
  const b = Math.round(80 - intensity * 80);
  const alpha = 0.25 + intensity * 0.45;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function BodyMapSVG({ upperIntensity, lowerIntensity, coreIntensity = 0 }: BodyMapSVGProps) {
  const upperColor = useMemo(() => getHeatColor(upperIntensity), [upperIntensity]);
  const lowerColor = useMemo(() => getHeatColor(lowerIntensity), [lowerIntensity]);
  const coreColor = useMemo(() => getHeatColor(coreIntensity), [coreIntensity]);

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <img
        src={bodyMapImage}
        alt="Body Map"
        className="w-full h-auto rounded-lg"
        draggable={false}
      />
      {/* Upper body overlay — head to mid-torso (~0% to ~38%) */}
      <div
        className="absolute left-[15%] right-[15%] top-[0%] bottom-[62%] rounded-t-lg transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: upperColor }}
      />
      {/* Core overlay — mid-torso to hips (~38% to ~55%) */}
      <div
        className="absolute left-[20%] right-[20%] top-[38%] bottom-[45%] transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: coreColor }}
      />
      {/* Lower body overlay — hips to feet (~55% to ~100%) */}
      <div
        className="absolute left-[10%] right-[10%] top-[55%] bottom-[0%] rounded-b-lg transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: lowerColor }}
      />

      {/* Labels */}
      {upperIntensity > 0 && (
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-foreground shadow">
          {Math.round(upperIntensity * 100)}%
        </div>
      )}
      {coreIntensity > 0 && (
        <div className="absolute top-[43%] left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-foreground shadow">
          {Math.round(coreIntensity * 100)}%
        </div>
      )}
      {lowerIntensity > 0 && (
        <div className="absolute top-[70%] left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-foreground shadow">
          {Math.round(lowerIntensity * 100)}%
        </div>
      )}
    </div>
  );
}
