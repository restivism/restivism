import type { CSSProperties } from 'react';

import { LEVEL_COLOR, LEVEL_FILL } from '@/lib/rest';
import { cn } from '@/lib/utils';

const SPARKS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const dist = i % 2 ? 190 : 140;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist * 0.6, size: i % 3 ? 8 : 14, delay: (i % 4) * 40 };
});

interface ChargeUpProps {
  before?: number;
  after: number;
}

/**
 * The battery refilling from the pre-rest reading to the post-rest one: new
 * bars pop in one by one and, when you gained, sparks fly.
 */
export function ChargeUp({ before, after }: ChargeUpProps) {
  const gained = before === undefined ? 0 : after - before;
  const from = gained > 0 && before !== undefined ? before : after;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center py-4" aria-hidden>
      <div className="relative grid place-items-center">
        {gained > 0 && (
          <>
            <div className={cn('absolute size-56 rounded-full opacity-40 blur-3xl motion-safe:animate-breathe', LEVEL_COLOR[after])} />
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className={cn('absolute z-10 rounded-full opacity-0 shadow-[0_0_12px_currentColor] motion-safe:animate-rise', LEVEL_COLOR[after])}
                style={{
                  width: s.size,
                  height: s.size,
                  '--dx': `${s.dx}px`,
                  '--dy': `${s.dy}px`,
                  animationDelay: `${gained * 180 + s.delay}ms`,
                } as CSSProperties}
              />
            ))}
          </>
        )}

        <svg viewBox="0 0 100 48" className="relative w-56 drop-shadow-lg sm:w-64">
          <rect x="2.5" y="2.5" width="87" height="43" rx="7" fill="none" stroke="currentColor" strokeWidth="5" />
          <path d="M93 16h2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-2z" fill="currentColor" />
          {[1, 2, 3, 4, 5].map((i) => (
            i <= after && (
              <rect
                key={`${after}-${i}`}
                x={9 + (i - 1) * 15.4}
                y="9"
                width="13"
                height="30"
                rx="2"
                className={cn(LEVEL_FILL[after], i > from && 'motion-safe:animate-pop')}
                style={i > from ? { animationDelay: `${(i - from) * 180}ms`, transformBox: 'fill-box', transformOrigin: 'center' } : undefined}
              />
            )
          ))}
        </svg>
      </div>

      {gained > 0 && (
        <p
          key={after}
          className="mt-2 font-display text-6xl font-semibold text-ember motion-safe:animate-pop"
          style={{ animationDelay: `${gained * 180 + 100}ms` }}
        >
          +{gained}
        </p>
      )}
    </div>
  );
}
