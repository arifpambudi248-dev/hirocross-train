import { useMemo } from "react";
import bodyMapImage from "@/assets/body-map-detailed.png";

export interface DetailedIntensities {
  chest: number;
  back: number;
  shoulders: number;
  arms: number;
  core: number;
  quads: number;
  hamstrings: number;
  calves: number;
}

interface BodyMapSVGProps {
  intensities: DetailedIntensities;
}

const getHeatColor = (intensity: number) => {
  if (intensity <= 0) return "transparent";
  // green → yellow → red gradient
  const t = Math.min(intensity, 1);
  const r = Math.round(40 + t * 215);
  const g = Math.round(180 - t * 140);
  const b = Math.round(60 - t * 40);
  const alpha = 0.15 + t * 0.45;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Each overlay region is positioned to match the uploaded anatomy image (front + back views)
// The image has two figures side by side: front (left ~0-48%) and back (right ~52-100%)

export function BodyMapSVG({ intensities }: BodyMapSVGProps) {
  const colors = useMemo(() => ({
    chest: getHeatColor(intensities.chest),
    back: getHeatColor(intensities.back),
    shoulders: getHeatColor(intensities.shoulders),
    arms: getHeatColor(intensities.arms),
    core: getHeatColor(intensities.core),
    quads: getHeatColor(intensities.quads),
    hamstrings: getHeatColor(intensities.hamstrings),
    calves: getHeatColor(intensities.calves),
  }), [intensities]);

  const overlay = (className: string, color: string) => (
    <div
      className={`absolute transition-all duration-500 pointer-events-none rounded-sm ${className}`}
      style={{ backgroundColor: color }}
    />
  );

  return (
    <div className="relative w-full max-w-[320px] mx-auto select-none">
      <img
        src={bodyMapImage}
        alt="Body Map"
        className="w-full h-auto"
        draggable={false}
      />

      {/* === FRONT FIGURE (left half) === */}
      {/* Shoulders front – left & right deltoid */}
      {overlay("left-[9%] w-[9%] top-[16%] h-[6%] rounded-md", colors.shoulders)}
      {overlay("left-[33%] w-[9%] top-[16%] h-[6%] rounded-md", colors.shoulders)}

      {/* Chest front – pectorals */}
      {overlay("left-[15%] w-[21%] top-[19%] h-[10%] rounded-md", colors.chest)}

      {/* Arms front – biceps & forearms */}
      {overlay("left-[4%] w-[7%] top-[22%] h-[19%] rounded-md", colors.arms)}
      {overlay("left-[40%] w-[7%] top-[22%] h-[19%] rounded-md", colors.arms)}

      {/* Core front – abs & obliques */}
      {overlay("left-[17%] w-[17%] top-[29%] h-[16%] rounded-md", colors.core)}

      {/* Quads front */}
      {overlay("left-[14%] w-[11%] top-[48%] h-[19%] rounded-md", colors.quads)}
      {overlay("left-[27%] w-[11%] top-[48%] h-[19%] rounded-md", colors.quads)}

      {/* Calves front */}
      {overlay("left-[16%] w-[6%] top-[71%] h-[17%] rounded-md", colors.calves)}
      {overlay("left-[29%] w-[6%] top-[71%] h-[17%] rounded-md", colors.calves)}

      {/* === BACK FIGURE (right half) === */}
      {/* Shoulders back – rear deltoids & traps */}
      {overlay("left-[56%] w-[9%] top-[16%] h-[6%] rounded-md", colors.shoulders)}
      {overlay("left-[80%] w-[9%] top-[16%] h-[6%] rounded-md", colors.shoulders)}

      {/* Back – lats & traps */}
      {overlay("left-[61%] w-[22%] top-[19%] h-[16%] rounded-md", colors.back)}

      {/* Arms back – triceps & forearms */}
      {overlay("left-[51%] w-[7%] top-[22%] h-[19%] rounded-md", colors.arms)}
      {overlay("left-[87%] w-[7%] top-[22%] h-[19%] rounded-md", colors.arms)}

      {/* Core back – lower back & glutes */}
      {overlay("left-[63%] w-[18%] top-[35%] h-[12%] rounded-md", colors.core)}

      {/* Hamstrings back */}
      {overlay("left-[59%] w-[11%] top-[48%] h-[21%] rounded-md", colors.hamstrings)}
      {overlay("left-[74%] w-[11%] top-[48%] h-[21%] rounded-md", colors.hamstrings)}

      {/* Calves back */}
      {overlay("left-[62%] w-[7%] top-[72%] h-[16%] rounded-md", colors.calves)}
      {overlay("left-[76%] w-[7%] top-[72%] h-[16%] rounded-md", colors.calves)}
    </div>
  );
}
