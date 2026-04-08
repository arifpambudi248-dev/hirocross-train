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
  const alpha = 0.25 + t * 0.5;
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

  // Narrow, precise overlay matching individual muscle shapes
  const m = (style: React.CSSProperties, color: string) => (
    <div
      className="absolute pointer-events-none transition-all duration-500"
      style={{
        ...style,
        backgroundColor: color,
        borderRadius: "40%",
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

      {/* ===== FRONT FIGURE (left ~8%-46%) ===== */}

      {/* Shoulders / Deltoids front */}
      {m({ left: "10%", width: "7%", top: "17%", height: "5%" }, colors.shoulders)}
      {m({ left: "34%", width: "7%", top: "17%", height: "5%" }, colors.shoulders)}

      {/* Chest / Pectorals - left & right pec separately */}
      {m({ left: "15%", width: "9%", top: "20%", height: "7%" }, colors.chest)}
      {m({ left: "27%", width: "9%", top: "20%", height: "7%" }, colors.chest)}

      {/* Arms front - upper arm (bicep) */}
      {m({ left: "7%", width: "5%", top: "23%", height: "11%" }, colors.arms)}
      {m({ left: "39%", width: "5%", top: "23%", height: "11%" }, colors.arms)}
      {/* Arms front - forearm */}
      {m({ left: "5%", width: "4%", top: "35%", height: "10%" }, colors.arms)}
      {m({ left: "42%", width: "4%", top: "35%", height: "10%" }, colors.arms)}

      {/* Core / Abs */}
      {m({ left: "19%", width: "13%", top: "27%", height: "15%" }, colors.core)}

      {/* Quads front - left & right */}
      {m({ left: "15%", width: "7%", top: "48%", height: "16%" }, colors.quads)}
      {m({ left: "28%", width: "7%", top: "48%", height: "16%" }, colors.quads)}

      {/* Calves front */}
      {m({ left: "16%", width: "5%", top: "67%", height: "14%" }, colors.calves)}
      {m({ left: "30%", width: "5%", top: "67%", height: "14%" }, colors.calves)}

      {/* ===== BACK FIGURE (right ~54%-92%) ===== */}

      {/* Shoulders / Rear Deltoids */}
      {m({ left: "55%", width: "7%", top: "17%", height: "5%" }, colors.shoulders)}
      {m({ left: "82%", width: "7%", top: "17%", height: "5%" }, colors.shoulders)}

      {/* Back / Lats & Traps - upper */}
      {m({ left: "61%", width: "10%", top: "20%", height: "8%" }, colors.back)}
      {m({ left: "73%", width: "10%", top: "20%", height: "8%" }, colors.back)}
      {/* Back / Lats - lower */}
      {m({ left: "62%", width: "8%", top: "28%", height: "8%" }, colors.back)}
      {m({ left: "74%", width: "8%", top: "28%", height: "8%" }, colors.back)}

      {/* Arms back - triceps */}
      {m({ left: "52%", width: "5%", top: "23%", height: "11%" }, colors.arms)}
      {m({ left: "87%", width: "5%", top: "23%", height: "11%" }, colors.arms)}
      {/* Arms back - forearm */}
      {m({ left: "50%", width: "4%", top: "35%", height: "10%" }, colors.arms)}
      {m({ left: "90%", width: "4%", top: "35%", height: "10%" }, colors.arms)}

      {/* Core back / Lower back & Glutes */}
      {m({ left: "64%", width: "16%", top: "37%", height: "10%" }, colors.core)}

      {/* Hamstrings */}
      {m({ left: "60%", width: "7%", top: "50%", height: "16%" }, colors.hamstrings)}
      {m({ left: "77%", width: "7%", top: "50%", height: "16%" }, colors.hamstrings)}

      {/* Calves back */}
      {m({ left: "62%", width: "5%", top: "68%", height: "14%" }, colors.calves)}
      {m({ left: "78%", width: "5%", top: "68%", height: "14%" }, colors.calves)}
    </div>
  );
}
