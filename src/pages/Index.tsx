import { useSeoMeta } from '@unhead/react';
import { useRef } from 'react';

import { AppShell } from '@/components/rest/AppShell';
import { BatteryHero } from '@/components/rest/BatteryHero';
import { DailyQuests } from '@/components/rest/DailyQuests';
import { NudgeCard } from '@/components/rest/NudgeCard';
import { PermissionSlip } from '@/components/rest/PermissionSlip';
import { PracticeGrid } from '@/components/rest/PracticeGrid';
import { RechargePlan } from '@/components/rest/RechargePlan';
import { TodayStrip } from '@/components/rest/TodayStrip';
import { useNow } from '@/hooks/useNow';
import { useRest } from '@/hooks/useRest';
import { getNudge, recentCheckin } from '@/lib/rest';

const Index = () => {
  useSeoMeta({
    title: 'Restful: how is your battery?',
    description: 'A rest companion for activists and organizers. Check your battery, get a recharge plan, and build the habit of rest that keeps you in the fight for the long haul.',
  });

  const now = useNow();
  const { state } = useRest();
  const current = recentCheckin(state.checkins, now);
  const nudge = getNudge(state, now);
  const planRef = useRef<HTMLDivElement>(null);

  // On small screens the plan sits below the fold; bring it into view once
  // the battery has had a moment to fill.
  const revealPlan = () => {
    window.setTimeout(() => {
      const el = planRef.current;
      if (!el || el.getBoundingClientRect().top < window.innerHeight * 0.7) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }, 450);
  };

  return (
    <AppShell>
      <BatteryHero now={now} onCheckIn={revealPlan} />

      <div className="relative mx-auto -mt-10 max-w-5xl space-y-10 px-4 sm:px-6">
        <div ref={planRef} className="scroll-mt-24">
          <RechargePlan level={current?.level} />
        </div>

        {nudge && <NudgeCard nudge={nudge} />}

        <TodayStrip now={now} />

        <div className="grid gap-6 md:grid-cols-2">
          <DailyQuests now={now} />
          <PermissionSlip now={now} />
        </div>

        <section aria-labelledby="practices-heading" className="space-y-4">
          <div>
            <h2 id="practices-heading" className="text-3xl font-semibold">Every way to recharge</h2>
            <p className="mt-1 text-base text-muted-foreground">Guided, timed, and gentle. We will chime when it is over.</p>
          </div>
          <PracticeGrid />
        </section>
      </div>
    </AppShell>
  );
};

export default Index;
