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

// Coordinates mapped to 612×612 viewBox, fine-tuned to anatomy image
const MUSCLES: MuscleGroup[] = [
  // ========== FRONT FIGURE (center ~165) ==========
  {
    region: "shoulders",
    shapes: [
      { cx: 92, cy: 130, rx: 15, ry: 13, rotate: 12 },
      { cx: 238, cy: 130, rx: 15, ry: 13, rotate: -12 },
    ],
  },
  {
    region: "chest",
    shapes: [
      { cx: 127, cy: 168, rx: 24, ry: 14, rotate: -8 },
      { cx: 203, cy: 168, rx: 24, ry: 14, rotate: 8 },
    ],
  },
  {
    region: "arms",
    shapes: [
      { cx: 74, cy: 190, rx: 8, ry: 22, rotate: 6 },     // left bicep
      { cx: 256, cy: 190, rx: 8, ry: 22, rotate: -6 },    // right bicep
      { cx: 62, cy: 252, rx: 6, ry: 22, rotate: 8 },      // left forearm
      { cx: 268, cy: 252, rx: 6, ry: 22, rotate: -8 },    // right forearm
    ],
  },
  {
    region: "core",
    shapes: [
      { cx: 148, cy: 215, rx: 12, ry: 24 },   // left abs
      { cx: 182, cy: 215, rx: 12, ry: 24 },   // right abs
      { cx: 150, cy: 252, rx: 9, ry: 9 },     // left oblique
      { cx: 180, cy: 252, rx: 9, ry: 9 },     // right oblique
    ],
  },
  {
    region: "quads",
    shapes: [
      { cx: 138, cy: 335, rx: 14, ry: 38, rotate: 2 },
      { cx: 152, cy: 333, rx: 10, ry: 36 },
      { cx: 178, cy: 333, rx: 10, ry: 36 },
      { cx: 192, cy: 335, rx: 14, ry: 38, rotate: -2 },
    ],
  },
  {
    region: "calves",
    shapes: [
      { cx: 142, cy: 442, rx: 9, ry: 28 },
      { cx: 188, cy: 442, rx: 9, ry: 28 },
    ],
  },

  // ========== BACK FIGURE (center ~450) ==========
  {
    region: "shoulders",
    shapes: [
      { cx: 377, cy: 130, rx: 15, ry: 13, rotate: -12 },
      { cx: 523, cy: 130, rx: 15, ry: 13, rotate: 12 },
    ],
  },
  {
    region: "back",
    shapes: [
      { cx: 424, cy: 148, rx: 14, ry: 10 },               // left trap
      { cx: 476, cy: 148, rx: 14, ry: 10 },               // right trap
      { cx: 414, cy: 186, rx: 13, ry: 26, rotate: 8 },    // left lat
      { cx: 486, cy: 186, rx: 13, ry: 26, rotate: -8 },   // right lat
      { cx: 436, cy: 168, rx: 10, ry: 14 },               // left mid-back
      { cx: 464, cy: 168, rx: 10, ry: 14 },               // right mid-back
    ],
  },
  {
    region: "arms",
    shapes: [
      { cx: 360, cy: 190, rx: 8, ry: 22, rotate: -6 },    // left tricep
      { cx: 540, cy: 190, rx: 8, ry: 22, rotate: 6 },     // right tricep
      { cx: 348, cy: 252, rx: 6, ry: 22, rotate: -8 },    // left forearm back
      { cx: 552, cy: 252, rx: 6, ry: 22, rotate: 8 },     // right forearm back
    ],
  },
  {
    region: "core",
    shapes: [
      { cx: 450, cy: 236, rx: 18, ry: 11 },   // lower back
      { cx: 436, cy: 275, rx: 14, ry: 12 },   // left glute
      { cx: 464, cy: 275, rx: 14, ry: 12 },   // right glute
    ],
  },
  {
    region: "hamstrings",
    shapes: [
      { cx: 425, cy: 335, rx: 14, ry: 38, rotate: 2 },
      { cx: 475, cy: 335, rx: 14, ry: 38, rotate: -2 },
    ],
  },
  {
    region: "calves",
    shapes: [
      { cx: 425, cy: 442, rx: 10, ry: 30, rotate: 1 },
      { cx: 475, cy: 442, rx: 10, ry: 30, rotate: -1 },
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
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {MUSCLES.map((group, gi) =>
          group.shapes.map((shape, si) => {
            const color = colors[group.region];
            const opacity = opacities[group.region];
            if (opacity <= 0) return null;
            return (
              <ellipse
                key={`${gi}-${si}`}
                cx={shape.cx}
                cy={shape.cy}
                rx={shape.rx}
                ry={shape.ry}
                fill={color}
                opacity={opacity}
                filter="url(#muscle-glow)"
                style={{
                  mixBlendMode: "screen",
                  transition: "fill 0.5s ease, opacity 0.5s ease",
                  transform: shape.rotate
                    ? `rotate(${shape.rotate}deg)`
                    : undefined,
                  transformOrigin: `${shape.cx}px ${shape.cy}px`,
                }}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
