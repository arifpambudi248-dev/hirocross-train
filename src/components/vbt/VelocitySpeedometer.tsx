import { useEffect, useRef, useState } from "react";
import { getVelocityZone } from "@/lib/vbt";

interface Props {
  /** Kecepatan saat ini (m/s) */
  value: number;
  /** Kecepatan maksimum skala */
  max?: number;
  size?: number;
  targetMin?: number | null;
  targetMax?: number | null;
  label?: string;
  sublabel?: string;
}

const START = 150;
const SWEEP = 240;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, a: number) => ({
  x: cx + r * Math.cos(toRad(a)),
  y: cy + r * Math.sin(toRad(a)),
});
const arc = (cx: number, cy: number, r: number, a1: number, a2: number) => {
  const s = polar(cx, cy, r, a1);
  const e = polar(cx, cy, r, a2);
  return ["M", s.x, s.y, "A", r, r, 0, a2 - a1 <= 180 ? 0 : 1, 1, e.x, e.y].join(" ");
};

/** Speedometer mewah untuk kecepatan angkatan (VBT). */
export function VelocitySpeedometer({
  value,
  max = 2,
  size = 260,
  targetMin,
  targetMax,
  label = "m/s",
  sublabel,
}: Props) {
  // animasi jarum halus
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>();
  const target = useRef(0);

  useEffect(() => {
    target.current = Math.min(max, Math.max(0, value));
    const tick = () => {
      setDisplay((d) => {
        const next = d + (target.current - d) * 0.2;
        return Math.abs(next - target.current) < 0.002 ? target.current : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, max]);

  const cx = size / 2;
  const cy = size / 2;
  const stroke = size * 0.085;
  const r = (size - stroke) / 2 - size * 0.06;
  const pct = Math.min(1, Math.max(0, display / max));
  const angle = START + pct * SWEEP;
  const zone = getVelocityZone(display);

  const inTarget =
    targetMin != null && targetMax != null && display >= targetMin && display <= targetMax;

  const needle = polar(cx, cy, r * 0.72, angle);
  const tail = polar(cx, cy, -r * 0.12, angle);

  const gid = `vbt-gauge-${size}`;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(0 75% 55%)" />
            <stop offset="35%" stopColor="hsl(25 90% 55%)" />
            <stop offset="60%" stopColor="hsl(45 90% 50%)" />
            <stop offset="82%" stopColor="hsl(150 70% 45%)" />
            <stop offset="100%" stopColor="hsl(190 90% 50%)" />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={size * 0.02} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* trek belakang */}
        <path
          d={arc(cx, cy, r, START, START + SWEEP)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.55}
        />

        {/* pita target pelatih */}
        {targetMin != null && targetMax != null && targetMax > targetMin && (
          <path
            d={arc(
              cx,
              cy,
              r,
              START + Math.min(1, targetMin / max) * SWEEP,
              START + Math.min(1, targetMax / max) * SWEEP
            )}
            fill="none"
            stroke="hsl(150 70% 45%)"
            strokeWidth={stroke * 1.15}
            strokeLinecap="butt"
            opacity={0.35}
          />
        )}

        {/* nilai */}
        {display > 0 && (
          <path
            d={arc(cx, cy, r, START, angle)}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            filter={`url(#${gid}-glow)`}
          />
        )}

        {/* tick */}
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8;
          const a = START + t * SWEEP;
          const inner = polar(cx, cy, r - stroke * 0.75, a);
          const outer = polar(cx, cy, r - stroke * 1.35, a);
          const lp = polar(cx, cy, r - stroke * 2.1, a);
          return (
            <g key={i}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={i % 2 === 0 ? 2 : 1}
                opacity={i % 2 === 0 ? 0.9 : 0.5}
              />
              {i % 2 === 0 && (
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(var(--muted-foreground))"
                  fontSize={size * 0.048}
                >
                  {(t * max).toFixed(1)}
                </text>
              )}
            </g>
          );
        })}

        {/* jarum */}
        <line
          x1={tail.x}
          y1={tail.y}
          x2={needle.x}
          y2={needle.y}
          stroke={inTarget ? "hsl(150 70% 45%)" : zone.color}
          strokeWidth={size * 0.016}
          strokeLinecap="round"
          filter={`url(#${gid}-glow)`}
        />
        <circle cx={cx} cy={cy} r={size * 0.045} fill="hsl(var(--background))" stroke={zone.color} strokeWidth={2} />

        {/* angka */}
        <text
          x={cx}
          y={cy + r * 0.42}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize={size * 0.17}
          fontWeight="700"
        >
          {display.toFixed(2)}
        </text>
        <text
          x={cx}
          y={cy + r * 0.63}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize={size * 0.06}
          fontWeight="600"
        >
          {label}
        </text>
      </svg>

      <div className="-mt-2 text-center">
        <p className="text-sm font-semibold" style={{ color: inTarget ? "hsl(150 70% 45%)" : zone.color }}>
          {inTarget ? "Dalam Target" : zone.label}
        </p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}
