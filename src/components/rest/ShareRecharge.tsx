import { Download, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { type RechargeCard, renderRechargeCard } from '@/lib/shareCard';

const FILE_NAME = 'restivist-recharge.png';

/** Render the card while mounted and hand back a file plus a preview URL. */
function useCard(card: RechargeCard) {
  const [result, setResult] = useState<{ file: File; url: string }>();
  const { rechargeName, minutes, before, after } = card;

  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    renderRechargeCard({ rechargeName, minutes, before, after }).then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setResult({ file: new File([blob], FILE_NAME, { type: 'image/png' }), url });
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [rechargeName, minutes, before, after]);

  return result;
}

function CardPreview({ card }: { card: RechargeCard }) {
  const result = useCard(card);
  const [status, setStatus] = useState('');
  const canShare = !!result && typeof navigator.canShare === 'function' && navigator.canShare({ files: [result.file] });

  const share = async () => {
    if (!result) return;
    try {
      await navigator.share({ files: [result.file], text: 'I took time to recharge. Rest is resistance.' });
    } catch {
      // Dismissed.
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = FILE_NAME;
    a.click();
    setStatus('Saved. Post it and remind your people that rest counts.');
  };

  return (
    <div className="space-y-4">
      {result ? (
        <img
          src={result.url}
          alt="A card that reads: I recharged. Rest is resistance."
          className="aspect-[4/5] w-full rounded-xl shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
        />
      ) : (
        <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      )}
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <Button className="h-12 flex-1 rounded-full text-base" onClick={share}>
            <Share2 className="size-5" aria-hidden />
            Share
          </Button>
        )}
        <Button variant={canShare ? 'outline' : 'default'} className="h-12 flex-1 rounded-full text-base" onClick={download} disabled={!result}>
          <Download className="size-5" aria-hidden />
          Save image
        </Button>
      </div>
      <p className="min-h-6 text-center text-sm text-muted-foreground" aria-live="polite">{status}</p>
    </div>
  );
}

/** A button that opens a shareable card for a finished rest. */
export function ShareRecharge({ card }: { card: RechargeCard }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="h-12 rounded-full border-ember/60 text-base">
          <Share2 className="size-5" aria-hidden />
          Share your recharge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Rest out loud.</DialogTitle>
          <DialogDescription>
            When organizers see each other rest, it gets easier for everyone to stop.
          </DialogDescription>
        </DialogHeader>
        <CardPreview card={card} />
      </DialogContent>
    </Dialog>
  );
}
