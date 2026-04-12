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
      { cx: 98, cy: 122, rx: 16, ry: 12, rotate: 18 },
      { cx: 232, cy: 122, rx: 16, ry: 12, rotate: -18 },
    ],
  },
  {
    region: "chest",
    shapes: [
      { cx: 128, cy: 148, rx: 20, ry: 13, rotate: -6 },   // left pec
      { cx: 202, cy: 148, rx: 20, ry: 13, rotate: 6 },    // right pec
    ],
  },
  {
    region: "arms",
    shapes: [
      { cx: 78, cy: 175, rx: 9, ry: 22, rotate: 8 },      // left bicep
      { cx: 252, cy: 175, rx: 9, ry: 22, rotate: -8 },     // right bicep
      { cx: 66, cy: 240, rx: 6, ry: 22, rotate: 10 },      // left forearm
      { cx: 264, cy: 240, rx: 6, ry: 22, rotate: -10 },    // right forearm
    ],
  },
  {
    region: "core",
    shapes: [
      { cx: 148, cy: 198, rx: 13, ry: 20 },   // left abs
      { cx: 182, cy: 198, rx: 13, ry: 20 },   // right abs
      { cx: 138, cy: 235, rx: 10, ry: 12, rotate: 10 },  // left oblique
      { cx: 192, cy: 235, rx: 10, ry: 12, rotate: -10 }, // right oblique
    ],
  },
  {
    region: "quads",
    shapes: [
      { cx: 136, cy: 325, rx: 14, ry: 36, rotate: 3 },
      { cx: 155, cy: 322, rx: 10, ry: 34 },
      { cx: 175, cy: 322, rx: 10, ry: 34 },
      { cx: 194, cy: 325, rx: 14, ry: 36, rotate: -3 },
    ],
  },
  {
    region: "calves",
    shapes: [
      { cx: 143, cy: 435, rx: 9, ry: 26 },
      { cx: 187, cy: 435, rx: 9, ry: 26 },
    ],
  },

  // ========== BACK FIGURE (center ~450) ==========
  {
    region: "shoulders",
    shapes: [
      { cx: 383, cy: 122, rx: 16, ry: 12, rotate: -18 },
      { cx: 517, cy: 122, rx: 16, ry: 12, rotate: 18 },
    ],
  },
  {
    region: "back",
    shapes: [
      { cx: 422, cy: 138, rx: 14, ry: 10 },               // left trap
      { cx: 478, cy: 138, rx: 14, ry: 10 },               // right trap
      { cx: 412, cy: 175, rx: 14, ry: 28, rotate: 8 },    // left lat
      { cx: 488, cy: 175, rx: 14, ry: 28, rotate: -8 },   // right lat
      { cx: 436, cy: 160, rx: 10, ry: 14 },               // left mid-back
      { cx: 464, cy: 160, rx: 10, ry: 14 },               // right mid-back
    ],
  },
  {
    region: "arms",
    shapes: [
      { cx: 365, cy: 175, rx: 9, ry: 22, rotate: -8 },    // left tricep
      { cx: 535, cy: 175, rx: 9, ry: 22, rotate: 8 },     // right tricep
      { cx: 352, cy: 240, rx: 6, ry: 22, rotate: -10 },   // left forearm back
      { cx: 548, cy: 240, rx: 6, ry: 22, rotate: 10 },    // right forearm back
    ],
  },
  {
    region: "core",
    shapes: [
      { cx: 450, cy: 225, rx: 18, ry: 12 },   // lower back
      { cx: 434, cy: 265, rx: 15, ry: 13 },   // left glute
      { cx: 466, cy: 265, rx: 15, ry: 13 },   // right glute
    ],
  },
  {
    region: "hamstrings",
    shapes: [
      { cx: 427, cy: 328, rx: 14, ry: 38, rotate: 2 },
      { cx: 473, cy: 328, rx: 14, ry: 38, rotate: -2 },
    ],
  },
  {
    region: "calves",
    shapes: [
      { cx: 424, cy: 435, rx: 10, ry: 28, rotate: 1 },
      { cx: 476, cy: 435, rx: 10, ry: 28, rotate: -1 },
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
