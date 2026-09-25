import { useSeoMeta } from '@unhead/react';

import { AppShell } from '@/components/rest/AppShell';
import { RestLoop } from '@/components/rest/RestLoop';

/** The landing page: why rest matters to movements, and a way in to the battery check-in. */
const Index = () => {
  useSeoMeta({
    title: 'Restivist: rest is resistance',
    description: 'A rest companion for activists and organizers. Burnout is how movements lose. Rest is how they last.',
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <RestLoop />
      </div>
    </AppShell>
  );
};

export default Index;
