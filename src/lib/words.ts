/**
 * What was said, not just how: match a voice check-in's transcript against
 * short lists of phrases. Deliberately simple and transparent; the matched
 * words are shown back to the user.
 */

/**
 * Language that may mean someone is thinking about suicide or self-harm.
 * Never negated: "I don't want to kill myself" still gets a gentle check.
 */
const CRISIS = [
  'kill myself', 'killing myself', 'end my life', 'ending my life', 'end it all',
  'take my own life', 'taking my own life', 'suicide', 'suicidal',
  'want to die', 'wanna die', 'wish i was dead', 'wish i were dead', 'better off dead',
  'better off without me', "don't want to be alive", "don't want to live",
  "don't want to be here anymore", 'no reason to live',
  'hurt myself', 'hurting myself', 'harm myself', 'self harm', 'cut myself', 'cutting myself',
];

const NEGATIVE = [
  'quit', 'quitting', 'give up', 'giving up', 'exhausted', 'burned out', 'burnt out', 'burnout',
  'tired', 'drained', 'depleted', "i'm done", 'so done', "can't do this", "can't anymore",
  "can't keep going", 'hopeless', 'overwhelmed', 'numb', 'empty', 'broken', 'falling apart',
  "can't sleep", 'stressed', 'anxious', 'sad', 'depressed', 'worthless', 'alone', 'miserable',
  // Hopelessness and isolation.
  "don't see the point", 'no point', "what's the point", 'pointless', 'lonely', 'isolated',
  "haven't seen my family", "haven't seen my friends", 'miss my family', 'nobody cares', 'no one cares',
];

const POSITIVE = [
  'rested', 'energized', 'energised', 'excited', 'happy', 'great', 'good', 'hopeful', 'grateful',
  'calm', 'strong', 'ready', 'inspired', 'joy', 'fun', 'laughed', 'slept well', 'motivated',
  'proud', 'alive', 'refreshed', 'peaceful',
];

const NEGATORS = new Set(['not', 'no', 'never', "don't", "didn't", "isn't", "wasn't", "aren't", "can't", "won't", 'hardly']);

export interface WordReading {
  /** Crisis phrases heard. When non-empty, offer support before anything else. */
  crisis: string[];
  negative: string[];
  positive: string[];
  /** 0 (all negative) to 1 (all positive), or undefined if no mood words were heard. */
  score?: number;
}

function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** Every start index of ` phrase ` in the padded, normalised text. */
function find(text: string, phrase: string): number[] {
  const needle = ` ${phrase} `;
  const found: number[] = [];
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) found.push(i);
  return found;
}

/** Whether one of the three words before `index` flips its meaning. */
function negated(text: string, index: number): boolean {
  return text.slice(0, index).trim().split(' ').slice(-3).some((w) => NEGATORS.has(w));
}

export function readWords(transcript: string): WordReading {
  const text = normalise(transcript);
  const crisis = CRISIS.filter((p) => find(text, p).length > 0);
  const negative: string[] = [];
  const positive: string[] = [];

  // "Not tired" counts as positive, "not good" as negative.
  for (const [phrases, same, opposite] of [
    [NEGATIVE, negative, positive],
    [POSITIVE, positive, negative],
  ] as const) {
    for (const phrase of phrases) {
      for (const i of find(text, phrase)) {
        if (negated(text, i)) opposite.push(`not ${phrase}`);
        else same.push(phrase);
      }
    }
  }

  const hits = negative.length + positive.length;
  // The +1 keeps a single word from swinging the score all the way.
  const score = hits ? 0.5 + (0.5 * (positive.length - negative.length)) / (hits + 1) : undefined;
  return { crisis, negative, positive, score };
}
