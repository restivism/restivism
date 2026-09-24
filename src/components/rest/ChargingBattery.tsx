import { useId } from 'react';

import type { RechargeId } from '@/lib/rest';
import { cn } from '@/lib/utils';

/** Liquid colors per recharge: [top, bottom]. */
const LIQUID: Record<RechargeId, [string, string]> = {
  sleep: ['hsl(256 90% 78%)', 'hsl(236 75% 52%)'],
  play: ['hsl(40 100% 68%)', 'hsl(345 85% 58%)'],
  social: ['hsl(160 75% 62%)', 'hsl(190 80% 40%)'],
};

// Battery geometry in viewBox units.
const INNER = { x: 20, y: 36, w: 120, h: 226 };
const WAVE = 'M-160 0 q20 -7 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V300 H-160 Z';
const BUBBLES = [
  { x: 42, r: 3, delay: '0s', dur: '5s' },
  { x: 70, r: 2, delay: '1.6s', dur: '4.2s' },
  { x: 96, r: 4, delay: '0.8s', dur: '6s' },
  { x: 120, r: 2.5, delay: '2.6s', dur: '4.8s' },
  { x: 58, r: 2, delay: '3.4s', dur: '5.4s' },
];

interface ChargingBatteryProps {
  recharge: RechargeId;
  /** 0 to 1 */
  value: number;
  paused?: boolean;
  /** Draw the shell dark, for light backgrounds. */
  onLight?: boolean;
  className?: string;
}

/** A tall battery that fills with rippling liquid as a rest session runs. */
export function ChargingBattery({ recharge, value, paused = false, onLight = false, className }: ChargingBatteryProps) {
  const id = useId();
  const v = Math.max(0, Math.min(1, value));
  const top = INNER.y + INNER.h * (1 - v);
  const [light, deep] = LIQUID[recharge];

  return (
    <div
      className={cn('relative', className)}
      role="progressbar"
      aria-label="Charge from this rest"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      {/* Breathe with the glow: in as it grows, out as it fades. */}
      <div
        className="absolute inset-[-30%] rounded-full opacity-60 blur-3xl motion-safe:animate-breathe"
        style={{ background: `radial-gradient(circle, ${light} 0%, transparent 65%)`, animationPlayState: paused ? 'paused' : undefined }}
        aria-hidden
      />

      <svg
        viewBox="0 0 160 280"
        className={cn('relative h-full w-full drop-shadow-[0_0_24px_rgba(0,0,0,0.35)]', paused && '[&_*]:[animation-play-state:paused]')}
        aria-hidden
      >
        <defs>
          <linearGradient id={`${id}-liquid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={deep} />
          </linearGradient>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.14" />
            <stop offset="35%" stopColor="white" stopOpacity="0.03" />
            <stop offset="100%" stopColor="white" stopOpacity="0.08" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <rect x={INNER.x} y={INNER.y} width={INNER.w} height={INNER.h} rx="20" />
          </clipPath>
          {/* In the liquid's own coordinates, so bubbles pop at the surface. */}
          <clipPath id={`${id}-under`}>
            <rect x="-200" y="8" width="600" height="400" />
          </clipPath>
        </defs>

        {/* Terminal and shell */}
        <rect x="56" y="6" width="48" height="18" rx="6" className={onLight ? 'fill-foreground/60' : 'fill-white/70'} />
        <rect x="8" y="24" width="144" height="250" rx="30" fill={`url(#${id}-glass)`} className={onLight ? 'stroke-foreground/60' : 'stroke-white/80'} strokeWidth="5" />

        <g clipPath={`url(#${id}-clip)`}>
          <g style={{ transform: `translateY(${top}px)` }} className="motion-safe:transition-transform motion-safe:duration-1000 motion-safe:ease-out">
            <path d={WAVE} fill={light} opacity="0.45" className="motion-safe:animate-wave-slow" />
            <path d={WAVE} fill={`url(#${id}-liquid)`} transform="translate(0 5)" className="motion-safe:animate-wave" />
            <g clipPath={`url(#${id}-under)`}>
              {BUBBLES.map((b) => (
                <circle
                  key={b.x}
                  cx={b.x}
                  cy={INNER.y + INNER.h - top + 10}
                  r={b.r}
                  className="fill-white/60 opacity-0 motion-safe:animate-bubble"
                  style={{ animationDelay: b.delay, animationDuration: b.dur }}
                />
              ))}
            </g>
          </g>
        </g>

        {/* Bolt */}
        <path
          d="M88 104 L62 152 H80 L72 190 L100 136 H82 Z"
          className="fill-white/90 motion-safe:animate-pulse"
          style={{ filter: `drop-shadow(0 0 10px ${light})` }}
        />
        {/* Glass highlight */}
        <rect x="24" y="46" width="8" height="190" rx="4" className="fill-white/15" />
      </svg>
    </div>
  );
}
