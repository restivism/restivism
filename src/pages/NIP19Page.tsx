import type { NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';

import { AppShell } from '@/components/rest/AppShell';
import { CirclePost, CirclePostSkeleton } from '@/components/rest/CirclePost';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { CIRCLE_TAG } from '@/lib/rest';
import { sanitizeUrl } from '@/lib/sanitizeUrl';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  switch (decoded.type) {
    case 'npub':
      return <ProfileView pubkey={decoded.data} />;

    case 'nprofile':
      return <ProfileView pubkey={decoded.data.pubkey} />;

    case 'note':
      return <NoteView filter={{ ids: [decoded.data], limit: 1 }} />;

    case 'nevent': {
      const { id, author } = decoded.data;
      return <NoteView filter={author ? { ids: [id], authors: [author], limit: 1 } : { ids: [id], limit: 1 }} />;
    }

    default:
      return <NotFound />;
  }
}

function useEvents(filter: NostrFilter) {
  const { nostr } = useNostr();
  return useQuery({
    queryKey: ['nip19-events', filter],
    queryFn: async ({ signal }) => {
      const events = await nostr.query([filter], { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
      return events.sort((a, b) => b.created_at - a.created_at);
    },
  });
}

function ProfileView({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const name = metadata?.display_name || metadata?.name || `${nip19.npubEncode(pubkey).slice(0, 12)}…`;
  const picture = sanitizeUrl(metadata?.picture);
  const { data: events, isLoading } = useEvents({ kinds: [1], authors: [pubkey], '#t': [CIRCLE_TAG], limit: 30 });

  useSeoMeta({ title: `${name} | Restful` });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
        <header className="flex items-center gap-4">
          {author.isLoading ? (
            <Skeleton className="size-20 rounded-full" />
          ) : (
            <Avatar className="size-20">
              {picture && <AvatarImage src={picture} alt="" />}
              <AvatarFallback className="bg-secondary text-2xl font-semibold">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-4xl font-semibold">{name}</h1>
            {metadata?.about && <p className="mt-1 line-clamp-2 text-base text-muted-foreground">{metadata.about}</p>}
          </div>
        </header>

        <section aria-labelledby="rests-heading" className="space-y-4">
          <h2 id="rests-heading" className="text-2xl font-semibold">Rests shared</h2>
          {isLoading ? (
            <CirclePostSkeleton />
          ) : events?.length ? (
            <ul className="space-y-4">
              {events.map((e) => (
                <li key={e.id}>
                  <CirclePost event={e} />
                </li>
              ))}
            </ul>
          ) : (
            <Card className="border-dashed">
              <CardContent className="px-8 py-12 text-center">
                <p className="mx-auto max-w-sm text-base text-muted-foreground">No rests shared yet.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function NoteView({ filter }: { filter: NostrFilter }) {
  const { data: events, isLoading } = useEvents(filter);
  const event = events?.[0];

  useSeoMeta({ title: 'A shared rest | Restful' });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <CirclePostSkeleton />
        ) : event ? (
          <CirclePost event={event} />
        ) : (
          <Card className="border-dashed">
            <CardContent className="px-8 py-12 text-center">
              <p className="mx-auto max-w-sm text-base text-muted-foreground">
                We could not find this post. Try checking your relay connections.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
