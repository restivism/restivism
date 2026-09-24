import { Zap } from 'lucide-react';

import { dayKey, ENERGY_LEVELS, LEVEL_COLOR, type RestState } from '@/lib/rest';
import { cn } from '@/lib/utils';

const TIMELINE = 21;

/** Days in a row, ending today or yesterday, with at least one rest. */
function restStreak(state: RestState, now: number): number {
  const days = new Set(state.sessions.map((s) => dayKey(s.endedAt)));
  const d = new Date(now);
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(d.getTime()))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function formatMinutes(total: number): { value: string; unit: string } {
  if (total < 120) return { value: String(total), unit: total === 1 ? 'minute' : 'minutes' };
  const hours = total / 60;
  return { value: hours < 10 ? hours.toFixed(1) : String(Math.round(hours)), unit: 'hours' };
}

/** What rest has given back so far: time taken, bars regained, and the battery over time. */
export function RestRecord({ state, now }: { state: RestState; now: number }) {
  if (state.sessions.length === 0) return null;

  const minutes = formatMinutes(state.sessions.reduce((sum, s) => sum + s.minutes, 0));
  const bars = state.sessions.reduce((sum, s) => (
    s.energyBefore && s.energyAfter && s.energyAfter > s.energyBefore ? sum + s.energyAfter - s.energyBefore : sum
  ), 0);
  const streak = restStreak(state, now);
  const readings = state.checkins.slice(-TIMELINE);

  const stats = [
    { value: minutes.value, label: `${minutes.unit} of rest reclaimed` },
    { value: `+${bars}`, label: `bar${bars === 1 ? '' : 's'} regained after resting` },
    { value: String(streak), label: `day${streak === 1 ? '' : 's'} in a row with rest` },
  ];

  return (
    <section
      aria-labelledby="record-heading"
      className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
    >
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-widest text-ember-foreground">Your rest record</p>
        <h2 id="record-heading" className="text-3xl font-semibold leading-tight">Rest taken is ground held.</h2>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col rounded-xl bg-secondary/60 p-3 sm:p-4">
            <dt className="order-2 text-sm leading-snug text-muted-foreground">{s.label}</dt>
            <dd className="font-display text-4xl font-semibold tabular-nums sm:text-5xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      {readings.length > 1 && (
        <figure className="space-y-3">
          <figcaption className="text-base font-semibold">Your battery, reading by reading</figcaption>
          <ol className="flex h-32 items-end gap-1 sm:gap-1.5" aria-label="Recent battery readings, oldest first">
            {readings.map((c, i) => (
              <li
                key={c.at}
                className="relative flex h-full flex-1 flex-col items-center justify-end"
                title={`${ENERGY_LEVELS[c.level - 1].label}${c.sessionId ? ' (after resting)' : ''}`}
              >
                {c.sessionId && <Zap className="mb-1 size-3.5 shrink-0 fill-ember text-ember" aria-hidden />}
                <span
                  className={cn(
                    'w-full max-w-6 origin-bottom rounded-t-md motion-safe:animate-grow',
                    LEVEL_COLOR[c.level],
                    c.sessionId ? 'opacity-100' : 'opacity-70',
                  )}
                  style={{ height: `${c.level * 20}%`, animationDelay: `${i * 30}ms` }}
                />
                <span className="sr-only">
                  {ENERGY_LEVELS[c.level - 1].label}
                  {c.sessionId ? ', after resting' : ''}
                </span>
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Zap className="size-3.5 fill-ember text-ember" aria-hidden /> marks a reading right after a rest.
          </p>
        </figure>
      )}
    </section>
  );
}
