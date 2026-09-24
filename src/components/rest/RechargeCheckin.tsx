import { useState } from 'react';

import type { CheckinResult } from '@/contexts/RestContext';
import { useRest } from '@/hooks/useRest';
import { ENERGY_LEVELS, type RestSession } from '@/lib/rest';

import { BatteryControl, BatteryGlyph } from './BatteryControl';

function message(result: CheckinResult): string {
  if (result.gained === undefined) return 'Noted. Your plan has been updated for this reading.';
  if (result.gained > 0) return `+${result.gained} bar${result.gained === 1 ? '' : 's'}. That is what rest does.`;
  if (result.gained === 0) return 'Same as before. Some rest works slowly, and it still counts.';
  return 'Lower than before. Sometimes stopping shows you how tired you really were. Be gentle with yourself tonight.';
}

/** Ask for a fresh battery reading right after a rest, and show what changed. */
export function RechargeCheckin({ session }: { session: RestSession }) {
  const { state, checkIn } = useRest();
  const live = state.sessions.find((s) => s.id === session.id) ?? session;
  const [result, setResult] = useState<CheckinResult>();
  const before = live.energyBefore;

  return (
    <section aria-labelledby="recheck-heading" className="space-y-4 rounded-2xl border bg-card/70 p-5 backdrop-blur">
      <div className="space-y-1">
        <h2 id="recheck-heading" className="text-2xl font-semibold">How is your battery now?</h2>
        {before && (
          <p className="flex items-center gap-2 text-base text-muted-foreground">
            You came in at <BatteryGlyph level={before} /> {ENERGY_LEVELS[before - 1].short.toLowerCase()}.
          </p>
        )}
      </div>
      <BatteryControl
        size="md"
        value={live.energyAfter}
        onChange={(level) => setResult(checkIn(level, session.id))}
        label="How charged do you feel after resting?"
      />
      <div aria-live="polite">
        {result && (
          <p className="rounded-xl bg-muted/60 px-4 py-3 text-base font-semibold motion-safe:animate-in motion-safe:fade-in">
            {message(result)}
          </p>
        )}
      </div>
    </section>
  );
}
