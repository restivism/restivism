import { useSeoMeta } from '@unhead/react';
import { Flame, Lock, PencilLine } from 'lucide-react';

import { AppShell } from '@/components/rest/AppShell';
import { BatteryGlyph } from '@/components/rest/BatteryControl';
import { LogRestDialog } from '@/components/rest/LogRestDialog';
import { MoonPhase } from '@/components/rest/MoonPhase';
import { RestSettingsCard } from '@/components/rest/RestSettingsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNow } from '@/hooks/useNow';
import { useRest } from '@/hooks/useRest';
import {
  addDays,
  BADGES,
  computeStats,
  dayKey,
  ENERGY_LEVELS,
  formatMinutes,
  getPractice,
  LEVEL_COLOR,
  LEVELS,
  levelFor,
  minutesByDay,
  totalEmbers,
} from '@/lib/rest';
import { cn } from '@/lib/utils';

export default function Journey() {
  useSeoMeta({ title: 'Your journey | Restful' });

  const now = useNow();
  const { state } = useRest();
  const embers = totalEmbers(state);
  const { level, next, progress } = levelFor(embers);
  const stats = computeStats(state, now);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight">Your journey</h1>
            <p className="mt-2 text-lg text-muted-foreground">Every rest adds light to your moon. Every reading teaches you your rhythm.</p>
          </div>
          <LogRestDialog>
            <Button variant="outline" className="h-11 rounded-full px-5 text-base">
              <PencilLine className="size-4" aria-hidden />
              Log a rest
            </Button>
          </LogRestDialog>
        </header>

        {/* Current phase */}
        <Card className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-transparent to-ember/10" aria-hidden />
          <CardContent className="flex flex-col items-center gap-8 py-8 sm:flex-row">
            <MoonPhase
              phase={level.phase}
              glow={Math.max(0, level.index - 3)}
              className="size-40 shrink-0 motion-safe:animate-float"
              title={`Moon phase: ${level.name}`}
            />
            <div className="w-full flex-1 space-y-4 text-center sm:text-left">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Phase {level.index + 1} of {LEVELS.length}</p>
                <h2 className="text-4xl font-semibold">{level.name}</h2>
                <p className="mt-1 text-lg text-muted-foreground">{level.blurb}</p>
              </div>
              <div className="space-y-2">
                <Progress value={progress * 100} className="h-3" aria-label="Progress to next phase" />
                <p className="flex items-center justify-center gap-1.5 text-base sm:justify-start">
                  <Flame className="size-4 text-ember" aria-hidden />
                  <span className="font-semibold tabular-nums">{embers}</span> embers
                  {next && (
                    <span className="text-muted-foreground">
                      &middot; {next.min - embers} to {next.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Current streak', value: `${stats.streak.current} day${stats.streak.current === 1 ? '' : 's'}` },
            { label: 'Best streak', value: `${stats.streak.best} day${stats.streak.best === 1 ? '' : 's'}` },
            { label: 'Total rest', value: formatMinutes(stats.totalMinutes) },
            { label: 'Bars recharged', value: String(stats.barsRecharged) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-sm">
              <dt className="text-sm font-semibold text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        <BatteryHistory now={now} />

        <RestChart now={now} />

        {/* Badges */}
        <section aria-labelledby="badges-heading" className="space-y-4">
          <div>
            <h2 id="badges-heading" className="text-3xl font-semibold">Badges</h2>
            <p className="mt-1 text-base text-muted-foreground">
              {Object.keys(state.badges).length} of {BADGES.length} earned
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {BADGES.map((b) => {
              const earnedAt = state.badges[b.id];
              const Icon = b.icon;
              return (
                <li
                  key={b.id}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-2xl border p-5 text-center',
                    earnedAt ? 'border-ember/40 bg-accent/50' : 'border-dashed bg-card/40',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-16 place-items-center rounded-full',
                      earnedAt ? 'bg-gradient-to-br from-ember to-primary text-white shadow-md' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {earnedAt ? <Icon className="size-8" aria-hidden /> : <Lock className="size-6" aria-hidden />}
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold leading-tight">{b.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
                    <p className="sr-only">{earnedAt ? 'Earned' : 'Not yet earned'}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <RecentRests />
          <RestSettingsCard />
        </div>

        {/* Phases ladder */}
        <section aria-labelledby="phases-heading" className="space-y-4">
          <h2 id="phases-heading" className="text-3xl font-semibold">Phases of rest</h2>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l, i) => (
              <li
                key={l.name}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3',
                  i === level.index && 'border-primary bg-secondary',
                  i > level.index && 'opacity-60',
                )}
                aria-current={i === level.index ? 'step' : undefined}
              >
                <MoonPhase phase={l.phase} glow={Math.max(0, i - 3)} className="size-10 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{l.min} embers</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}

function BatteryHistory({ now }: { now: number }) {
  const { state } = useRest();
  const byDay = new Map<string, number[]>();
  for (const c of state.checkins) {
    const k = dayKey(c.at);
    byDay.set(k, [...(byDay.get(k) ?? []), c.level]);
  }
  const days = Array.from({ length: 14 }, (_, i) => {
    const ts = addDays(now, i - 13);
    const readings = byDay.get(dayKey(ts)) ?? [];
    const avg = readings.length ? Math.round(readings.reduce((a, b) => a + b, 0) / readings.length) : undefined;
    return { ts, key: dayKey(ts), avg, count: readings.length };
  });
  const lowDays = days.filter((d) => d.avg && d.avg <= 2).length;
  const readDays = days.filter((d) => d.avg).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Your battery, day by day</CardTitle>
        <CardDescription className="text-base">
          {readDays === 0
            ? 'Check your battery each day and your rhythm will appear here.'
            : lowDays > 0
              ? `${lowDays} low day${lowDays === 1 ? '' : 's'} in the last two weeks. Notice what came before them.`
              : 'No low days in the last two weeks. Whatever you are doing, keep doing it.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex items-end gap-1.5 sm:gap-2">
          {days.map((d) => {
            const date = new Date(d.ts);
            const label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            return (
              <li
                key={d.key}
                className="flex flex-1 flex-col items-center gap-2"
                aria-label={d.avg ? `${label}: ${ENERGY_LEVELS[d.avg - 1].label}` : `${label}: no reading`}
              >
                <span className="h-1 w-1/3 rounded-t-sm bg-foreground/30" aria-hidden />
                <span
                  className={cn(
                    'flex h-24 w-full max-w-10 flex-col-reverse gap-0.5 rounded-md border-2 p-0.5 -mt-2',
                    d.avg ? 'border-foreground/40' : 'border-dashed border-foreground/20',
                  )}
                  aria-hidden
                  title={d.avg ? `${label}: ${ENERGY_LEVELS[d.avg - 1].short}` : `${label}: no reading`}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={cn('flex-1 rounded-[2px]', d.avg && i <= d.avg ? LEVEL_COLOR[d.avg] : 'bg-transparent')} />
                  ))}
                </span>
                <span className="text-xs text-muted-foreground" aria-hidden>
                  {date.toLocaleDateString(undefined, { weekday: 'narrow' })}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function RestChart({ now }: { now: number }) {
  const { state } = useRest();
  const byDay = minutesByDay(state.sessions);
  const goal = state.settings.dailyGoal;
  const days = Array.from({ length: 14 }, (_, i) => {
    const ts = addDays(now, i - 13);
    return { ts, key: dayKey(ts), minutes: byDay.get(dayKey(ts)) ?? 0 };
  });
  const max = Math.max(goal * 1.25, ...days.map((d) => d.minutes));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">The last two weeks</CardTitle>
        <CardDescription className="text-base">
          Dashed line is your {goal} minute goal. {days.filter((d) => d.minutes >= goal).length} of 14 days met it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-48">
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-ember/60"
            style={{ bottom: `${(goal / max) * 100}%` }}
            aria-hidden
          />
          <ul className="relative flex h-full items-end gap-1.5 sm:gap-2">
            {days.map((d) => {
              const date = new Date(d.ts);
              const label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
              return (
                <li key={d.key} className="flex h-full flex-1 flex-col justify-end" aria-label={`${label}: ${d.minutes} minutes`}>
                  <div
                    className={cn(
                      'w-full rounded-t-md motion-safe:transition-[height] motion-safe:duration-700',
                      d.minutes >= goal ? 'bg-gradient-to-t from-primary to-ember' : 'bg-primary/40',
                      d.minutes === 0 && 'bg-muted',
                    )}
                    style={{ height: d.minutes ? `${Math.max(4, (d.minutes / max) * 100)}%` : '4px' }}
                    title={`${label}: ${d.minutes} min`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-2 flex gap-1.5 text-center text-xs text-muted-foreground sm:gap-2" aria-hidden>
          {days.map((d) => (
            <span key={d.key} className="flex-1">
              {new Date(d.ts).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRests() {
  const { state } = useRest();
  const recent = [...state.sessions].reverse().slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Recent rests</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-10 text-center text-base text-muted-foreground">
            No rests yet. Your first one is waiting whenever you are.
          </div>
        ) : (
          <ul className="divide-y">
            {recent.map((s) => {
              const p = getPractice(s.practice);
              const Icon = p?.icon;
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                    {Icon && <Icon className="size-5" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {p?.name} &middot; {formatMinutes(s.minutes)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(s.endedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                      {s.logged && ' · logged'}
                    </p>
                    {s.energyBefore && s.energyAfter && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <BatteryGlyph level={s.energyBefore} />
                        <span aria-hidden>&rarr;</span>
                        <BatteryGlyph level={s.energyAfter} />
                        <span className="sr-only">
                          Battery went from {s.energyBefore} to {s.energyAfter} of 5
                        </span>
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold text-ember-foreground">
                    <Flame className="size-4" aria-hidden />+{s.embers + (s.rechargeEmbers ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
