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

// Coordinates mapped to 612×612 viewBox matching the anatomy PNG
const MUSCLES: MuscleGroup[] = [
  // ========== FRONT FIGURE (center ~165) ==========

  // Shoulders / Deltoids front
  {
    region: "shoulders",
    shapes: [
      { cx: 80, cy: 132, rx: 20, ry: 16, rotate: 15 },   // left delt
      { cx: 250, cy: 132, rx: 20, ry: 16, rotate: -15 },  // right delt
    ],
  },
  // Chest / Pectorals
  {
    region: "chest",
    shapes: [
      { cx: 120, cy: 168, rx: 30, ry: 16, rotate: -10 },  // left pec
      { cx: 210, cy: 168, rx: 30, ry: 16, rotate: 10 },   // right pec
    ],
  },
  // Arms front - biceps
  {
    region: "arms",
    shapes: [
      { cx: 65, cy: 192, rx: 10, ry: 26, rotate: 8 },     // left bicep
      { cx: 265, cy: 192, rx: 10, ry: 26, rotate: -8 },    // right bicep
      { cx: 52, cy: 258, rx: 8, ry: 26, rotate: 10 },      // left forearm
      { cx: 278, cy: 258, rx: 8, ry: 26, rotate: -10 },    // right forearm
    ],
  },
  // Core / Abs
  {
    region: "core",
    shapes: [
      { cx: 148, cy: 220, rx: 14, ry: 28 },   // left abs
      { cx: 182, cy: 220, rx: 14, ry: 28 },   // right abs
      { cx: 140, cy: 260, rx: 12, ry: 12 },   // left oblique
      { cx: 190, cy: 260, rx: 12, ry: 12 },   // right oblique
    ],
  },
  // Quads
  {
    region: "quads",
    shapes: [
      { cx: 128, cy: 340, rx: 20, ry: 44, rotate: 3 },    // left quad outer
      { cx: 150, cy: 338, rx: 14, ry: 42 },                 // left quad inner
      { cx: 180, cy: 338, rx: 14, ry: 42 },                 // right quad inner
      { cx: 202, cy: 340, rx: 20, ry: 44, rotate: -3 },    // right quad outer
    ],
  },
  // Calves front
  {
    region: "calves",
    shapes: [
      { cx: 132, cy: 448, rx: 12, ry: 34 },   // left shin/calf front
      { cx: 198, cy: 448, rx: 12, ry: 34 },   // right shin/calf front
    ],
  },

  // ========== BACK FIGURE (center ~450) ==========

  // Shoulders / Rear Deltoids
  {
    region: "shoulders",
    shapes: [
      { cx: 365, cy: 132, rx: 20, ry: 16, rotate: -15 },  // left rear delt
      { cx: 535, cy: 132, rx: 20, ry: 16, rotate: 15 },   // right rear delt
    ],
  },
  // Back - traps + lats
  {
    region: "back",
    shapes: [
      { cx: 420, cy: 148, rx: 18, ry: 12 },                // left trap
      { cx: 480, cy: 148, rx: 18, ry: 12 },                // right trap
      { cx: 408, cy: 190, rx: 16, ry: 30, rotate: 10 },   // left lat
      { cx: 492, cy: 190, rx: 16, ry: 30, rotate: -10 },  // right lat
      { cx: 432, cy: 170, rx: 12, ry: 18 },                // left mid-back
      { cx: 468, cy: 170, rx: 12, ry: 18 },                // right mid-back
    ],
  },
  // Arms back - triceps + forearms
  {
    region: "arms",
    shapes: [
      { cx: 350, cy: 192, rx: 10, ry: 26, rotate: -8 },   // left tricep
      { cx: 550, cy: 192, rx: 10, ry: 26, rotate: 8 },    // right tricep
      { cx: 338, cy: 258, rx: 8, ry: 26, rotate: -10 },   // left forearm back
      { cx: 562, cy: 258, rx: 8, ry: 26, rotate: 10 },    // right forearm back
    ],
  },
  // Core back - lower back & glutes
  {
    region: "core",
    shapes: [
      { cx: 450, cy: 240, rx: 22, ry: 14 },   // lower back
      { cx: 430, cy: 275, rx: 18, ry: 14 },   // left glute
      { cx: 470, cy: 275, rx: 18, ry: 14 },   // right glute
    ],
  },
  // Hamstrings
  {
    region: "hamstrings",
    shapes: [
      { cx: 418, cy: 340, rx: 18, ry: 44, rotate: 3 },    // left hamstring
      { cx: 482, cy: 340, rx: 18, ry: 44, rotate: -3 },   // right hamstring
    ],
  },
  // Calves back
  {
    region: "calves",
    shapes: [
      { cx: 415, cy: 445, rx: 14, ry: 35, rotate: 2 },    // left calf back
      { cx: 485, cy: 445, rx: 14, ry: 35, rotate: -2 },   // right calf back
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
            <feGaussianBlur stdDeviation="4" />
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
