import { ENERGY_LEVELS, type EnergyCheckin, LEVEL_COLOR, recentCheckin, type RestSession } from '@/lib/rest';
import { cn } from '@/lib/utils';
import { useRest } from '@/hooks/useRest';

import { BatteryControl } from './BatteryControl';

function greeting(hour: number): string {
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

function timeAgo(ts: number, now: number): string {
  const mins = Math.round((now - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function subtitle(current: EnergyCheckin | undefined, latest: EnergyCheckin | undefined, lastSession: RestSession | undefined, now: number): string {
  if (!current) {
    if (latest) return `Your last reading was ${timeAgo(latest.at, now)}. Things change. How about right now?`;
    return 'Be honest. Nobody else sees this. Tap the battery that matches how you feel.';
  }
  if (lastSession && lastSession.endedAt > current.at) {
    return 'You rested since your last reading. Has your battery changed?';
  }
  return `Checked in ${timeAgo(current.at, now)}. Tap again whenever it changes.`;
}

interface BatteryHeroProps {
  now: number;
  onCheckIn?: (level: number) => void;
}

/** The first thing you see: a giant battery asking how charged you are. */
export function BatteryHero({ now, onCheckIn }: BatteryHeroProps) {
  const { state, checkIn } = useRest();
  const current = recentCheckin(state.checkins, now);
  const latest = state.checkins[state.checkins.length - 1];
  const lastSession = state.sessions[state.sessions.length - 1];
  const reading = current ? ENERGY_LEVELS[current.level - 1] : undefined;

  return (
    <section aria-labelledby="battery-heading" className="relative isolate overflow-hidden">
      <img src="/dusk.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_70%]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(250_45%_10%/0.45)] via-[hsl(250_45%_10%/0.55)] to-background" />
      {current && (
        <div
          className={cn(
            'absolute left-1/2 top-1/2 -z-10 size-[36rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-25 blur-3xl transition-colors duration-700',
            LEVEL_COLOR[current.level],
          )}
          aria-hidden
        />
      )}

      <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-16">
        <p className="text-lg font-semibold text-white/85">{greeting(new Date(now).getHours())}</p>
        <h1 id="battery-heading" className="mt-1 text-5xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-7xl">
          How is your battery?
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
          {subtitle(current, latest, lastSession, now)}
        </p>

        <BatteryControl
          value={current?.level}
          onChange={(level) => {
            checkIn(level);
            onCheckIn?.(level);
          }}
          onDark
          label="How charged do you feel right now?"
          className="mt-10 sm:mt-12"
        />

        <p className="mt-6 min-h-9 font-display text-3xl font-semibold text-white" aria-live="polite">
          {reading ? reading.label : '\u00a0'}
        </p>
      </div>
    </section>
  );
}
