import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRest } from '@/hooks/useRest';
import { ENERGY_LEVELS, recentCheckin } from '@/lib/rest';
import { cn } from '@/lib/utils';

const LEVEL_COLOR: Record<number, string> = {
  1: 'bg-rose-500',
  2: 'bg-orange-500',
  3: 'bg-amber-400',
  4: 'bg-lime-500',
  5: 'bg-emerald-500',
};

export function Battery({ level, className }: { level: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)} aria-hidden>
      <span className="flex h-5 w-9 gap-0.5 rounded-[5px] border-2 border-current p-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn('flex-1 rounded-[1px]', i <= level ? LEVEL_COLOR[level] : 'bg-transparent')} />
        ))}
      </span>
      <span className="ml-px h-2 w-0.5 rounded-r-sm bg-current" />
    </span>
  );
}

const RESPONSES: Record<number, string> = {
  1: 'Thank you for being honest. Everything else can wait. Please rest now.',
  2: 'That is real, and it matters. Let us find you some rest soon.',
  3: 'Getting by is not the same as thriving. A small break now keeps you here.',
  4: 'Good. Rest now so you stay here, not just to recover later.',
  5: 'Wonderful. Notice what got you here, and protect it.',
};

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export function EnergyCheckin() {
  const { state, checkIn } = useRest();
  const current = recentCheckin(state.checkins);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-display text-2xl">How is your battery?</CardTitle>
        <CardDescription className="text-base">
          {current
            ? `Checked in ${timeAgo(current.at)}: ${ENERGY_LEVELS[current.level - 1].label.toLowerCase()}.`
            : 'Be honest. Nobody else sees this.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div role="radiogroup" aria-label="Energy level" className="grid grid-cols-5 gap-2">
          {ENERGY_LEVELS.map(({ level, short, label }) => {
            const selected = current?.level === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                onClick={() => checkIn(level)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border px-1 py-3 text-sm font-semibold transition-all',
                  'hover:border-primary/50 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'motion-safe:active:scale-95',
                  selected ? 'border-primary bg-secondary text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                <Battery level={level} />
                {short}
              </button>
            );
          })}
        </div>
        {current && (
          <p className="rounded-lg bg-muted/60 px-4 py-3 text-base leading-relaxed" aria-live="polite">
            {RESPONSES[current.level]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
