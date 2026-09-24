import { ExternalLink, Mic, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ENERGY_LEVELS, LEVEL_COLOR } from '@/lib/rest';
import { optedIn, prepareUnderstanding, understand, understandingSupported } from '@/lib/understand';
import { cn } from '@/lib/utils';
import { FRAME_SECONDS, RECORD_SECONDS, type Recording, recordVoice, summarise, type VoiceReading } from '@/lib/voice';
import { crisisPhrases } from '@/lib/words';

import { BatteryGlyph } from './BatteryControl';

type Status =
  | { kind: 'idle' }
  | { kind: 'listening'; db: number; elapsed: number }
  | { kind: 'thinking' }
  | { kind: 'result'; reading: VoiceReading; heard?: string }
  | { kind: 'crisis' }
  | { kind: 'quiet' }
  | { kind: 'error'; message: string };

/** Whether we can understand words, not just tone. */
type Words =
  | { kind: 'unsupported' }
  | { kind: 'off' }
  | { kind: 'loading'; progress?: number }
  | { kind: 'ready' }
  | { kind: 'failed' };

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
const panel = 'space-y-4 rounded-2xl border border-white/20 bg-black/30 p-4 backdrop-blur-md sm:p-5';
const link = 'rounded font-semibold text-white underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60';

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
 * Speak instead of tapping. What you say (understood on this device) sets the
 * battery, and a flat, quiet voice can pull it lower. Tapping a battery
 * afterwards overrides it; your own sense of it wins.
 */
export function VoiceCheckin({ onLevel }: { onLevel: (level: number) => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [words, setWords] = useState<Words>(() =>
    !understandingSupported() ? { kind: 'unsupported' } : optedIn() ? { kind: 'loading' } : { kind: 'off' },
  );
  const recording = useRef<Recording>(undefined);

  const loadWords = () =>
    prepareUnderstanding((progress) => setWords({ kind: 'loading', progress })).then(
      () => setWords({ kind: 'ready' }),
      () => setWords({ kind: 'failed' }),
    );

  const enableWords = () => {
    setWords({ kind: 'loading' });
    void loadWords();
  };

  useEffect(() => {
    // Opted in before: load the cached models in the background.
    if (words.kind === 'loading') void loadWords();
    return () => recording.current?.stop();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setStatus({ kind: 'listening', db: -Infinity, elapsed: 0 });
    const withWords = words.kind === 'ready';
    let count = 0;
    try {
      const rec = await recordVoice((frame) => {
        count++;
        setStatus({ kind: 'listening', db: frame.db, elapsed: count * FRAME_SECONDS });
      }, withWords);
      recording.current = rec;
      const { frames, audio } = await rec.done;
      recording.current = undefined;

      let heard: string | undefined;
      let positivity: number | undefined;
      if (withWords && audio) {
        setStatus({ kind: 'thinking' });
        try {
          ({ text: heard, positivity } = await understand(audio));
        } catch {
          // Fall back to tone; the result says the words were not understood.
        }
      }
      if (heard && crisisPhrases(heard).length) return setStatus({ kind: 'crisis' });

      const reading = summarise(frames, positivity);
      setStatus(reading ? { kind: 'result', reading, heard } : { kind: 'quiet' });
      // Check in just as if the matching battery had been tapped.
      if (reading?.level) onLevel(reading.level);
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) });
    }
  };

  if (status.kind === 'crisis') return <CrisisSupport onBack={() => setStatus({ kind: 'idle' })} />;

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
          <button type="button" onClick={start} disabled={status.kind === 'thinking'} className={cn(button, quiet)}>
            {status.kind === 'idle' ? <Mic className="size-5" aria-hidden /> : <RotateCcw className="size-5" aria-hidden />}
            {status.kind === 'idle' ? 'Or say it out loud' : 'Speak again'}
          </button>
        )}
        {status.kind === 'idle' && <PrivacyNote words={words} onEnable={enableWords} />}
      </div>

      <div aria-live="polite" className="space-y-4">
        {listening && <Listening db={status.db} elapsed={status.elapsed} withWords={words.kind === 'ready'} />}
        {status.kind === 'thinking' && (
          <p className={cn(panel, 'text-lg font-semibold')}>Listening back to what you said…</p>
        )}
        {status.kind === 'quiet' && (
          <p className="text-lg text-white/85">We could not hear enough speech. Try a little closer to the microphone, and keep talking for a few seconds.</p>
        )}
        {status.kind === 'error' && <p className="text-lg text-white/85">{status.message}</p>}
        {status.kind === 'result' && (
          <Result reading={status.reading} heard={status.heard} words={words} onEnable={enableWords} />
        )}
      </div>
    </div>
  );
}

function EnableWords({ words, onEnable }: { words: Words; onEnable: () => void }) {
  if (words.kind === 'off' || words.kind === 'failed') {
    return (
      <p>
        {words.kind === 'failed' && 'The download did not finish. '}
        <button type="button" onClick={onEnable} className={link}>
          {words.kind === 'failed' ? 'Try again' : 'Also understand my words'}
        </button>{' '}
        (a one-time download, about 110 MB, that runs on this device)
      </p>
    );
  }
  if (words.kind === 'loading') {
    return <p>Getting ready to understand words{words.progress === undefined ? '…' : ` … ${Math.round(words.progress * 100)}%`}</p>;
  }
  return null;
}

function PrivacyNote({ words, onEnable }: { words: Words; onEnable: () => void }) {
  return (
    <div className="space-y-1 text-base text-white/75">
      <p>
        {words.kind === 'ready' ? 'Your voice and words are' : 'Your voice is'} heard on this device only. Nothing is saved or sent.
      </p>
      <EnableWords words={words} onEnable={onEnable} />
      {words.kind === 'unsupported' && <p>This browser cannot understand words on the device, so we only listen to your tone.</p>}
    </div>
  );
}

function Listening({ db, elapsed, withWords }: { db: number; elapsed: number; withWords: boolean }) {
  // -60 dBFS is silence, -10 dBFS is shouting.
  const meter = Math.min(1, Math.max(0, (db + 60) / 50));
  const left = Math.max(0, Math.ceil(RECORD_SECONDS - elapsed));

  return (
    <div className={panel}>
      <p className="text-lg font-semibold">Listening… tell us about your day.</p>
      <p className="text-base text-white/80">
        {withWords ? 'We listen to what you say and how you say it.' : 'We listen to how you say it.'} {left}s left.
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
        <div className="h-full rounded-full bg-white transition-[width] duration-75" style={{ width: `${meter * 100}%` }} />
      </div>
    </div>
  );
}

function Bar({ label, value, hint, color }: { label: string; value: number; hint: string; color: string }) {
  return (
    <div className="space-y-1">
      <dt className="flex justify-between text-base font-semibold">
        {label}
        <span className="tabular-nums text-white/80">{Math.round(value * 100)}</span>
      </dt>
      <dd className="space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div className={cn('h-full rounded-full', color)} style={{ width: `${value * 100}%` }} />
        </div>
        <span className="text-sm text-white/70">{hint}</span>
      </dd>
    </div>
  );
}

interface ResultProps {
  reading: VoiceReading;
  heard?: string;
  words: Words;
  onEnable: () => void;
}

function Result({ reading, heard, words, onEnable }: ResultProps) {
  const { level, energy } = reading;
  const info = level ? ENERGY_LEVELS[level - 1] : undefined;
  const color = level ? LEVEL_COLOR[level] : 'bg-white/70';

  return (
    <div className={cn(panel, 'motion-safe:animate-in motion-safe:fade-in')}>
      {level && info ? (
        <div className="flex items-center gap-3">
          <BatteryGlyph level={level} size="md" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">You sound</p>
            <p className="font-display text-2xl font-semibold">{info.label}</p>
          </div>
          <p className="ml-auto text-right">
            <span className="block text-3xl font-semibold tabular-nums">{energy}</span>
            <span className="text-sm text-white/70">energy / 100</span>
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-display text-2xl font-semibold">We only heard your tone</p>
          <p className="text-base text-white/80">
            Tone alone cannot tell tired from upset, so we will not guess a level. Tap the battery that feels true.
          </p>
        </div>
      )}

      {heard && <p className="text-base italic text-white/85">“{heard}”</p>}

      <dl className="grid gap-3 sm:grid-cols-3">
        {MEASURES.map(({ key, label, hint }) => (
          <Bar key={key} label={label} value={reading.scores[key]} hint={hint} color={color} />
        ))}
      </dl>

      {level && info ? (
        <p className="text-base text-white/80">
          Your battery is set to <span className="font-semibold text-white">{info.short.toLowerCase()}</span>. Not quite
          right? Tap the battery that feels true. You know best.
        </p>
      ) : (
        <div className="text-sm text-white/75">
          <EnableWords words={words} onEnable={onEnable} />
        </div>
      )}
    </div>
  );
}

/**
 * Shown instead of a reading when someone mentions suicide or self-harm.
 * A battery level is the wrong answer to that.
 */
function CrisisSupport({ onBack }: { onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section aria-labelledby="crisis-heading" className={cn(panel, 'mt-8 text-white motion-safe:animate-in motion-safe:fade-in')}>
      <h2 id="crisis-heading" ref={heading} tabIndex={-1} className="font-display text-3xl font-semibold focus:outline-none">
        You matter.
      </h2>
      <p className="text-lg leading-relaxed text-white/90">
        It sounds like you might be thinking about ending your life or hurting yourself. You do not have to carry that
        alone, and you do not have to wait until it gets worse to talk to someone.
      </p>
      <a
        href="https://findahelpline.com"
        target="_blank"
        rel="noreferrer"
        className={cn(button, loud, 'no-underline')}
      >
        Find a free, confidential helpline near you
        <ExternalLink className="size-4" aria-hidden />
      </a>
      <ul className="list-disc space-y-1 pl-5 text-base text-white/85">
        <li>If you are in immediate danger, call your local emergency number now.</li>
        <li>Tell someone you trust how you are really doing, today.</li>
      </ul>
      <p className="text-sm text-white/70">If we misheard you, that is okay. We would rather ask.</p>
      <button type="button" onClick={onBack} className={cn(button, quiet)}>
        Back to check-in
      </button>
    </section>
  );
}
