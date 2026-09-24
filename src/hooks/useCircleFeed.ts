import type { NostrEvent } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

import { CIRCLE_TAG } from '@/lib/rest';

/** Public notes tagged #restful: people sharing the rest they took. */
export function useCircleFeed() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['circle-feed'],
    queryFn: async ({ signal }) => {
      const events = await nostr.query(
        [{ kinds: [1], '#t': [CIRCLE_TAG], limit: 50 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) },
      );
      return events.sort((a: NostrEvent, b: NostrEvent) => b.created_at - a.created_at);
    },
    staleTime: 30_000,
  });
}
