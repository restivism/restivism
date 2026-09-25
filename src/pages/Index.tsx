import { useSeoMeta } from '@unhead/react';

import { AppShell } from '@/components/rest/AppShell';
import { BatteryHero } from '@/components/rest/BatteryHero';
import { RechargePlan } from '@/components/rest/RechargePlan';
import { RestRecord } from '@/components/rest/RestRecord';
import { useNow } from '@/hooks/useNow';
import { useRest } from '@/hooks/useRest';
import { recentCheckin } from '@/lib/rest';

const Index = () => {
  useSeoMeta({
    title: 'Restivist: how is your battery?',
    description: 'A rest companion for activists and organizers. Tell us how your battery is, and get a plan to recharge with play time, sleep time, or social time.',
  });

  const now = useNow();
  const { state } = useRest();
  const current = recentCheckin(state.checkins, now);

  return (
    <AppShell>
      <BatteryHero now={now} />

      <div className="relative mx-auto -mt-10 max-w-3xl space-y-6 px-4 sm:px-6">
        <RechargePlan checkin={current} />
        <RestRecord state={state} now={now} />
      </div>
    </AppShell>
  );
};

export default Index;
