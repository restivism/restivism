import { Flame, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useRest } from '@/hooks/useRest';
import { computeStats, computeStreak, levelFor, minutesOnDay, totalEmbers } from '@/lib/rest';

import { MoonPhase } from './MoonPhase';
import { ProgressRing } from './ProgressRing';

/** A compact summary of today's rest and overall progress. */
export function TodayStrip({ now }: { now: number }) {
  const { state } = useRest();
  const today = minutesOnDay(state.sessions, now);
  const goal = state.settings.dailyGoal;
  const streak = computeStreak(state.sessions, now);
  const embers = totalEmbers(state);
  const { level } = levelFor(embers);
  const { barsRecharged } = computeStats(state, now);

  return (
    <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="col-span-2 flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm md:col-span-1">
        <ProgressRing value={today / goal} size={64} stroke={7} label={`${today} of ${goal} minutes rested today`}>
          <span className="text-sm font-bold tabular-nums">{Math.min(100, Math.round((today / goal) * 100))}%</span>
        </ProgressRing>
        <div>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {today}<span className="text-base font-normal text-muted-foreground"> / {goal} min</span>
          </p>
          <p className="text-sm text-muted-foreground">rested today</p>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Streak
        </p>
        <p className="font-display text-2xl font-semibold tabular-nums">
          {streak.current} day{streak.current === 1 ? '' : 's'}
        </p>
        {streak.current > 0 && !streak.restedToday && <p className="text-sm text-muted-foreground">Rest today to keep it</p>}
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Flame className="size-4 text-ember" aria-hidden />
          Embers
        </p>
        <p className="font-display text-2xl font-semibold tabular-nums">{embers}</p>
        <p className="text-sm text-muted-foreground">{barsRecharged} bars recharged</p>
      </div>
      <Link
        to="/journey"
        className="col-span-2 flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-span-1"
      >
        <MoonPhase phase={level.phase} glow={Math.max(0, level.index - 3)} className="size-12 shrink-0" />
        <div>
          <p className="text-sm text-muted-foreground">Your phase</p>
          <p className="font-display text-xl font-semibold">{level.name}</p>
        </div>
      </Link>
    </section>
  );
}
