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
  // green → yellow → orange → red
  const r = Math.round(40 + t * 215);
  const g = Math.round(200 - t * 160);
  const b = Math.round(60 - t * 40);
  return `rgb(${r}, ${g}, ${b})`;
};

// Each muscle is defined as SVG ellipses with cx, cy, rx, ry (in 612x612 viewBox)
// Some use rotation via transform
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

const MUSCLES: MuscleGroup[] = [
  // ===== FRONT FIGURE =====
  // Shoulders (deltoids) - front
  {
    region: "shoulders",
    shapes: [
      { cx: 82, cy: 148, rx: 18, ry: 14 },   // left front delt
      { cx: 248, cy: 148, rx: 18, ry: 14 },   // right front delt
    ],
  },
  // Chest (pectorals) - front
  {
    region: "chest",
    shapes: [
      { cx: 118, cy: 180, rx: 28, ry: 18, rotate: -8 },  // left pec
      { cx: 212, cy: 180, rx: 28, ry: 18, rotate: 8 },   // right pec
    ],
  },
  // Arms - front (biceps + forearms)
  {
    region: "arms",
    shapes: [
      { cx: 68, cy: 200, rx: 11, ry: 28, rotate: 5 },    // left bicep
      { cx: 262, cy: 200, rx: 11, ry: 28, rotate: -5 },   // right bicep
      { cx: 55, cy: 268, rx: 9, ry: 28, rotate: 8 },     // left forearm
      { cx: 275, cy: 268, rx: 9, ry: 28, rotate: -8 },    // right forearm
    ],
  },
  // Core (abs) - front
  {
    region: "core",
    shapes: [
      { cx: 145, cy: 230, rx: 16, ry: 30 },  // left abs
      { cx: 185, cy: 230, rx: 16, ry: 30 },  // right abs
      { cx: 165, cy: 270, rx: 22, ry: 14 },  // lower abs
    ],
  },
  // Quads - front
  {
    region: "quads",
    shapes: [
      { cx: 132, cy: 340, rx: 18, ry: 42, rotate: 2 },   // left outer quad
      { cx: 148, cy: 345, rx: 14, ry: 40 },                // left inner quad
      { cx: 182, cy: 345, rx: 14, ry: 40 },                // right inner quad
      { cx: 198, cy: 340, rx: 18, ry: 42, rotate: -2 },   // right outer quad
    ],
  },
  // Calves - front
  {
    region: "calves",
    shapes: [
      { cx: 135, cy: 445, rx: 11, ry: 32 },   // left calf front
      { cx: 195, cy: 445, rx: 11, ry: 32 },   // right calf front
    ],
  },

  // ===== BACK FIGURE =====
  // Shoulders (rear deltoids) - back
  {
    region: "shoulders",
    shapes: [
      { cx: 368, cy: 148, rx: 18, ry: 14 },   // left rear delt
      { cx: 532, cy: 148, rx: 18, ry: 14 },   // right rear delt
    ],
  },
  // Back (traps + lats)
  {
    region: "back",
    shapes: [
      { cx: 420, cy: 155, rx: 20, ry: 12 },                // left trap
      { cx: 490, cy: 155, rx: 20, ry: 12 },                // right trap
      { cx: 405, cy: 200, rx: 18, ry: 32, rotate: 8 },    // left lat
      { cx: 505, cy: 200, rx: 18, ry: 32, rotate: -8 },   // right lat
      { cx: 430, cy: 175, rx: 14, ry: 20 },                // left mid-back
      { cx: 480, cy: 175, rx: 14, ry: 20 },                // right mid-back
    ],
  },
  // Arms - back (triceps + forearms)
  {
    region: "arms",
    shapes: [
      { cx: 355, cy: 200, rx: 11, ry: 28, rotate: -5 },   // left tricep
      { cx: 555, cy: 200, rx: 11, ry: 28, rotate: 5 },    // right tricep
      { cx: 342, cy: 268, rx: 9, ry: 28, rotate: -8 },    // left forearm back
      { cx: 568, cy: 268, rx: 9, ry: 28, rotate: 8 },     // right forearm back
    ],
  },
  // Core (lower back / glutes) - back
  {
    region: "core",
    shapes: [
      { cx: 450, cy: 252, rx: 24, ry: 16 },   // lower back
      { cx: 430, cy: 285, rx: 20, ry: 16 },   // left glute
      { cx: 480, cy: 285, rx: 20, ry: 16 },   // right glute
    ],
  },
  // Hamstrings - back
  {
    region: "hamstrings",
    shapes: [
      { cx: 420, cy: 345, rx: 16, ry: 42, rotate: 2 },   // left hamstring
      { cx: 490, cy: 345, rx: 16, ry: 42, rotate: -2 },  // right hamstring
    ],
  },
  // Calves - back
  {
    region: "calves",
    shapes: [
      { cx: 418, cy: 445, rx: 13, ry: 32 },   // left calf back
      { cx: 492, cy: 445, rx: 13, ry: 32 },   // right calf back
    ],
  },
];

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

  const opacities = useMemo(() => {
    const result = {} as Record<keyof DetailedIntensities, number>;
    for (const key of Object.keys(intensities) as (keyof DetailedIntensities)[]) {
      result[key] = intensities[key] <= 0 ? 0 : 0.35 + Math.min(intensities[key], 1) * 0.45;
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
          <filter id="muscle-blur">
            <feGaussianBlur stdDeviation="6" />
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
                filter="url(#muscle-blur)"
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
