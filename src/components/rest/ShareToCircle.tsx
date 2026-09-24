import { Check, HeartHandshake, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { LoginArea } from '@/components/auth/LoginArea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useRest } from '@/hooks/useRest';
import { useToast } from '@/hooks/useToast';
import { CIRCLE_TAG, type Practice, shareText } from '@/lib/rest';

interface ShareToCircleProps {
  practice: Practice;
  minutes: number;
}

/** Publish a completed rest to the Circle as a public note. */
export function ShareToCircle({ practice, minutes }: ShareToCircleProps) {
  const { user } = useCurrentUser();
  const { recordShare } = useRest();
  const { toast } = useToast();
  const { mutate: publish, isPending } = useNostrPublish();
  const [note, setNote] = useState('');
  const [shared, setShared] = useState(false);

  if (shared) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-base font-semibold">
        <Check className="size-5 text-primary" aria-hidden />
        Shared with the Circle. You just made rest a little more normal.
      </p>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-4 text-center">
        <p className="text-base text-muted-foreground">
          Join to share your rest with the Circle. Seeing others rest gives people permission to rest too.
        </p>
        <LoginArea className="max-w-48" />
      </div>
    );
  }

  const handleShare = () => {
    publish(
      {
        kind: 1,
        content: shareText(practice, minutes, note),
        tags: [['t', CIRCLE_TAG]],
      },
      {
        onSuccess: () => {
          setShared(true);
          recordShare();
        },
        onError: () => {
          toast({ title: 'Could not share', description: 'Your rest still counts. Try again in a moment.', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="share-note" className="text-base">
        Share with the Circle <span className="font-normal text-muted-foreground">(public)</span>
      </Label>
      <Textarea
        id="share-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="How do you feel? (optional)"
        maxLength={280}
        className="min-h-20 text-base"
      />
      <Button onClick={handleShare} disabled={isPending} variant="secondary" className="h-11 w-full rounded-full text-base">
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <HeartHandshake className="size-4" aria-hidden />}
        Share my rest
      </Button>
    </div>
  );
}
