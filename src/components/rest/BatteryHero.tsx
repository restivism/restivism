import { Volume2, VolumeX } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';

import { ENERGY_LEVELS, type EnergyCheckin, LEVEL_COLOR, recentCheckin, type RestSession } from '@/lib/rest';
import { isTapsPlaying, playTaps, stopTaps, subscribeTaps } from '@/lib/taps';
import { cn } from '@/lib/utils';
import { useRest } from '@/hooks/useRest';

import { BatteryControl } from './BatteryControl';
import { HeroWeather } from './HeroWeather';
import { VoiceCheckin } from './VoiceCheckin';

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

/** A protest scene per battery level, from exhausted and scattered to jubilant. */
const BACKDROPS: Record<number, string> = {
  1: '/battery-1.webp',
  2: '/battery-2.webp',
  3: '/battery-3.webp',
  4: '/battery-4.webp',
  5: '/battery-5.webp',
};

/**
 * Crossfades between backdrops as the reading changes. Scenes are only
 * mounted once they have been shown, so we never download all five up front.
 */
function HeroBackdrop({ level }: { level?: number }) {
  const [seen, setSeen] = useState<number[]>(level ? [level] : []);
  const [loaded, setLoaded] = useState<number[]>([]);
  if (level && !seen.includes(level)) setSeen([...seen, level]);

  return (
    <div className="absolute inset-0 -z-10 motion-safe:animate-drift" aria-hidden>
      <img
        src="/dusk.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_70%]"
      />
      {seen.map((l) => (
        <img
          key={l}
          src={BACKDROPS[l]}
          alt=""
          onLoad={() => setLoaded((prev) => [...prev, l])}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none',
            l === level && loaded.includes(l) ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Mutes Taps. Only shown while it plays or once muted, so unmuting in
 * silence makes the button go away again.
 */
function MusicToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  const playing = useSyncExternalStore(subscribeTaps, isTapsPlaying);
  if (!playing && !muted) return null;
  const Icon = muted ? VolumeX : Volume2;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      title={muted ? 'Unmute music' : 'Mute music'}
      className={cn(
        'absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md transition-colors sm:right-6 sm:top-6',
        'hover:border-white/60 hover:bg-black/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90',
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

interface BatteryHeroProps {
  now: number;
  onCheckIn?: (level: number) => void;
}

/** The first thing you see: a giant battery asking how charged you are. */
export function BatteryHero({ now, onCheckIn }: BatteryHeroProps) {
  const { state, checkIn, updateSettings } = useRest();
  const muted = !state.settings.music;
  const current = recentCheckin(state.checkins, now);
  const latest = state.checkins[state.checkins.length - 1];
  const lastSession = state.sessions[state.sessions.length - 1];
  const reading = current ? ENERGY_LEVELS[current.level - 1] : undefined;

  const handleLevel = (level: number) => {
    if (level === 1 && !muted) playTaps();
    else stopTaps();
    checkIn(level);
    onCheckIn?.(level);
  };

  return (
    <section aria-labelledby="battery-heading" className="relative isolate overflow-hidden">
      <HeroBackdrop level={current?.level} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(250_45%_10%/0.45)] via-[hsl(250_45%_10%/0.55)] to-background" />
      <HeroWeather level={current?.level} />
      {current && (
        <div
          className={cn(
            'absolute left-1/2 top-1/2 -z-10 size-[36rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-25 blur-3xl transition-colors duration-700',
            LEVEL_COLOR[current.level],
          )}
          aria-hidden
        />
      )}

      <MusicToggle
        muted={muted}
        onToggle={() => {
          if (!muted) stopTaps();
          updateSettings({ music: muted });
        }}
      />

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
          onChange={handleLevel}
          onDark
          label="How charged do you feel right now?"
          className="mt-10 sm:mt-12"
        />

        <p className="mt-6 min-h-9 font-display text-3xl font-semibold text-white" aria-live="polite">
          {reading ? reading.label : '\u00a0'}
        </p>

        <VoiceCheckin onUse={handleLevel} />
      </div>
    </section>
  );
}
