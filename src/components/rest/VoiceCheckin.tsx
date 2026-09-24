import { Mic, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ENERGY_LEVELS, LEVEL_COLOR } from '@/lib/rest';
import { cn } from '@/lib/utils';
import { FRAME_SECONDS, RECORD_SECONDS, type Recording, recordVoice, summarise, type VoiceReading } from '@/lib/voice';

import { BatteryGlyph } from './BatteryControl';

type Status =
  | { kind: 'idle' }
  | { kind: 'listening'; db: number; elapsed: number }
  | { kind: 'result'; reading: VoiceReading }
  | { kind: 'quiet' }
  | { kind: 'error'; message: string };

const MEASURES = [
  { key: 'loudness', label: 'Loudness', hint: 'How strongly you project' },
  { key: 'tone', label: 'Tone', hint: 'How much your pitch moves' },
  { key: 'emphasis', label: 'Emphasis', hint: 'How often you stress a word' },
] as const;

const button = cn(
  'inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-base font-semibold backdrop-blur-md transition-colors',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-60',
);
const quiet = 'border-white/25 bg-black/30 text-white hover:border-white/60 hover:bg-black/40';
const loud = 'border-white bg-white text-[hsl(250_45%_14%)] hover:bg-white/90';

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return 'Microphone access was blocked. Allow it in your browser settings, or tap a battery instead.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No microphone found. Tap a battery instead.';
  }
  return 'Voice check-in is not available in this browser. Tap a battery instead.';
}

/**
 * Speak instead of tapping: a few seconds of your voice become a suggested
 * battery reading. You always confirm it; your own sense of it wins.
 */
export function VoiceCheckin({ onUse }: { onUse: (level: number) => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const recording = useRef<Recording>(undefined);

  useEffect(() => () => recording.current?.stop(), []);

  const start = async () => {
    setStatus({ kind: 'listening', db: -Infinity, elapsed: 0 });
    let count = 0;
    try {
      const rec = await recordVoice((frame) => {
        count++;
        setStatus({ kind: 'listening', db: frame.db, elapsed: count * FRAME_SECONDS });
      });
      recording.current = rec;
      const reading = summarise(await rec.done);
      recording.current = undefined;
      setStatus(reading ? { kind: 'result', reading } : { kind: 'quiet' });
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) });
    }
  };

  const listening = status.kind === 'listening';

  return (
    <div className="mt-8 space-y-4 text-white">
      <div className="flex flex-wrap items-center gap-3">
        {listening ? (
          <button type="button" onClick={() => recording.current?.stop()} className={cn(button, loud)}>
            <Square className="size-4 fill-current" aria-hidden />
            Done talking
          </button>
        ) : (
          <button type="button" onClick={start} className={cn(button, quiet)}>
            {status.kind === 'idle' ? <Mic className="size-5" aria-hidden /> : <RotateCcw className="size-5" aria-hidden />}
            {status.kind === 'idle' ? 'Or say it out loud' : 'Speak again'}
          </button>
        )}
        {status.kind === 'idle' && (
          <p className="text-base text-white/75">Your voice is heard on this device only. Nothing is recorded or sent.</p>
        )}
      </div>

      <div aria-live="polite" className="space-y-4">
        {listening && <Listening db={status.db} elapsed={status.elapsed} />}
        {status.kind === 'quiet' && (
          <p className="text-lg text-white/85">We could not hear enough speech. Try a little closer to the microphone, and keep talking for a few seconds.</p>
        )}
        {status.kind === 'error' && <p className="text-lg text-white/85">{status.message}</p>}
        {status.kind === 'result' && <Result reading={status.reading} onUse={onUse} />}
      </div>
    </div>
  );
}

function Listening({ db, elapsed }: { db: number; elapsed: number }) {
  // -60 dBFS is silence, -10 dBFS is shouting.
  const meter = Math.min(1, Math.max(0, (db + 60) / 50));
  const left = Math.max(0, Math.ceil(RECORD_SECONDS - elapsed));

  return (
    <div className="space-y-3 rounded-2xl border border-white/20 bg-black/30 p-4 backdrop-blur-md">
      <p className="text-lg font-semibold">Listening… tell us about your day.</p>
      <p className="text-base text-white/80">We listen to how you say it, not what you say. {left}s left.</p>
      <div className="h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
        <div className="h-full rounded-full bg-white transition-[width] duration-75" style={{ width: `${meter * 100}%` }} />
      </div>
    </div>
  );
}

function Result({ reading, onUse }: { reading: VoiceReading; onUse: (level: number) => void }) {
  const level = ENERGY_LEVELS[reading.level - 1];

  return (
    <div className="space-y-4 rounded-2xl border border-white/20 bg-black/30 p-4 backdrop-blur-md sm:p-5 motion-safe:animate-in motion-safe:fade-in">
      <div className="flex items-center gap-3">
        <BatteryGlyph level={reading.level} size="md" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Your voice sounds</p>
          <p className="font-display text-2xl font-semibold">{level.label}</p>
        </div>
        <p className="ml-auto text-right">
          <span className="block text-3xl font-semibold tabular-nums">{reading.energy}</span>
          <span className="text-sm text-white/70">energy / 100</span>
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        {MEASURES.map(({ key, label, hint }) => (
          <div key={key} className="space-y-1">
            <dt className="flex justify-between text-base font-semibold">
              {label}
              <span className="tabular-nums text-white/80">{Math.round(reading.scores[key] * 100)}</span>
            </dt>
            <dd className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
                <div className={cn('h-full rounded-full', LEVEL_COLOR[reading.level])} style={{ width: `${reading.scores[key] * 100}%` }} />
              </div>
              <span className="text-sm text-white/70">{hint}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onUse(reading.level)} className={cn(button, loud)}>
          Check in as {level.short.toLowerCase()}
        </button>
        <p className="text-sm text-white/70">Not quite right? Tap the battery that feels true. You know best.</p>
      </div>
    </div>
  );
}
