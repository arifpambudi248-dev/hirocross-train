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
  if (intensity <= 0) return "rgba(0,0,0,0)";
  const t = Math.min(intensity, 1);
  const r = Math.round(40 + t * 215);
  const g = Math.round(200 - t * 160);
  const b = Math.round(60 - t * 40);
  return `rgb(${r}, ${g}, ${b})`;
};

interface MuscleEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate?: number;
}

interface MuscleGroup {
  region: keyof DetailedIntensities;
  shapes: MuscleEllipse[];
}

// Coordinates mapped to 612×612 viewBox, precision-tuned to anatomy image
const MUSCLES: MuscleGroup[] = [
  // ========== FRONT FIGURE (center ~165) ==========
  {
    region: "shoulders",
    shapes: [
      { cx: 100, cy: 120, rx: 18, ry: 14, rotate: 20 },   // left deltoid
      { cx: 230, cy: 120, rx: 18, ry: 14, rotate: -20 },  // right deltoid
    ],
  },
  {
    region: "chest",
    shapes: [
      { cx: 132, cy: 148, rx: 26, ry: 18, rotate: -6 },   // left pec
      { cx: 198, cy: 148, rx: 26, ry: 18, rotate: 6 },    // right pec
    ],
  },
  {
    region: "arms",
    shapes: [
      { cx: 82, cy: 168, rx: 10, ry: 24, rotate: 6 },     // left bicep
      { cx: 248, cy: 168, rx: 10, ry: 24, rotate: -6 },   // right bicep
      { cx: 70, cy: 228, rx: 7, ry: 24, rotate: 12 },     // left forearm
      { cx: 260, cy: 228, rx: 7, ry: 24, rotate: -12 },   // right forearm
    ],
  },
  {
    region: "core",
    shapes: [
      { cx: 150, cy: 190, rx: 14, ry: 22 },   // left abs upper
      { cx: 180, cy: 190, rx: 14, ry: 22 },   // right abs upper
      { cx: 150, cy: 225, rx: 12, ry: 14 },   // left abs lower
      { cx: 180, cy: 225, rx: 12, ry: 14 },   // right abs lower
      { cx: 130, cy: 218, rx: 10, ry: 16, rotate: 15 },  // left oblique
      { cx: 200, cy: 218, rx: 10, ry: 16, rotate: -15 }, // right oblique
    ],
  },
  {
    region: "quads",
    shapes: [
      { cx: 134, cy: 318, rx: 16, ry: 40, rotate: 4 },   // left outer quad
      { cx: 152, cy: 315, rx: 11, ry: 38 },               // left inner quad
      { cx: 178, cy: 315, rx: 11, ry: 38 },               // right inner quad
      { cx: 196, cy: 318, rx: 16, ry: 40, rotate: -4 },   // right outer quad
    ],
  },
  {
    region: "calves",
    shapes: [
      { cx: 140, cy: 430, rx: 10, ry: 30, rotate: 2 },    // left calf
      { cx: 190, cy: 430, rx: 10, ry: 30, rotate: -2 },   // right calf
    ],
  },

  // ========== BACK FIGURE (center ~450) ==========
  {
    region: "shoulders",
    shapes: [
      { cx: 385, cy: 120, rx: 18, ry: 14, rotate: -20 },  // left rear delt
      { cx: 515, cy: 120, rx: 18, ry: 14, rotate: 20 },   // right rear delt
    ],
  },
  {
    region: "back",
    shapes: [
      { cx: 425, cy: 130, rx: 16, ry: 12, rotate: -5 },   // left upper trap
      { cx: 475, cy: 130, rx: 16, ry: 12, rotate: 5 },    // right upper trap
      { cx: 435, cy: 155, rx: 12, ry: 16 },                // left rhomboid
      { cx: 465, cy: 155, rx: 12, ry: 16 },                // right rhomboid
      { cx: 410, cy: 178, rx: 16, ry: 32, rotate: 10 },   // left lat
      { cx: 490, cy: 178, rx: 16, ry: 32, rotate: -10 },  // right lat
    ],
  },
  {
    region: "arms",
    shapes: [
      { cx: 368, cy: 168, rx: 10, ry: 24, rotate: -6 },   // left tricep
      { cx: 532, cy: 168, rx: 10, ry: 24, rotate: 6 },    // right tricep
      { cx: 355, cy: 228, rx: 7, ry: 24, rotate: -12 },   // left forearm back
      { cx: 545, cy: 228, rx: 7, ry: 24, rotate: 12 },    // right forearm back
    ],
  },
  {
    region: "core",
    shapes: [
      { cx: 450, cy: 218, rx: 20, ry: 14 },               // lower back / erector
      { cx: 435, cy: 262, rx: 18, ry: 16 },               // left glute
      { cx: 465, cy: 262, rx: 18, ry: 16 },               // right glute
    ],
  },
  {
    region: "hamstrings",
    shapes: [
      { cx: 428, cy: 325, rx: 15, ry: 40, rotate: 2 },    // left hamstring
      { cx: 472, cy: 325, rx: 15, ry: 40, rotate: -2 },   // right hamstring
    ],
  },
  {
    region: "calves",
    shapes: [
      { cx: 425, cy: 430, rx: 11, ry: 30, rotate: 2 },    // left calf back
      { cx: 475, cy: 430, rx: 11, ry: 30, rotate: -2 },   // right calf back
    ],
  },
];

export function BodyMapSVG({ intensities }: BodyMapSVGProps) {
  const maxRegion = useMemo(() => {
    let max = 0;
    let key: keyof DetailedIntensities | null = null;
    for (const k of Object.keys(intensities) as (keyof DetailedIntensities)[]) {
      if (intensities[k] > max) { max = intensities[k]; key = k; }
    }
    return key;
  }, [intensities]);

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

  const opacities = useMemo(() => {
    const result = {} as Record<keyof DetailedIntensities, number>;
    for (const key of Object.keys(intensities) as (keyof DetailedIntensities)[]) {
      result[key] = intensities[key] <= 0 ? 0 : 0.4 + Math.min(intensities[key], 1) * 0.4;
    }
    return result;
  }, [intensities]);

  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      <img
        src={bodyMapImage}
        alt="Body Map"
        className="w-full h-auto"
        draggable={false}
      />
      <svg
        viewBox="0 0 612 612"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="muscle-glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="muscle-pulse-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <style>{`
          @keyframes muscle-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.9; }
          }
        `}</style>
        {MUSCLES.map((group, gi) =>
          group.shapes.map((shape, si) => {
            const color = colors[group.region];
            const opacity = opacities[group.region];
            if (opacity <= 0) return null;
            const isMax = group.region === maxRegion;
            return (
              <ellipse
                key={`${gi}-${si}`}
                cx={shape.cx}
                cy={shape.cy}
                rx={shape.rx}
                ry={shape.ry}
                fill={color}
                opacity={opacity}
                filter={isMax ? "url(#muscle-pulse-glow)" : "url(#muscle-glow)"}
                style={{
                  mixBlendMode: "screen",
                  transition: "fill 0.5s ease, opacity 0.5s ease",
                  transform: shape.rotate
                    ? `rotate(${shape.rotate}deg)`
                    : undefined,
                  transformOrigin: `${shape.cx}px ${shape.cy}px`,
                  animation: isMax ? "muscle-pulse 2s ease-in-out infinite" : undefined,
                }}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
