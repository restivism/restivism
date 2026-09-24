import { type KeyboardEvent, useRef } from 'react';

import { ENERGY_LEVELS, LEVEL_COLOR } from '@/lib/rest';
import { playBatterySong } from '@/lib/songs';
import { cn } from '@/lib/utils';

interface BatteryControlProps {
  value?: number;
  onChange: (level: number) => void;
  size?: 'lg' | 'md';
  /** Use light-on-dark styling, e.g. over the hero image. */
  onDark?: boolean;
  label?: string;
  className?: string;
}

/**
 * Five buttons, one per battery level, each showing its own charge. Tap the
 * one that matches how you feel.
 */
export function BatteryControl({
  value,
  onChange,
  size = 'lg',
  onDark = false,
  label = 'Battery level',
  className,
}: BatteryControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (level: number) => {
    playBatterySong(level);
    onChange(level);
  };

  const handleKey = (e: KeyboardEvent, level: number) => {
    let next: number | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(5, level + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(1, level - 1);
    if (e.key === 'Home') next = 1;
    if (e.key === 'End') next = 5;
    if (next === undefined) return;
    e.preventDefault();
    refs.current[next - 1]?.focus();
    select(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid grid-cols-5', size === 'lg' ? 'gap-2 sm:gap-3' : 'gap-2', className)}
    >
      {ENERGY_LEVELS.map(({ level, short, label: levelLabel }) => {
        const checked = value === level;
        const tabbable = value ? checked : level === 1;
        return (
          <button
            key={level}
            ref={(el) => {
              refs.current[level - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={levelLabel}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => select(level)}
            onKeyDown={(e) => handleKey(e, level)}
            className={cn(
              'flex flex-col items-center rounded-2xl border font-semibold transition-all',
              'focus-visible:outline-none focus-visible:ring-4 motion-safe:active:scale-95',
              size === 'lg' ? 'gap-2 px-1 py-4 text-sm sm:gap-3 sm:py-6 sm:text-lg' : 'gap-2 px-1 py-3 text-sm',
              onDark
                ? cn(
                    'backdrop-blur-md focus-visible:ring-white/60',
                    checked
                      ? 'border-white bg-white/25 text-white shadow-lg'
                      : 'border-white/25 bg-black/30 text-white/80 hover:border-white/60 hover:bg-black/40 hover:text-white',
                  )
                : cn(
                    'focus-visible:ring-ring/50',
                    checked
                      ? 'border-primary bg-secondary text-foreground shadow-sm'
                      : 'bg-card text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-foreground',
                  ),
              // A low reading gently throbs.
              checked && level <= 2 && 'motion-safe:animate-pulse',
            )}
          >
            <BatteryGlyph level={level} size={size} />
            {short}
          </button>
        );
      })}
    </div>
  );
}

const GLYPH_SIZES = {
  sm: { body: 'h-5 w-9 rounded-[5px] border-2 p-0.5 gap-0.5', cell: 'rounded-[1px]', nub: 'ml-px h-2 w-0.5 rounded-r-sm' },
  md: { body: 'h-7 w-12 rounded-md border-[2.5px] p-0.5 gap-0.5', cell: 'rounded-[2px]', nub: 'ml-px h-3 w-1 rounded-r-sm' },
  lg: {
    body: 'h-7 w-11 rounded-md border-[2.5px] p-0.5 gap-0.5 sm:h-11 sm:w-[4.5rem] sm:rounded-lg sm:border-[3px] sm:p-1 sm:gap-1',
    cell: 'rounded-[2px] sm:rounded-[3px]',
    nub: 'ml-px h-3 w-1 rounded-r-sm sm:h-4 sm:w-1.5',
  },
};

/** A read-only battery icon filled to `level` of 5. */
export function BatteryGlyph({ level, size = 'sm', className }: { level?: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = GLYPH_SIZES[size];
  return (
    <span className={cn('inline-flex items-center', className)} aria-hidden>
      <span className={cn('flex border-current', s.body)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn('flex-1', s.cell, level && i <= level ? LEVEL_COLOR[level] : 'bg-transparent')} />
        ))}
      </span>
      <span className={cn('bg-current', s.nub)} />
    </span>
  );
}
