import { BedDouble, HeartHandshake, type LucideIcon, Puzzle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Ways to recharge
// ---------------------------------------------------------------------------

export type RechargeId = 'play' | 'sleep' | 'social';

export interface Recharge {
  id: RechargeId;
  name: string;
  icon: LucideIcon;
  durations: number[];
  /** Shown before the timer starts. */
  tip: string;
  /** Prompts rotated while the timer runs. */
  prompts: string[];
  /** Tailwind gradient classes for cards and the session backdrop. */
  gradient: string;
}

export const RECHARGES: Recharge[] = [
  {
    id: 'play',
    name: 'Play time',
    icon: Puzzle,
    durations: [15, 30, 60],
    tip: 'Do something purely because it is fun. A game, a song, a sketch, a dance in the kitchen. It does not have to be useful.',
    prompts: [
      'This does not need to be productive.',
      'If it stops being fun, switch to something else.',
      'Nobody is grading this.',
      'Let yourself get a little lost in it.',
    ],
    gradient: 'from-amber-400/30 via-orange-400/20 to-rose-400/25',
  },
  {
    id: 'sleep',
    name: 'Sleep time',
    icon: BedDouble,
    durations: [20, 30, 90],
    tip: 'Lie down, turn on Do Not Disturb, and keep this screen open. We will wake you with a soft chime.',
    prompts: [
      'Let your eyes close.',
      'Nothing is required of you right now.',
      'Let whatever you are lying on hold your full weight.',
      'If you do not fall asleep, that is still rest.',
    ],
    gradient: 'from-indigo-500/30 via-violet-500/20 to-sky-500/20',
  },
  {
    id: 'social',
    name: 'Social time',
    icon: HeartHandshake,
    durations: [15, 30, 60],
    tip: 'Call, visit, or sit with someone you like. Talk about anything except the work.',
    prompts: [
      'Put the phone away. Be where you are.',
      'Ask them how they are really doing.',
      'Laugh at something.',
      'The work can wait until you are done.',
    ],
    gradient: 'from-emerald-400/25 via-teal-400/15 to-sky-400/25',
  },
];

export function getRecharge(id: string | undefined): Recharge | undefined {
  return RECHARGES.find((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface RestSession {
  id: string;
  practice: RechargeId;
  /** Unix ms when the session ended. */
  endedAt: number;
  minutes: number;
  /** Battery level going into the rest, from a recent check-in. */
  energyBefore?: number;
  /** Battery level reported right after the rest. */
  energyAfter?: number;
}

export interface EnergyCheckin {
  at: number;
  /** 1 (empty) to 5 (full). */
  level: number;
  /** Set when this is the check-in right after a rest. */
  sessionId?: string;
}

export interface RestSettings {
  /** Play Taps when you check in on an empty battery. */
  music: boolean;
}

export interface RestState {
  version: 1;
  sessions: RestSession[];
  checkins: EnergyCheckin[];
  /** Day key → completed care quest ids. */
  quests: Record<string, string[]>;
  settings: RestSettings;
}

export const DEFAULT_REST_STATE: RestState = {
  version: 1,
  sessions: [],
  checkins: [],
  quests: {},
  settings: {
    music: true,
  },
};

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Energy
// ---------------------------------------------------------------------------

export const ENERGY_LEVELS = [
  { level: 1, label: 'Running on fumes', short: 'Empty' },
  { level: 2, label: 'Depleted', short: 'Low' },
  { level: 3, label: 'Getting by', short: 'Okay' },
  { level: 4, label: 'Steady', short: 'Good' },
  { level: 5, label: 'Fully charged', short: 'Full' },
] as const;

export const LEVEL_COLOR: Record<number, string> = {
  1: 'bg-rose-500',
  2: 'bg-orange-500',
  3: 'bg-amber-400',
  4: 'bg-lime-500',
  5: 'bg-emerald-500',
};

/** `LEVEL_COLOR` for SVG shapes. */
export const LEVEL_FILL: Record<number, string> = {
  1: 'fill-rose-500',
  2: 'fill-orange-500',
  3: 'fill-amber-400',
  4: 'fill-lime-500',
  5: 'fill-emerald-500',
};

export const LEVEL_TEXT: Record<number, string> = {
  1: 'text-rose-600 dark:text-rose-400',
  2: 'text-orange-600 dark:text-orange-400',
  3: 'text-amber-600 dark:text-amber-300',
  4: 'text-lime-700 dark:text-lime-400',
  5: 'text-emerald-700 dark:text-emerald-400',
};

/** The latest check-in, if it happened within the last `hours`. */
export function recentCheckin(checkins: EnergyCheckin[], now = Date.now(), hours = 8): EnergyCheckin | undefined {
  const latest = checkins[checkins.length - 1];
  if (!latest) return undefined;
  return now - latest.at <= hours * 3_600_000 ? latest : undefined;
}

// ---------------------------------------------------------------------------
// Recharge plans: what to do, given your battery
// ---------------------------------------------------------------------------

export interface RechargePick {
  recharge: RechargeId;
  minutes: number;
  why: string;
}

export interface CareQuest {
  id: string;
  text: string;
}

export interface RechargePlan {
  headline: string;
  body: string;
  /** The recharge to do first. */
  recharge: RechargePick;
  /** The other two ways, if the first one is not possible right now. */
  alternatives: RechargePick[];
  /** Small acts of care to finish the plan. */
  quests: CareQuest[];
}

export const RECHARGE_PLANS: Record<number, RechargePlan> = {
  1: {
    headline: 'Stop. You are running on fumes.',
    body: 'Nothing you do on an empty battery is your best work. Sleep first. Everything else can wait.',
    recharge: { recharge: 'sleep', minutes: 90, why: 'Only sleep refills an empty battery.' },
    alternatives: [
      { recharge: 'social', minutes: 15, why: 'Tell someone you are empty and let them look after you.' },
      { recharge: 'play', minutes: 15, why: 'Something easy and silly, if you truly cannot lie down.' },
    ],
    quests: [
      { id: 'cancel', text: 'Cancel or postpone one thing today' },
      { id: 'water', text: 'Drink a full glass of water, slowly' },
      { id: 'early-bed', text: 'Go to bed early tonight' },
    ],
  },
  2: {
    headline: 'You are depleted. Recharge before it gets worse.',
    body: 'Low battery is a signal, not a weakness. The work will still be there in half an hour, and you will be better at it.',
    recharge: { recharge: 'sleep', minutes: 20, why: 'A short nap restores more than coffee.' },
    alternatives: [
      { recharge: 'social', minutes: 30, why: 'Spend time with someone who asks nothing of you.' },
      { recharge: 'play', minutes: 30, why: 'Do something fun that has nothing to do with the cause.' },
    ],
    quests: [
      { id: 'unanswered', text: 'Leave one message unanswered until tomorrow' },
      { id: 'meal', text: 'Eat one meal without a screen' },
      { id: 'help', text: 'Ask someone for help with one thing' },
    ],
  },
  3: {
    headline: 'Getting by is not the same as okay.',
    body: 'This is the moment most people push through. Top up now and you will not end up empty tonight.',
    recharge: { recharge: 'play', minutes: 30, why: 'Fun lifts a flat battery faster than rest alone.' },
    alternatives: [
      { recharge: 'social', minutes: 30, why: 'Good company is a recharge, not a distraction.' },
      { recharge: 'sleep', minutes: 20, why: 'If you are more tired than bored, lie down.' },
    ],
    quests: [
      { id: 'outside', text: 'Step outside for five minutes' },
      { id: 'stretch', text: 'Stretch for two minutes' },
      { id: 'logoff', text: 'Log off at a time you choose now' },
    ],
  },
  4: {
    headline: 'Steady. Recharge now so you stay here.',
    body: 'Rest is not only for recovery. Topping up while you are doing well keeps you from crashing later.',
    recharge: { recharge: 'social', minutes: 30, why: 'See someone you love while you have energy to enjoy it.' },
    alternatives: [
      { recharge: 'play', minutes: 30, why: 'Spend some of the charge on something fun.' },
      { recharge: 'sleep', minutes: 20, why: 'A short nap keeps the afternoon slump away.' },
    ],
    quests: [
      { id: 'friend', text: 'Text a friend something that is not about the work' },
      { id: 'sunlight', text: 'Get some sunlight on your face' },
      { id: 'no', text: 'Say no to one thing' },
    ],
  },
  5: {
    headline: 'Fully charged. Protect it.',
    body: 'Notice what got you here and do more of it. Recharging while full is how you stay full.',
    recharge: { recharge: 'play', minutes: 60, why: 'Enjoy the energy on something that is not work.' },
    alternatives: [
      { recharge: 'social', minutes: 60, why: 'Share the good day with someone.' },
      { recharge: 'sleep', minutes: 90, why: 'Bank a full night. Future you will thank you.' },
    ],
    quests: [
      { id: 'notice', text: 'Name one thing that got you here' },
      { id: 'fun', text: 'Do one thing purely because it is fun' },
      { id: 'proud-bed', text: 'Go to bed at a time you would be proud of' },
    ],
  },
};
