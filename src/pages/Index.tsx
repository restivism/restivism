import { useSeoMeta } from '@unhead/react';
import { useRef } from 'react';

import { AppShell } from '@/components/rest/AppShell';
import { BatteryHero } from '@/components/rest/BatteryHero';
import { RechargePlan } from '@/components/rest/RechargePlan';
import { useNow } from '@/hooks/useNow';
import { useRest } from '@/hooks/useRest';
import { recentCheckin } from '@/lib/rest';

const Index = () => {
  useSeoMeta({
    title: 'Restful: how is your battery?',
    description: 'A rest companion for activists and organizers. Tell us how your battery is, and get a plan to recharge with play time, sleep time, or social time.',
  });

  const now = useNow();
  const { state } = useRest();
  const current = recentCheckin(state.checkins, now);
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

      <div ref={planRef} className="relative mx-auto -mt-10 max-w-3xl scroll-mt-24 px-4 sm:px-6">
        <RechargePlan checkin={current} />
      </div>
    </AppShell>
  );
};

export default Index;
