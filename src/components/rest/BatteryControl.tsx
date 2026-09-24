import { type KeyboardEvent, useRef } from 'react';

import { ENERGY_LEVELS, LEVEL_FILL } from '@/lib/rest';
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

  const handleKey = (e: KeyboardEvent, level: number) => {
    let next: number | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(5, level + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(1, level - 1);
    if (e.key === 'Home') next = 1;
    if (e.key === 'End') next = 5;
    if (next === undefined) return;
    e.preventDefault();
    refs.current[next - 1]?.focus();
    onChange(next);
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
            onClick={() => onChange(level)}
            onKeyDown={(e) => handleKey(e, level)}
            className={cn(
              'flex flex-col items-center rounded-lg border sm:rounded-2xl font-semibold transition-all',
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

// Widths only: the SVG keeps its own proportions, so corners, stroke, and
// cells scale together instead of rounding off as the icon shrinks.
const GLYPH_SIZES = {
  sm: 'w-8',
  md: 'w-12',
  lg: 'w-full max-w-12 sm:max-w-[4.5rem]',
};

/** A read-only battery icon filled to `level` of 5. */
export function BatteryGlyph({ level, size = 'sm', className }: { level?: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <svg
      viewBox="0 0 50 24"
      className={cn('inline-block h-auto shrink-0 align-middle', GLYPH_SIZES[size], className)}
      aria-hidden
    >
      <rect x="1.25" y="1.25" width="43.5" height="21.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M46.5 8h1a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1z" fill="currentColor" />
      {level !== undefined && [1, 2, 3, 4, 5].filter((i) => i <= level).map((i) => (
        <rect key={i} x={4.5 + (i - 1) * 7.64} y="4.5" width="6.44" height="15" rx="0.5" className={LEVEL_FILL[level]} />
      ))}
    </svg>
  );
}
