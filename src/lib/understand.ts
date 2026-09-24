/**
 * Understanding what was said on a voice check-in, entirely on the device:
 * Whisper turns speech into text and a sentiment model reads how positive it
 * is, both in a Web Worker (see `understand.worker.ts`). The models are about
 * 110 MB, downloaded once when the user opts in and cached by the browser.
 */

export type UnderstandRequest = { type: 'load' } | { type: 'read'; id: number; audio: Float32Array };

export type UnderstandResponse =
  | { type: 'progress'; progress: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; text: string; positivity?: number }
  | { type: 'error'; id?: number; message: string };

export interface Understanding {
  text: string;
  /** 0 (negative) to 1 (positive), or undefined if nothing was said. */
  positivity?: number;
}

/** Remembers that the models were downloaded, so we can load them from cache without asking again. */
const OPTED_IN_KEY = 'restivism:voice-words';
/** Whisper expects 16 kHz mono. */
const SAMPLE_RATE = 16_000;

export function understandingSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof OfflineAudioContext !== 'undefined';
}

export function optedIn(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

let worker: Worker | undefined;
let nextId = 0;

function getWorker(): Worker {
  worker ??= new Worker(new URL('./understand.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

/** Download (or load from cache) the models, reporting progress from 0 to 1. */
export function prepareUnderstanding(onProgress?: (progress: number) => void): Promise<void> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<UnderstandResponse>) => {
      const message = event.data;
      if (message.type === 'progress') onProgress?.(message.progress);
      if (message.type === 'ready' || (message.type === 'error' && message.id === undefined)) {
        w.removeEventListener('message', onMessage);
        if (message.type === 'error') return reject(new Error(message.message));
        try {
          localStorage.setItem(OPTED_IN_KEY, '1');
        } catch {
          // Only means we will ask again next time.
        }
        resolve();
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'load' } satisfies UnderstandRequest);
  });
}

/** Decode a recording at 16 kHz; decoding resamples to the context's rate. The mic is mono. */
async function toSamples(recording: Blob): Promise<Float32Array> {
  const decoded = await new OfflineAudioContext(1, 1, SAMPLE_RATE).decodeAudioData(await recording.arrayBuffer());
  return decoded.getChannelData(0);
}

/** Transcribe a recording and read its sentiment. Call after `prepareUnderstanding`. */
export async function understand(recording: Blob): Promise<Understanding> {
  const audio = await toSamples(recording);
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<UnderstandResponse>) => {
      const message = event.data;
      if ((message.type !== 'result' && message.type !== 'error') || message.id !== id) return;
      w.removeEventListener('message', onMessage);
      if (message.type === 'error') reject(new Error(message.message));
      else resolve({ text: message.text, positivity: message.positivity });
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'read', id, audio } satisfies UnderstandRequest, [audio.buffer]);
  });
}
