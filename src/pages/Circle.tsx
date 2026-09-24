import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';

import { AppShell } from '@/components/rest/AppShell';
import { CirclePost, CirclePostSkeleton } from '@/components/rest/CirclePost';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCircleFeed } from '@/hooks/useCircleFeed';
import { CIRCLE_TAG } from '@/lib/rest';

export default function Circle() {
  useSeoMeta({
    title: 'The Circle | Restful',
    description: 'See organizers and activists taking time to rest, and send them some care.',
  });

  const { data: events, isLoading } = useCircleFeed();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
        <header className="space-y-3">
          <h1 className="text-5xl font-semibold tracking-tight">The Circle</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Burnout spreads when everyone performs endless hustle. So does rest, when people see it. Here are
            organizers who stopped to recharge. Send them some care, then take your turn.
          </p>
          <Button asChild className="h-11 rounded-full px-6 text-base">
            <Link to="/">Take your turn</Link>
          </Button>
        </header>

        {isLoading ? (
          <ul className="space-y-4">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <CirclePostSkeleton />
              </li>
            ))}
          </ul>
        ) : events && events.length > 0 ? (
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.id}>
                <CirclePost event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <Card className="border-dashed">
            <CardContent className="px-8 py-12 text-center">
              <p className="mx-auto max-w-sm text-base text-muted-foreground">
                The Circle is quiet right now. Finish a rest and share it with #{CIRCLE_TAG} to be the first one here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
