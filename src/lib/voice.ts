import { getContext } from './chime';
import type { WordReading } from './words';

/**
 * Voice check-in: listen to some speech and turn how it sounds (and, where
 * the browser can transcribe on the device, what was said) into a battery
 * reading. Everything runs on the device with the Web Audio API. Audio is
 * never stored or sent anywhere.
 *
 * The measures are acoustic proxies for vocal energy, not a diagnosis:
 * - Loudness: average level of the voiced frames, in dBFS.
 * - Tone: how much the pitch moves, in semitones. Flat, monotone speech is a
 *   well-known marker of fatigue; lively speech moves around.
 * - Emphasis: how often the voice punches above its own baseline, per second.
 * - Presence: how much of the recording was spent speaking.
 *
 * When mood words were heard (see `words.ts`), they count for half, except
 * that negative words set a ceiling: a loud, emphatic "I want to quit" is
 * distress, not charge, and saying so outranks how it sounded.
 */

/** One analysis frame. `pitch` is undefined when the frame is not voiced. */
export interface VoiceFrame {
  db: number;
  pitch?: number;
}

export interface VoiceReading {
  /** Seconds of voiced speech that were analysed. */
  voicedSeconds: number;
  loudnessDb: number;
  pitchSpreadSemitones: number;
  emphasisPerSecond: number;
  presence: number;
  /** Each measure mapped to 0–1. */
  scores: { loudness: number; tone: number; emphasis: number; presence: number };
  /** What was said, when the browser could transcribe it. */
  words?: WordReading;
  /** 0–100. */
  energy: number;
  /** Suggested battery level, 1–5. */
  level: number;
}

export const FRAME_SECONDS = 0.05;
export const RECORD_SECONDS = 30;
/** Less voiced speech than this and we cannot say anything useful. */
export const MIN_VOICED_SECONDS = 1.5;

const SILENCE_DB = -50;
/** A frame this far above the speaker's median level counts as stressed. */
const EMPHASIS_DB = 6;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const scale = (x: number, lo: number, hi: number) => clamp01((x - lo) / (hi - lo));

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

/** Root-mean-square level of a buffer in dBFS. */
export function levelDb(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/**
 * Fundamental frequency by normalised autocorrelation, limited to the range
 * of the human speaking voice. Returns undefined for unvoiced frames.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): number | undefined {
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.min(Math.floor(sampleRate / 70), samples.length >> 1);
  const n = samples.length - maxLag;

  let energy = 0;
  for (let i = 0; i < n; i++) energy += samples[i] * samples[i];
  if (energy === 0) return undefined;

  let bestLag = 0;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let lagEnergy = 0;
    for (let i = 0; i < n; i++) {
      corr += samples[i] * samples[i + lag];
      lagEnergy += samples[i + lag] * samples[i + lag];
    }
    const r = corr / Math.sqrt(energy * lagEnergy || 1);
    if (r > best) {
      best = r;
      bestLag = lag;
    }
  }
  return best > 0.6 ? sampleRate / bestLag : undefined;
}

export function analyseFrame(samples: Float32Array, sampleRate: number): VoiceFrame {
  const db = levelDb(samples);
  return { db, pitch: db > SILENCE_DB ? detectPitch(samples, sampleRate) : undefined };
}

/** Summarise a recording's frames, or undefined if too little was spoken. */
export function summarise(frames: VoiceFrame[], words?: WordReading): VoiceReading | undefined {
  const voiced = frames.filter((f): f is Required<VoiceFrame> => f.pitch !== undefined);
  const voicedSeconds = voiced.length * FRAME_SECONDS;
  if (voicedSeconds < MIN_VOICED_SECONDS) return undefined;

  const dbs = voiced.map((f) => f.db);
  const loudnessDb = dbs.reduce((a, b) => a + b, 0) / dbs.length;

  // Semitones relative to the speaker's own median pitch, so low and high
  // voices are measured on the same scale.
  const centre = median(voiced.map((f) => f.pitch));
  const pitchSpreadSemitones = stdDev(voiced.map((f) => 12 * Math.log2(f.pitch / centre)));

  // Count each rise above the stress threshold once.
  const threshold = median(dbs) + EMPHASIS_DB;
  let peaks = 0;
  let above = false;
  for (const f of frames) {
    const now = f.pitch !== undefined && f.db >= threshold;
    if (now && !above) peaks++;
    above = now;
  }
  const emphasisPerSecond = peaks / voicedSeconds;
  const presence = voiced.length / frames.length;

  const scores = {
    loudness: scale(loudnessDb, -45, -18),
    tone: scale(pitchSpreadSemitones, 1, 4.5),
    emphasis: scale(emphasisPerSecond, 0.2, 1.5),
    presence: scale(presence, 0.2, 0.7),
  };
  const sound = 0.3 * scores.loudness + 0.3 * scores.tone + 0.25 * scores.emphasis + 0.15 * scores.presence;
  const said = words?.score;
  const energy = Math.round(100 * (said === undefined ? sound : said < 0.5 ? Math.min(sound, said) : (sound + said) / 2));
  const level = Math.min(5, 1 + Math.floor(energy / 20));

  return { voicedSeconds, loudnessDb, pitchSpreadSemitones, emphasisPerSecond, presence, scores, words, energy, level };
}

export interface Recording {
  /** Resolves with the frames once recording stops. */
  done: Promise<VoiceFrame[]>;
  /** Stop early. */
  stop: () => void;
}

/**
 * Record from the microphone for `seconds`, calling `onFrame` as each frame
 * is analysed. Must be started from a user gesture. Rejects if the
 * microphone is unavailable or permission is denied.
 */
export async function recordVoice(onFrame: (frame: VoiceFrame) => void, seconds = RECORD_SECONDS): Promise<Recording> {
  const ctx = getContext();
  if (!ctx || !navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');

  // Keep the raw level: automatic gain would flatten the loudness we measure.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: true },
  });
  if (ctx.state === 'suspended') await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);

  const frames: VoiceFrame[] = [];
  let resolve!: (frames: VoiceFrame[]) => void;
  const done = new Promise<VoiceFrame[]>((r) => {
    resolve = r;
  });

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    resolve(frames);
  };

  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buffer);
    const frame = analyseFrame(buffer, ctx.sampleRate);
    frames.push(frame);
    onFrame(frame);
    if (frames.length * FRAME_SECONDS >= seconds) stop();
  }, FRAME_SECONDS * 1000);

  return { done, stop };
}
