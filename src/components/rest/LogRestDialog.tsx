import { useState } from 'react';

import type { SessionResult } from '@/contexts/RestContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useRest } from '@/hooks/useRest';
import { formatMinutes, getPractice, PRACTICES, type PracticeId } from '@/lib/rest';
import { cn } from '@/lib/utils';

import { RewardSummary } from './RewardSummary';
import { ShareToCircle } from './ShareToCircle';

/** Log rest that happened away from the app: a bath, a book, a day off. */
export function LogRestDialog({ children }: { children: React.ReactNode }) {
  const { completeSession } = useRest();
  const [open, setOpen] = useState(false);
  const [practice, setPractice] = useState<PracticeId>('other');
  const [minutes, setMinutes] = useState(30);
  const [result, setResult] = useState<SessionResult>();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setResult(undefined);
      setPractice('other');
      setMinutes(30);
    }
  };

  const selected = getPractice(practice);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {result && selected ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-3xl">Rest logged.</DialogTitle>
              <DialogDescription className="text-base">Rest you took on your own counts just as much.</DialogDescription>
            </DialogHeader>
            <RewardSummary result={result} />
            <ShareToCircle practice={selected} minutes={result.session.minutes} />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)} className="h-11 rounded-full px-6 text-base">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-3xl">Log a rest</DialogTitle>
              <DialogDescription className="text-base">
                Took a nap, read a novel, spent the afternoon offline? Give yourself credit.
              </DialogDescription>
            </DialogHeader>

            <fieldset className="space-y-3">
              <legend className="mb-3 text-base font-semibold">What kind of rest?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRACTICES.map((p) => {
                  const Icon = p.icon;
                  const active = p.id === practice;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPractice(p.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-base font-semibold transition-colors',
                        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'border-primary bg-secondary' : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden />
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="log-minutes" className="text-base">How long?</Label>
                <span className="font-display text-2xl font-semibold tabular-nums">{formatMinutes(minutes)}</span>
              </div>
              <Slider
                id="log-minutes"
                min={5}
                max={180}
                step={5}
                value={[minutes]}
                onValueChange={([v]) => setMinutes(v)}
                aria-label="Minutes rested"
              />
            </div>

            <DialogFooter>
              <Button
                onClick={() => setResult(completeSession({ practice, minutes, logged: true }))}
                className="h-11 rounded-full px-6 text-base"
              >
                Log {formatMinutes(minutes)} of rest
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
