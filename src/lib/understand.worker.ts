/// <reference lib="webworker" />
import { env, pipeline } from '@huggingface/transformers';
import ortMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';

import type { UnderstandRequest, UnderstandResponse } from './understand';

/**
 * Runs speech-to-text and sentiment models off the main thread, on the
 * device. Models are downloaded once from Hugging Face and cached by the
 * browser; the audio and transcript never leave this worker except as the
 * result posted back to the page.
 */

// Serve the ONNX runtime from our own origin rather than a CDN.
env.allowLocalModels = false;
env.useWasmCache = false;
const onnx = env.backends.onnx;
if (onnx.wasm) onnx.wasm.wasmPaths = { mjs: ortMjs, wasm: ortWasm };

const ASR = 'Xenova/whisper-tiny.en';
const SENTIMENT = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

type Transcriber = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;
type Classifier = (text: string) => Promise<{ label: string; score: number }[]>;

let models: Promise<[Transcriber, Classifier]> | undefined;

function post(message: UnderstandResponse) {
  self.postMessage(message);
}

function load(): Promise<[Transcriber, Classifier]> {
  // Report overall download progress across every model file.
  const files = new Map<string, { loaded: number; total: number }>();
  const progress_callback = (info: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (info.status !== 'progress' || !info.file) return;
    files.set(info.file, { loaded: info.loaded ?? 0, total: info.total ?? 0 });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    if (total) post({ type: 'progress', progress: loaded / total });
  };

  models ??= Promise.all([
    pipeline('automatic-speech-recognition', ASR, { dtype: 'q8', device: 'wasm', progress_callback }) as unknown as Promise<Transcriber>,
    pipeline('text-classification', SENTIMENT, { dtype: 'q8', device: 'wasm', progress_callback }) as unknown as Promise<Classifier>,
  ]);
  models.catch(() => {
    models = undefined;
  });
  return models;
}

self.onmessage = async (event: MessageEvent<UnderstandRequest>) => {
  const request = event.data;
  try {
    const [transcribe, classify] = await load();
    if (request.type === 'load') return post({ type: 'ready' });

    const output = await transcribe(request.audio);
    const text = (Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text).trim();
    if (!text) return post({ type: 'result', id: request.id, text, positivity: undefined });

    const [top] = await classify(text);
    const positivity = top.label === 'POSITIVE' ? top.score : 1 - top.score;
    post({ type: 'result', id: request.id, text, positivity });
  } catch (error) {
    post({ type: 'error', id: request.type === 'read' ? request.id : undefined, message: error instanceof Error ? error.message : String(error) });
  }
};
