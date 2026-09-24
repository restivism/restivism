/**
 * On-device speech-to-text for voice check-ins, via the Web Speech API's
 * `processLocally` mode (Chrome 139+). We never fall back to a cloud
 * recogniser: if the browser cannot transcribe on the device, only tone is
 * measured. Transcripts live in memory for the check-in and are never saved.
 */

/** `SpeechRecognition.available()` results, plus our own "no API at all". */
export type SpeechAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

interface SpeechOptions {
  langs: string[];
  processLocally: boolean;
}

// TypeScript's DOM library has the events but not the recogniser itself.
interface Recogniser {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface RecogniserClass {
  new (): Recogniser;
  available?: (options: SpeechOptions) => Promise<SpeechAvailability>;
  install?: (options: SpeechOptions) => Promise<boolean>;
}

/** Our phrase lists are English, so transcribe in English. */
const LANG = typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? navigator.language : 'en-US';
const OPTIONS: SpeechOptions = { langs: [LANG], processLocally: true };

/** The recogniser, but only if it can promise to stay on the device. */
function recogniser(): RecogniserClass | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecogniserClass; webkitSpeechRecognition?: RecogniserClass };
  const Class = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Class?.available && Class.install ? Class : undefined;
}

export async function speechAvailability(): Promise<SpeechAvailability> {
  try {
    return (await recogniser()?.available?.(OPTIONS)) ?? 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Download the on-device language pack. Call from a user gesture. */
export async function installSpeech(): Promise<boolean> {
  try {
    return (await recogniser()?.install?.(OPTIONS)) ?? false;
  } catch {
    return false;
  }
}

export interface Transcription {
  /** Resolves with the full transcript once stopped. */
  done: Promise<string>;
  stop: () => void;
}

/**
 * Transcribe until `stop()` is called, reporting the running transcript to
 * `onText`. Only call once `speechAvailability()` is `'available'`.
 */
export function transcribe(onText: (text: string) => void): Transcription | undefined {
  const Class = recogniser();
  if (!Class) return undefined;

  const rec = new Class();
  rec.lang = LANG;
  rec.continuous = true;
  rec.interimResults = true;
  rec.processLocally = true;

  let finals = '';
  let interim = '';
  let stopped = false;
  let resolve!: (text: string) => void;
  const done = new Promise<string>((r) => {
    resolve = r;
  });
  // Include words not yet finalised, so nothing said at the end is lost.
  const finish = () => resolve(`${finals}${interim}`.trim());

  rec.onresult = (event) => {
    interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finals += `${result[0].transcript} `;
      else interim += result[0].transcript;
    }
    onText(`${finals}${interim}`.trim());
  };
  // Silence is fine; anything else (permission, missing language pack) ends it.
  rec.onerror = (event) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') stopped = true;
  };
  // Recognition can end by itself after a pause. Keep listening until stopped.
  rec.onend = () => {
    if (stopped) return finish();
    try {
      rec.start();
    } catch {
      finish();
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    rec.stop();
    // Give the last words a moment to finalise, but never hang the check-in.
    window.setTimeout(finish, 1500);
  };

  rec.start();
  return { done, stop };
}
