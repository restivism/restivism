import { Check, Flame } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRest } from '@/hooks/useRest';
import { dayKey, QUEST_EMBERS, questsForDay } from '@/lib/rest';
import { cn } from '@/lib/utils';

export function DailyQuests({ now }: { now: number }) {
  const { state, toggleQuest } = useRest();
  const key = dayKey(now);
  const quests = questsForDay(key);
  const done = state.quests[key] ?? [];
  const allDone = quests.every((q) => done.includes(q.id));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Today&apos;s care quests</CardTitle>
        <CardDescription className="text-base">
          {allDone ? 'All tended. That is what taking care of yourself looks like.' : 'Small acts of refusal against burnout. New ones tomorrow.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {quests.map((q) => {
            const checked = done.includes(q.id);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleQuest(q.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors',
                    'hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    checked && 'border-ember/40 bg-accent/60',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
                      checked ? 'border-ember bg-ember text-white' : 'border-muted-foreground/40',
                    )}
                    aria-hidden
                  >
                    {checked && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className={cn('flex-1', checked && 'text-muted-foreground line-through decoration-ember/60')}>{q.text}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-ember-foreground">
                    <Flame className="size-4" aria-hidden />+{QUEST_EMBERS}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
