import { useMemo } from "react";
import bodyMapImage from "@/assets/body-map.png";

interface BodyMapSVGProps {
  upperIntensity: number;
  lowerIntensity: number;
  coreIntensity?: number;
}

const getHeatColor = (intensity: number) => {
  if (intensity <= 0) return "transparent";
  const r = Math.round(50 + intensity * 205);
  const g = Math.round(50 + intensity * 100 - intensity * intensity * 100);
  const b = Math.round(80 - intensity * 80);
  const alpha = 0.2 + intensity * 0.4;
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
        className="w-full h-auto"
        draggable={false}
      />
      {/* Upper body overlay — head to chest/shoulders (~4% to ~35%) */}
      <div
        className="absolute left-[5%] right-[52%] top-[4%] bottom-[65%] rounded-lg transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: upperColor }}
      />
      <div
        className="absolute left-[52%] right-[5%] top-[4%] bottom-[65%] rounded-lg transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: upperColor }}
      />
      {/* Core overlay — abs/lower back (~35% to ~48%) */}
      <div
        className="absolute left-[12%] right-[58%] top-[35%] bottom-[52%] transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: coreColor }}
      />
      <div
        className="absolute left-[58%] right-[12%] top-[35%] bottom-[52%] transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: coreColor }}
      />
      {/* Lower body overlay — hips to feet (~48% to ~96%) */}
      <div
        className="absolute left-[8%] right-[55%] top-[48%] bottom-[4%] rounded-b-lg transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: lowerColor }}
      />
      <div
        className="absolute left-[55%] right-[8%] top-[48%] bottom-[4%] rounded-b-lg transition-all duration-500 pointer-events-none"
        style={{ backgroundColor: lowerColor }}
      />

      {/* Labels */}
      {upperIntensity > 0 && (
        <div className="absolute top-[18%] left-[25%] -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-foreground shadow">
          {Math.round(upperIntensity * 100)}%
        </div>
      )}
      {coreIntensity > 0 && (
        <div className="absolute top-[40%] left-[25%] -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-foreground shadow">
          {Math.round(coreIntensity * 100)}%
        </div>
      )}
      {lowerIntensity > 0 && (
        <div className="absolute top-[68%] left-[25%] -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-foreground shadow">
          {Math.round(lowerIntensity * 100)}%
        </div>
      )}
    </div>
  );
}