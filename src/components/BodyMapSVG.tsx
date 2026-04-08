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
  const t = Math.min(intensity, 1);
  // green → yellow → orange → red
  const r = Math.round(40 + t * 215);
  const g = Math.round(200 - t * 160);
  const b = Math.round(60 - t * 40);
  const alpha = 0.3 + t * 0.5;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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

  const m = (style: React.CSSProperties, color: string) => (
    <div
      className="absolute pointer-events-none transition-all duration-500"
      style={{
        ...style,
        backgroundColor: color,
        borderRadius: "35%",
        mixBlendMode: "screen",
      }}
    />
  );

  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      <img
        src={bodyMapImage}
        alt="Body Map"
        className="w-full h-auto"
        draggable={false}
      />

      {/* ===== FRONT FIGURE (left ~5%-48%) ===== */}

      {/* Shoulders / Deltoids front - small caps on each side */}
      {m({ left: "9%", width: "6%", top: "15.5%", height: "4.5%" }, colors.shoulders)}
      {m({ left: "35%", width: "6%", top: "15.5%", height: "4.5%" }, colors.shoulders)}

      {/* Chest / Pectorals front - left & right pec */}
      {m({ left: "14%", width: "9%", top: "19%", height: "7%" }, colors.chest)}
      {m({ left: "27%", width: "9%", top: "19%", height: "7%" }, colors.chest)}

      {/* Arms front - bicep (upper arm) */}
      {m({ left: "6%", width: "5%", top: "21%", height: "10%" }, colors.arms)}
      {m({ left: "39%", width: "5%", top: "21%", height: "10%" }, colors.arms)}
      {/* Arms front - forearm */}
      {m({ left: "4%", width: "4%", top: "32%", height: "11%" }, colors.arms)}
      {m({ left: "42%", width: "4%", top: "32%", height: "11%" }, colors.arms)}

      {/* Core / Abs - narrow strip down the middle */}
      {m({ left: "18%", width: "14%", top: "26%", height: "14%" }, colors.core)}

      {/* Quads front - left & right thigh */}
      {m({ left: "14%", width: "8%", top: "44%", height: "17%" }, colors.quads)}
      {m({ left: "28%", width: "8%", top: "44%", height: "17%" }, colors.quads)}

      {/* Calves front - left & right */}
      {m({ left: "15%", width: "6%", top: "65%", height: "16%" }, colors.calves)}
      {m({ left: "29%", width: "6%", top: "65%", height: "16%" }, colors.calves)}

      {/* ===== BACK FIGURE (right ~52%-95%) ===== */}

      {/* Shoulders / Rear Deltoids */}
      {m({ left: "56%", width: "6%", top: "15.5%", height: "4.5%" }, colors.shoulders)}
      {m({ left: "83%", width: "6%", top: "15.5%", height: "4.5%" }, colors.shoulders)}

      {/* Back / Traps - upper back center */}
      {m({ left: "62%", width: "10%", top: "16%", height: "6%" }, colors.back)}
      {m({ left: "73%", width: "10%", top: "16%", height: "6%" }, colors.back)}
      {/* Back / Lats - mid back */}
      {m({ left: "61%", width: "8%", top: "22%", height: "10%" }, colors.back)}
      {m({ left: "76%", width: "8%", top: "22%", height: "10%" }, colors.back)}

      {/* Arms back - triceps */}
      {m({ left: "53%", width: "5%", top: "21%", height: "10%" }, colors.arms)}
      {m({ left: "87%", width: "5%", top: "21%", height: "10%" }, colors.arms)}
      {/* Arms back - forearm */}
      {m({ left: "51%", width: "4%", top: "32%", height: "11%" }, colors.arms)}
      {m({ left: "90%", width: "4%", top: "32%", height: "11%" }, colors.arms)}

      {/* Lower back & Glutes */}
      {m({ left: "63%", width: "19%", top: "33%", height: "10%" }, colors.core)}

      {/* Hamstrings - back of thighs */}
      {m({ left: "60%", width: "8%", top: "46%", height: "17%" }, colors.hamstrings)}
      {m({ left: "77%", width: "8%", top: "46%", height: "17%" }, colors.hamstrings)}

      {/* Calves back */}
      {m({ left: "62%", width: "6%", top: "66%", height: "16%" }, colors.calves)}
      {m({ left: "77%", width: "6%", top: "66%", height: "16%" }, colors.calves)}
    </div>
  );
}
