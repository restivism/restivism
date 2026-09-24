/**
 * Safety net for voice check-ins: the sentiment model reads mood, but talk of
 * suicide or self-harm must never become just a low battery reading. Plain
 * phrase matching keeps this predictable and easy to review.
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

function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** Crisis phrases heard in a transcript. When any are heard, offer support before anything else. */
export function crisisPhrases(transcript: string): string[] {
  const text = normalise(transcript);
  return CRISIS.filter((p) => text.includes(` ${p} `));
}
