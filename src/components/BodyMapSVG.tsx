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
      {/* Shoulders front */}
      {overlay("left-[8%] w-[10%] top-[18%] h-[7%]", colors.shoulders)}
      {overlay("left-[28%] w-[10%] top-[18%] h-[7%]", colors.shoulders)}

      {/* Chest front */}
      {overlay("left-[13%] w-[20%] top-[22%] h-[10%]", colors.chest)}

      {/* Arms front (biceps/forearms) */}
      {overlay("left-[5%] w-[7%] top-[25%] h-[15%]", colors.arms)}
      {overlay("left-[34%] w-[7%] top-[25%] h-[15%]", colors.arms)}

      {/* Core front (abs) */}
      {overlay("left-[15%] w-[16%] top-[32%] h-[13%]", colors.core)}

      {/* Quads front */}
      {overlay("left-[12%] w-[10%] top-[48%] h-[18%]", colors.quads)}
      {overlay("left-[24%] w-[10%] top-[48%] h-[18%]", colors.quads)}

      {/* Calves front */}
      {overlay("left-[13%] w-[7%] top-[70%] h-[16%]", colors.calves)}
      {overlay("left-[26%] w-[7%] top-[70%] h-[16%]", colors.calves)}

      {/* === BACK FIGURE (right half) === */}
      {/* Shoulders back */}
      {overlay("left-[55%] w-[10%] top-[18%] h-[7%]", colors.shoulders)}
      {overlay("left-[78%] w-[10%] top-[18%] h-[7%]", colors.shoulders)}

      {/* Back (lats/traps) */}
      {overlay("left-[60%] w-[22%] top-[22%] h-[12%]", colors.back)}

      {/* Arms back (triceps/forearms) */}
      {overlay("left-[52%] w-[7%] top-[25%] h-[15%]", colors.arms)}
      {overlay("left-[84%] w-[7%] top-[25%] h-[15%]", colors.arms)}

      {/* Core back (lower back) */}
      {overlay("left-[62%] w-[18%] top-[34%] h-[10%]", colors.core)}

      {/* Hamstrings back */}
      {overlay("left-[59%] w-[10%] top-[48%] h-[18%]", colors.hamstrings)}
      {overlay("left-[73%] w-[10%] top-[48%] h-[18%]", colors.hamstrings)}

      {/* Calves back */}
      {overlay("left-[60%] w-[8%] top-[70%] h-[16%]", colors.calves)}
      {overlay("left-[74%] w-[8%] top-[70%] h-[16%]", colors.calves)}
    </div>
  );
}
