import { useId } from 'react';

import { cn } from '@/lib/utils';

interface MoonPhaseProps {
  /** 0 = new moon, 1 = full moon (waxing). */
  phase: number;
  /** Adds a halo, for levels beyond the full moon. */
  glow?: number;
  className?: string;
  title?: string;
}

/** A waxing moon drawn with a lit semicircle and an elliptical terminator. */
export function MoonPhase({ phase, glow = 0, className, title }: MoonPhaseProps) {
  const id = useId();
  const r = 40;
  const cx = 50;
  const cy = 50;
  const p = Math.max(0, Math.min(1, phase));
  const rx = r * Math.abs(1 - 2 * p);
  // Crescents bulge toward the lit side; gibbous moons bulge away from it.
  const sweep = p < 0.5 ? 0 : 1;
  const lit = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('overflow-visible', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <radialGradient id={`${id}-lit`} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="hsl(46 100% 92%)" />
          <stop offset="100%" stopColor="var(--moon)" />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="55%" stopColor="var(--moon)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--moon)" stopOpacity={0} />
        </radialGradient>
      </defs>
      {glow > 0 && <circle cx={cx} cy={cy} r={r + 8 + glow * 6} fill={`url(#${id}-halo)`} />}
      <circle cx={cx} cy={cy} r={r} className="fill-foreground/10" />
      {p >= 0.99 ? (
        <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-lit)`} />
      ) : (
        <path d={lit} fill={`url(#${id}-lit)`} />
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-foreground/15" strokeWidth={1} />
    </svg>
  );
}
