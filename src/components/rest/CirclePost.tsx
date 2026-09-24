import type { NostrEvent } from '@nostrify/nostrify';
import { Heart } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { sanitizeUrl } from '@/lib/sanitizeUrl';

export function CirclePostSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

function relativeTime(seconds: number): string {
  const diff = Date.now() / 1000 - seconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CirclePost({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const npub = nip19.npubEncode(event.pubkey);
  const name = metadata?.display_name || metadata?.name || `${npub.slice(0, 12)}…`;
  const picture = sanitizeUrl(metadata?.picture);

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center gap-3">
          <Link to={`/${npub}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-11">
              {picture && <AvatarImage src={picture} alt="" />}
              <AvatarFallback className="bg-secondary font-semibold">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link to={`/${npub}`} className="block truncate font-semibold hover:underline">
              {name}
            </Link>
            <p className="text-sm text-muted-foreground">{relativeTime(event.created_at)}</p>
          </div>
        </div>
        <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{event.content}</p>
        <SendCare event={event} />
      </CardContent>
    </Card>
  );
}

function SendCare({ event }: { event: NostrEvent }) {
  const { user } = useCurrentUser();
  const { mutate: publish, isPending } = useNostrPublish();
  const [sent, setSent] = useState(false);

  if (!user || user.pubkey === event.pubkey) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={sent || isPending}
      aria-pressed={sent}
      className="-ml-2 rounded-full text-base text-muted-foreground hover:text-foreground"
      onClick={() =>
        publish(
          {
            kind: 7,
            content: '+',
            tags: [['e', event.id], ['p', event.pubkey], ['k', '1']],
          },
          { onSuccess: () => setSent(true) },
        )
      }
    >
      <Heart className={sent ? 'size-4 fill-rose-500 text-rose-500' : 'size-4'} aria-hidden />
      {sent ? 'Care sent' : 'Send care'}
    </Button>
  );
}
