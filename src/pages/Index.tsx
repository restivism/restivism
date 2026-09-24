import { useSeoMeta } from '@unhead/react';
import { ArrowRight, Flame, PencilLine } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppShell } from '@/components/rest/AppShell';
import { DailyQuests } from '@/components/rest/DailyQuests';
import { EnergyCheckin } from '@/components/rest/EnergyCheckin';
import { LogRestDialog } from '@/components/rest/LogRestDialog';
import { MoonPhase } from '@/components/rest/MoonPhase';
import { NudgeCard } from '@/components/rest/NudgeCard';
import { PermissionSlip } from '@/components/rest/PermissionSlip';
import { PracticeGrid } from '@/components/rest/PracticeGrid';
import { ProgressRing } from '@/components/rest/ProgressRing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNow } from '@/hooks/useNow';
import { useRest } from '@/hooks/useRest';
import { computeStreak, getNudge, levelFor, minutesOnDay, totalEmbers } from '@/lib/rest';

function greeting(hour: number): string {
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

const Index = () => {
  useSeoMeta({
    title: 'Restful: rest is resistance',
    description: 'A rest companion for activists and organizers. Check in with your energy, take guided breaks, and build a rest streak that keeps you in the fight for the long haul.',
  });

  const now = useNow();
  const { state } = useRest();
  const embers = totalEmbers(state);
  const { level } = levelFor(embers);
  const streak = computeStreak(state.sessions, now);
  const today = minutesOnDay(state.sessions, now);
  const goal = state.settings.dailyGoal;
  const nudge = getNudge(state, now);
  const hour = new Date(now).getHours();

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src="/dusk.webp"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_70%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(250_45%_10%/0.35)] via-[hsl(250_45%_10%/0.45)] to-background" />

        <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <p className="text-lg font-semibold text-white/85">{greeting(hour)}</p>
          <h1 className="mt-2 max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-6xl">
            {streak.restedToday ? 'You rested today. Keep it going.' : 'Have you rested today?'}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            The work matters. So do you. Rest is how you stay in it for the long haul.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-14 rounded-full bg-white px-8 text-lg text-[hsl(250_40%_15%)] shadow-lg hover:bg-white/90">
              <Link to="/rest/breathe?m=5">
                Rest now
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
            <LogRestDialog>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-white/40 bg-white/10 px-6 text-lg text-white backdrop-blur hover:bg-white/20 hover:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20"
              >
                <PencilLine className="size-5" aria-hidden />
                Log a rest
              </Button>
            </LogRestDialog>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/journey"
              className="flex items-center gap-3 rounded-full bg-black/45 py-2 pl-2 pr-5 text-white backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <MoonPhase phase={level.phase} glow={Math.max(0, level.index - 3)} className="size-9" />
              <span className="font-semibold">{level.name}</span>
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-black/45 px-5 py-2 text-white backdrop-blur-md">
              <Flame className="size-5 text-amber-300" aria-hidden />
              <span className="font-semibold tabular-nums">{embers} embers</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-black/45 px-5 py-2 text-white backdrop-blur-md">
              <span className="font-semibold tabular-nums">
                {streak.current} day streak{streak.current > 0 && !streak.restedToday ? ' (rest today to keep it)' : ''}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative mx-auto -mt-6 max-w-5xl space-y-8 px-4 sm:px-6">
        {nudge && <NudgeCard nudge={nudge} />}

        <div className="grid gap-6 md:grid-cols-5">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Today&apos;s rest</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ProgressRing value={today / goal} size={180} label={`${today} of ${goal} minutes rested today`}>
                <div>
                  <p className="font-display text-5xl font-semibold tabular-nums">{today}</p>
                  <p className="text-base text-muted-foreground">of {goal} min</p>
                </div>
              </ProgressRing>
              <p className="text-center text-base text-muted-foreground">
                {today >= goal
                  ? 'Goal met. Anything more is a gift to yourself.'
                  : `${goal - today} more minutes to fill your cup today.`}
              </p>
            </CardContent>
          </Card>
          <div className="md:col-span-3">
            <EnergyCheckin />
          </div>
        </div>

        <section aria-labelledby="practices-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="practices-heading" className="text-3xl font-semibold">Choose your rest</h2>
              <p className="mt-1 text-base text-muted-foreground">Guided, timed, and gentle. We will chime when it is over.</p>
            </div>
          </div>
          <PracticeGrid />
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <DailyQuests now={now} />
          <PermissionSlip now={now} />
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
