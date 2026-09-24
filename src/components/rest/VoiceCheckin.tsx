import { ExternalLink, Mic, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ENERGY_LEVELS, LEVEL_COLOR } from '@/lib/rest';
import { installSpeech, speechAvailability, type SpeechAvailability, transcribe, type Transcription } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { FRAME_SECONDS, RECORD_SECONDS, type Recording, recordVoice, summarise, type VoiceReading } from '@/lib/voice';
import { readWords, type WordReading } from '@/lib/words';

import { BatteryGlyph } from './BatteryControl';

type Status =
  | { kind: 'idle' }
  | { kind: 'listening'; db: number; elapsed: number }
  | { kind: 'result'; reading: VoiceReading }
  | { kind: 'crisis' }
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
const panel = 'space-y-4 rounded-2xl border border-white/20 bg-black/30 p-4 backdrop-blur-md sm:p-5';

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
 * Speak instead of tapping: your voice, and your words where the browser can
 * transcribe them on the device, become a suggested battery reading. You
 * always confirm it; your own sense of it wins.
 */
export function VoiceCheckin({ onUse }: { onUse: (level: number) => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [speech, setSpeech] = useState<SpeechAvailability>();
  const [heard, setHeard] = useState('');
  const recording = useRef<Recording>(undefined);
  const transcription = useRef<Transcription>(undefined);

  useEffect(() => {
    let live = true;
    void speechAvailability().then((a) => live && setSpeech(a));
    return () => {
      live = false;
      recording.current?.stop();
      transcription.current?.stop();
    };
  }, []);

  const start = async () => {
    setStatus({ kind: 'listening', db: -Infinity, elapsed: 0 });
    setHeard('');
    const words = speech === 'available' ? transcribe(setHeard) : undefined;
    transcription.current = words;
    let count = 0;
    try {
      const rec = await recordVoice((frame) => {
        count++;
        setStatus({ kind: 'listening', db: frame.db, elapsed: count * FRAME_SECONDS });
      });
      recording.current = rec;
      const frames = await rec.done;
      recording.current = undefined;

      words?.stop();
      const text = await words?.done;
      transcription.current = undefined;
      const said = text ? readWords(text) : undefined;
      if (said?.crisis.length) return setStatus({ kind: 'crisis' });

      const reading = summarise(frames, said);
      setStatus(reading ? { kind: 'result', reading } : { kind: 'quiet' });
    } catch (error) {
      words?.stop();
      setStatus({ kind: 'error', message: errorMessage(error) });
    }
  };

  const download = async () => {
    setSpeech('downloading');
    await installSpeech();
    setSpeech(await speechAvailability());
  };

  const listening = status.kind === 'listening';

  if (status.kind === 'crisis') return <CrisisSupport onBack={() => setStatus({ kind: 'idle' })} />;

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
        {status.kind === 'idle' && <PrivacyNote speech={speech} onDownload={download} />}
      </div>

      <div aria-live="polite" className="space-y-4">
        {listening && <Listening db={status.db} elapsed={status.elapsed} heard={speech === 'available' ? heard : undefined} />}
        {status.kind === 'quiet' && (
          <p className="text-lg text-white/85">We could not hear enough speech. Try a little closer to the microphone, and keep talking for a few seconds.</p>
        )}
        {status.kind === 'error' && <p className="text-lg text-white/85">{status.message}</p>}
        {status.kind === 'result' && <Result reading={status.reading} onUse={onUse} />}
      </div>
    </div>
  );
}

function PrivacyNote({ speech, onDownload }: { speech?: SpeechAvailability; onDownload: () => void }) {
  if (speech === 'available') {
    return <p className="text-base text-white/75">Your voice and words are heard on this device only. Nothing is recorded or sent.</p>;
  }
  return (
    <div className="space-y-1 text-base text-white/75">
      <p>Your voice is heard on this device only. Nothing is recorded or sent.</p>
      {speech === 'downloadable' && (
        <p>
          <button type="button" onClick={onDownload} className="rounded font-semibold text-white underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
            Also listen to my words
          </button>{' '}
          (a one-time download, about 60 MB, that stays on this device)
        </p>
      )}
      {speech === 'downloading' && <p>Downloading on-device speech… you can check in by tone meanwhile.</p>}
      {speech === 'unavailable' && <p>This browser cannot understand words on the device, so we only listen to your tone.</p>}
    </div>
  );
}

function Listening({ db, elapsed, heard }: { db: number; elapsed: number; heard?: string }) {
  // -60 dBFS is silence, -10 dBFS is shouting.
  const meter = Math.min(1, Math.max(0, (db + 60) / 50));
  const left = Math.max(0, Math.ceil(RECORD_SECONDS - elapsed));

  return (
    <div className={panel}>
      <p className="text-lg font-semibold">Listening… tell us about your day.</p>
      <p className="text-base text-white/80">
        {heard === undefined ? 'We listen to how you say it, not what you say.' : 'We listen to how you say it, and what you say.'} {left}s left.
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
        <div className="h-full rounded-full bg-white transition-[width] duration-75" style={{ width: `${meter * 100}%` }} />
      </div>
      {heard && <p className="text-base italic text-white/85" aria-live="off">“{heard}”</p>}
    </div>
  );
}

function wordsHint(words: WordReading): string {
  const heard = [...words.negative, ...words.positive];
  if (!heard.length) return 'No mood words heard';
  return `Heard ${heard.slice(0, 4).map((w) => `“${w}”`).join(', ')}`;
}

function Bar({ label, value, hint, level }: { label: string; value: number; hint: string; level: number }) {
  return (
    <div className="space-y-1">
      <dt className="flex justify-between text-base font-semibold">
        {label}
        <span className="tabular-nums text-white/80">{Math.round(value * 100)}</span>
      </dt>
      <dd className="space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div className={cn('h-full rounded-full', LEVEL_COLOR[level])} style={{ width: `${value * 100}%` }} />
        </div>
        <span className="text-sm text-white/70">{hint}</span>
      </dd>
    </div>
  );
}

function Result({ reading, onUse }: { reading: VoiceReading; onUse: (level: number) => void }) {
  const level = ENERGY_LEVELS[reading.level - 1];
  const { words } = reading;

  return (
    <div className={cn(panel, 'motion-safe:animate-in motion-safe:fade-in')}>
      <div className="flex items-center gap-3">
        <BatteryGlyph level={reading.level} size="md" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/70">{words ? 'You sound' : 'Your voice sounds'}</p>
          <p className="font-display text-2xl font-semibold">{level.label}</p>
        </div>
        <p className="ml-auto text-right">
          <span className="block text-3xl font-semibold tabular-nums">{reading.energy}</span>
          <span className="text-sm text-white/70">energy / 100</span>
        </p>
      </div>

      <dl className={cn('grid gap-3', words ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        {MEASURES.map(({ key, label, hint }) => (
          <Bar key={key} label={label} value={reading.scores[key]} hint={hint} level={reading.level} />
        ))}
        {words && <Bar label="Words" value={words.score ?? 0.5} hint={wordsHint(words)} level={reading.level} />}
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
