import {
  Armchair,
  BatteryCharging,
  BatteryMedium,
  Eye,
  Zap,
  BedDouble,
  Cloud,
  Flame,
  Footprints,
  Heart,
  HeartHandshake,
  Leaf,
  type LucideIcon,
  Moon,
  MoonStar,
  PhoneOff,
  ScanFace,
  Sparkles,
  Sprout,
  Sun,
  Trees,
  Wind,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Practices
// ---------------------------------------------------------------------------

export type PracticeId = 'breathe' | 'nap' | 'unplug' | 'wander' | 'nothing' | 'bodyscan' | 'other';

export interface Practice {
  id: PracticeId;
  name: string;
  /** Verb phrase used in shares: "I just took 20 minutes to ___" */
  verb: string;
  tagline: string;
  icon: LucideIcon;
  durations: number[];
  defaultDuration: number;
  /** Prompts rotated during the session. */
  prompts: string[];
  /** Tailwind gradient classes for the card and session backdrop. */
  gradient: string;
  /** Whether the practice can be started as a guided session. */
  guided: boolean;
}

export const PRACTICES: Practice[] = [
  {
    id: 'breathe',
    name: 'Breathe',
    verb: 'just breathe',
    tagline: 'Slow your nervous system with 4-4-6 breathing.',
    icon: Wind,
    durations: [3, 5, 10],
    defaultDuration: 5,
    prompts: [],
    gradient: 'from-sky-400/25 via-indigo-400/15 to-violet-500/25',
    guided: true,
  },
  {
    id: 'nap',
    name: 'Nap',
    verb: 'nap',
    tagline: 'Lie down. We will wake you gently.',
    icon: BedDouble,
    durations: [10, 20, 30],
    defaultDuration: 20,
    prompts: [
      'Let your eyes close.',
      'Nothing is required of you right now.',
      'Let whatever you are lying on hold your full weight.',
      'Your body knows how to do this.',
      'Rest is not a reward. It is a right.',
      'If you do not fall asleep, that is still rest.',
    ],
    gradient: 'from-indigo-500/30 via-violet-500/20 to-fuchsia-500/20',
    guided: true,
  },
  {
    id: 'unplug',
    name: 'Unplug',
    verb: 'unplug',
    tagline: 'Phone face down. The feed will survive.',
    icon: PhoneOff,
    durations: [15, 30, 60],
    defaultDuration: 30,
    prompts: [
      'Put your phone face down. We are keeping time.',
      'The news will still be there. You do not have to hold it right now.',
      'Look at something far away.',
      'Notice three sounds around you.',
      'You are allowed to be unreachable.',
      'Every notification can wait.',
    ],
    gradient: 'from-emerald-400/20 via-teal-400/15 to-sky-500/20',
    guided: true,
  },
  {
    id: 'wander',
    name: 'Wander',
    verb: 'go for an aimless walk',
    tagline: 'A walk with no destination and no podcast.',
    icon: Footprints,
    durations: [10, 20, 30],
    defaultDuration: 20,
    prompts: [
      'Walk slower than you need to.',
      'Find five things that are green.',
      'No destination. No agenda.',
      'Feel each foot meet the ground.',
      'Look up. When did you last look at the sky?',
      'Let your arms swing.',
    ],
    gradient: 'from-lime-400/20 via-emerald-400/15 to-amber-400/20',
    guided: true,
  },
  {
    id: 'nothing',
    name: 'Do Nothing',
    verb: 'do absolutely nothing',
    tagline: 'Radical, unproductive stillness.',
    icon: Armchair,
    durations: [2, 5, 10],
    defaultDuration: 5,
    prompts: [
      'Do nothing. Really.',
      'If a thought about the work shows up, let it drive past like a car outside.',
      'You are not falling behind.',
      'Stillness does not need to be earned.',
      'Let your hands rest in your lap.',
      'There is nowhere else to be.',
    ],
    gradient: 'from-amber-400/25 via-orange-400/15 to-rose-400/20',
    guided: true,
  },
  {
    id: 'bodyscan',
    name: 'Body Scan',
    verb: 'check in with my body',
    tagline: 'Release the tension you have been carrying.',
    icon: ScanFace,
    durations: [5, 10],
    defaultDuration: 5,
    prompts: [
      'Soften your forehead. Unclench your jaw.',
      'Let your tongue drop from the roof of your mouth.',
      'Drop your shoulders away from your ears.',
      'Unclench your hands. Let your fingers uncurl.',
      'Let your belly be soft. No need to hold it in.',
      'Feel the weight of your legs.',
      'Notice your feet. Wiggle your toes.',
      'Take in your whole body at once. Thank it.',
    ],
    gradient: 'from-rose-400/20 via-pink-400/15 to-violet-400/25',
    guided: true,
  },
  {
    id: 'other',
    name: 'Other rest',
    verb: 'rest',
    tagline: 'A bath, a book, a long sleep, a day off.',
    icon: Cloud,
    durations: [15, 30, 60, 120],
    defaultDuration: 30,
    prompts: [],
    gradient: 'from-slate-400/20 via-indigo-300/15 to-slate-400/20',
    guided: false,
  },
];

export const GUIDED_PRACTICES = PRACTICES.filter((p) => p.guided);

export function getPractice(id: string | undefined): Practice | undefined {
  return PRACTICES.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface RestSession {
  id: string;
  practice: PracticeId;
  /** Unix ms when the session ended. */
  endedAt: number;
  minutes: number;
  embers: number;
  /** Logged manually after the fact, rather than timed in-app. */
  logged?: boolean;
  /** Rested while the latest energy check-in was low. */
  lowEnergy?: boolean;
  /** Battery level going into the rest, from a recent check-in. */
  energyBefore?: number;
  /** Battery level reported right after the rest. */
  energyAfter?: number;
  /** Embers awarded for checking back in after the rest. */
  rechargeEmbers?: number;
}

export interface EnergyCheckin {
  at: number;
  /** 1 (empty) to 5 (full). */
  level: number;
  /** Set when this is the check-in right after a rest. */
  sessionId?: string;
}

export interface RestSettings {
  /** Minutes of rest per day to aim for. */
  dailyGoal: number;
  /** Minutes between reminders, 0 = off. */
  reminderMinutes: number;
  chime: boolean;
}

export interface RestState {
  version: 1;
  sessions: RestSession[];
  checkins: EnergyCheckin[];
  /** Day key → completed quest ids. */
  quests: Record<string, string[]>;
  /** Badge id → unlocked at (unix ms). */
  badges: Record<string, number>;
  shares: number;
  settings: RestSettings;
}

export const DEFAULT_REST_STATE: RestState = {
  version: 1,
  sessions: [],
  checkins: [],
  quests: {},
  badges: {},
  shares: 0,
  settings: {
    dailyGoal: 30,
    reminderMinutes: 0,
    chime: true,
  },
};

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function minutesByDay(sessions: RestSession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.endedAt);
    map.set(k, (map.get(k) ?? 0) + s.minutes);
  }
  return map;
}

export function minutesOnDay(sessions: RestSession[], ts: number): number {
  const k = dayKey(ts);
  return sessions.reduce((sum, s) => (dayKey(s.endedAt) === k ? sum + s.minutes : sum), 0);
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

export interface Streak {
  current: number;
  best: number;
  restedToday: boolean;
}

export function computeStreak(sessions: RestSession[], now = Date.now()): Streak {
  const days = new Set(sessions.map((s) => dayKey(s.endedAt)));
  const restedToday = days.has(dayKey(now));

  // A streak stays alive through today if you rested yesterday.
  let current = 0;
  let cursor = restedToday ? now : addDays(now, -1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  const sorted = [...days].sort();
  let run = 0;
  let prev: string | undefined;
  for (const k of sorted) {
    if (prev) {
      const [y, m, d] = prev.split('-').map(Number);
      const next = dayKey(addDays(new Date(y, m - 1, d).getTime(), 1));
      run = next === k ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = k;
  }

  return { current, best: Math.max(best, current), restedToday };
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
// Embers (points)
// ---------------------------------------------------------------------------

export const QUEST_EMBERS = 5;

export interface EmberLine {
  label: string;
  amount: number;
}

export function calculateEmbers(
  state: RestState,
  opts: { minutes: number; logged?: boolean; now?: number },
): { total: number; lines: EmberLine[]; lowEnergy: boolean; energyBefore?: number } {
  const now = opts.now ?? Date.now();
  const lines: EmberLine[] = [];

  const base = Math.min(Math.round(opts.minutes), 120);
  lines.push({ label: `${base} minute${base === 1 ? '' : 's'} of rest`, amount: base });

  if (!opts.logged) {
    lines.push({ label: 'Saw it through', amount: 5 });
  }

  const checkin = recentCheckin(state.checkins, now, 6);
  const lowEnergy = !!checkin && checkin.level <= 2;
  if (lowEnergy) {
    lines.push({ label: 'Listened to your low battery', amount: 10 });
  }

  const streak = computeStreak(state.sessions, now);
  const streakDays = streak.restedToday ? streak.current : streak.current + 1;
  if (streakDays > 1) {
    lines.push({ label: `Day ${streakDays} streak`, amount: Math.min(streakDays, 7) * 2 });
  }

  const before = minutesOnDay(state.sessions, now);
  const goal = state.settings.dailyGoal;
  if (before < goal && before + opts.minutes >= goal) {
    lines.push({ label: 'Daily goal reached', amount: 15 });
  }

  return { total: lines.reduce((s, l) => s + l.amount, 0), lines, lowEnergy, energyBefore: checkin?.level };
}

/** Embers for checking your battery again after a rest: 5, plus 3 per bar gained. */
export function rechargeBonus(before: number | undefined, after: number): number {
  const gained = before ? Math.max(0, after - before) : 0;
  return 5 + gained * 3;
}

export function totalEmbers(state: RestState): number {
  const fromSessions = state.sessions.reduce((s, x) => s + x.embers + (x.rechargeEmbers ?? 0), 0);
  const fromQuests = Object.values(state.quests).reduce((s, q) => s + q.length * QUEST_EMBERS, 0);
  return fromSessions + fromQuests;
}

// ---------------------------------------------------------------------------
// Levels: phases of the moon
// ---------------------------------------------------------------------------

export interface Level {
  index: number;
  name: string;
  min: number;
  /** 0 = new moon, 1 = full moon */
  phase: number;
  blurb: string;
}

export const LEVELS: Omit<Level, 'index'>[] = [
  { name: 'New Moon', min: 0, phase: 0.04, blurb: 'Every rest practice starts in the dark.' },
  { name: 'Waxing Crescent', min: 40, phase: 0.2, blurb: 'A sliver of light. You are learning to pause.' },
  { name: 'First Quarter', min: 120, phase: 0.5, blurb: 'Half lit. Rest is becoming a habit.' },
  { name: 'Waxing Gibbous', min: 250, phase: 0.75, blurb: 'Almost whole. People are noticing you seem lighter.' },
  { name: 'Full Moon', min: 450, phase: 1, blurb: 'Fully lit. You rest without apology.' },
  { name: 'Harvest Moon', min: 750, phase: 1, blurb: 'You are reaping what rest has sown.' },
  { name: 'Blue Moon', min: 1200, phase: 1, blurb: 'Rare air. You protect your rest fiercely.' },
  { name: 'Supermoon', min: 2000, phase: 1, blurb: 'A beacon. You show others it is possible.' },
];

export function levelFor(embers: number): { level: Level; next?: Level; progress: number } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (embers >= LEVELS[i].min) index = i;
  }
  const level = { ...LEVELS[index], index };
  const nextRaw = LEVELS[index + 1];
  const next = nextRaw ? { ...nextRaw, index: index + 1 } : undefined;
  const progress = next ? (embers - level.min) / (next.min - level.min) : 1;
  return { level, next, progress: Math.max(0, Math.min(1, progress)) };
}

// ---------------------------------------------------------------------------
// Daily quests
// ---------------------------------------------------------------------------

export interface Quest {
  id: string;
  text: string;
}

export const QUESTS: Quest[] = [
  { id: 'water', text: 'Drink a full glass of water, slowly' },
  { id: 'outside', text: 'Step outside for five minutes' },
  { id: 'meal', text: 'Eat one meal without a screen' },
  { id: 'no', text: 'Say no to one thing' },
  { id: 'logoff', text: 'Log off at a time you chose in advance' },
  { id: 'friend', text: 'Text a friend something that is not about the work' },
  { id: 'stretch', text: 'Stretch for two minutes' },
  { id: 'sunlight', text: 'Get some sunlight on your face' },
  { id: 'mute', text: 'Mute one group chat for an hour' },
  { id: 'bedtime', text: 'Go to bed at a time you would be proud of' },
  { id: 'fun', text: 'Do one thing purely because it is fun' },
  { id: 'help', text: 'Ask someone for help with something' },
  { id: 'unanswered', text: 'Leave one message unanswered until tomorrow' },
  { id: 'shower', text: 'Take a shower as long as you want' },
  { id: 'album', text: 'Listen to a whole album, doing nothing else' },
  { id: 'delegate', text: 'Hand one task to someone else' },
  { id: 'nature', text: 'Touch a tree, some grass, or the sea' },
  { id: 'laugh', text: 'Watch or read something that makes you laugh' },
];

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Three quests per day, stable for the whole day. */
export function questsForDay(key: string): Quest[] {
  const rand = seededRandom(hashString(key));
  const pool = [...QUESTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface RestStats {
  totalMinutes: number;
  sessionCount: number;
  practiceCounts: Partial<Record<PracticeId, number>>;
  streak: Streak;
  goalDays: number;
  maxDayMinutes: number;
  lowEnergyRests: number;
  questSweepDays: number;
  longestUnplug: number;
  shares: number;
  /** Total battery bars gained across rests with before and after check-ins. */
  barsRecharged: number;
  /** Most bars gained from a single rest. */
  bestRecharge: number;
  /** Distinct days with at least one battery check-in. */
  checkinDays: number;
}

export function barsGained(session: RestSession): number {
  if (!session.energyBefore || !session.energyAfter) return 0;
  return Math.max(0, session.energyAfter - session.energyBefore);
}

export function computeStats(state: RestState, now = Date.now()): RestStats {
  const practiceCounts: Partial<Record<PracticeId, number>> = {};
  let longestUnplug = 0;
  for (const s of state.sessions) {
    practiceCounts[s.practice] = (practiceCounts[s.practice] ?? 0) + 1;
    if (s.practice === 'unplug') longestUnplug = Math.max(longestUnplug, s.minutes);
  }
  const byDay = minutesByDay(state.sessions);
  const dayTotals = [...byDay.values()];
  return {
    totalMinutes: state.sessions.reduce((s, x) => s + x.minutes, 0),
    sessionCount: state.sessions.length,
    practiceCounts,
    streak: computeStreak(state.sessions, now),
    goalDays: dayTotals.filter((m) => m >= state.settings.dailyGoal).length,
    maxDayMinutes: Math.max(0, ...dayTotals),
    lowEnergyRests: state.sessions.filter((s) => s.lowEnergy).length,
    questSweepDays: Object.values(state.quests).filter((q) => q.length >= 3).length,
    longestUnplug,
    shares: state.shares,
    barsRecharged: state.sessions.reduce((sum, x) => sum + barsGained(x), 0),
    bestRecharge: Math.max(0, ...state.sessions.map(barsGained)),
    checkinDays: new Set(state.checkins.map((c) => dayKey(c.at))).size,
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  check: (stats: RestStats) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'first-reading',
    name: 'First Reading',
    description: 'Check your battery for the first time.',
    icon: BatteryMedium,
    check: (s) => s.checkinDays >= 1,
  },
  {
    id: 'first-pause',
    name: 'First Pause',
    description: 'Complete your first rest.',
    icon: Sprout,
    check: (s) => s.sessionCount >= 1,
  },
  {
    id: 'listened',
    name: 'Listened In',
    description: 'Rest when your battery is low.',
    icon: Heart,
    check: (s) => s.lowEnergyRests >= 1,
  },
  {
    id: 'recharged',
    name: 'Recharged',
    description: 'Gain two bars of battery from a single rest.',
    icon: BatteryCharging,
    check: (s) => s.bestRecharge >= 2,
  },
  {
    id: 'kindling',
    name: 'Kindling',
    description: 'Rest three days in a row.',
    icon: Flame,
    check: (s) => s.streak.best >= 3,
  },
  {
    id: 'full-cup',
    name: 'Full Cup',
    description: 'Meet your daily rest goal.',
    icon: Sun,
    check: (s) => s.goalDays >= 1,
  },
  {
    id: 'tended',
    name: 'Tended',
    description: 'Finish all three daily quests in one day.',
    icon: Leaf,
    check: (s) => s.questSweepDays >= 1,
  },
  {
    id: 'nap-radical',
    name: 'Nap Radical',
    description: 'Take three naps.',
    icon: BedDouble,
    check: (s) => (s.practiceCounts.nap ?? 0) >= 3,
  },
  {
    id: 'off-grid',
    name: 'Off the Grid',
    description: 'Unplug for a full hour.',
    icon: PhoneOff,
    check: (s) => s.longestUnplug >= 60,
  },
  {
    id: 'many-ways',
    name: 'Many Ways to Rest',
    description: 'Try five different practices.',
    icon: Trees,
    check: (s) => Object.keys(s.practiceCounts).length >= 5,
  },
  {
    id: 'steady-flame',
    name: 'Steady Flame',
    description: 'Rest seven days in a row.',
    icon: Sparkles,
    check: (s) => s.streak.best >= 7,
  },
  {
    id: 'sabbath',
    name: 'Sabbath Keeper',
    description: 'Rest for two hours in a single day.',
    icon: MoonStar,
    check: (s) => s.maxDayMinutes >= 120,
  },
  {
    id: 'collective-care',
    name: 'Collective Care',
    description: 'Share a rest with the Circle.',
    icon: HeartHandshake,
    check: (s) => s.shares >= 1,
  },
  {
    id: 'know-thyself',
    name: 'Know Thyself',
    description: 'Check your battery on seven different days.',
    icon: Eye,
    check: (s) => s.checkinDays >= 7,
  },
  {
    id: 'power-station',
    name: 'Power Station',
    description: 'Recharge twenty bars in total.',
    icon: Zap,
    check: (s) => s.barsRecharged >= 20,
  },
  {
    id: 'deep-well',
    name: 'Deep Well',
    description: 'Rest for ten hours in total.',
    icon: Moon,
    check: (s) => s.totalMinutes >= 600,
  },
  {
    id: 'hearth-keeper',
    name: 'Hearth Keeper',
    description: 'Rest thirty days in a row.',
    icon: Flame,
    check: (s) => s.streak.best >= 30,
  },
];

/** Add any newly earned badges to the state. */
export function awardBadges(state: RestState, now = Date.now()): { state: RestState; earned: Badge[] } {
  const stats = computeStats(state, now);
  const earned = BADGES.filter((b) => !state.badges[b.id] && b.check(stats));
  if (!earned.length) return { state, earned };
  const badges = { ...state.badges };
  for (const b of earned) badges[b.id] = now;
  return { state: { ...state, badges }, earned };
}

// ---------------------------------------------------------------------------
// Nudges: the app pushing you to rest
// ---------------------------------------------------------------------------

export interface Nudge {
  tone: 'gentle' | 'firm' | 'urgent';
  title: string;
  body: string;
  practice: PracticeId;
  minutes: number;
}

export function getNudge(state: RestState, now = Date.now()): Nudge | undefined {
  const hour = new Date(now).getHours();
  const last = state.sessions[state.sessions.length - 1];
  const sinceLast = last ? (now - last.endedAt) / 60_000 : Infinity;
  const restedRecently = sinceLast < 90;

  if (hour >= 23 || hour < 4) {
    return {
      tone: 'firm',
      title: 'It is late.',
      body: 'Whatever you are working on, the movement needs you tomorrow more than it needs this tonight. Put the phone down and go to sleep.',
      practice: 'unplug',
      minutes: 15,
    };
  }

  if (restedRecently) return undefined;

  const today = minutesOnDay(state.sessions, now);
  if (today === 0 && hour >= 14) {
    return {
      tone: 'firm',
      title: 'You have not rested today.',
      body: 'Not even five minutes. Burnout is built one skipped break at a time. Take one now.',
      practice: 'nothing',
      minutes: 5,
    };
  }

  if (last && sinceLast >= 240 && hour >= 8) {
    return {
      tone: 'gentle',
      title: `It has been ${Math.floor(sinceLast / 60)} hours.`,
      body: 'Time for a breather. Three minutes of slow breathing resets more than you would think.',
      practice: 'breathe',
      minutes: 3,
    };
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Recharge plans: what to do, given your battery
// ---------------------------------------------------------------------------

export interface RechargePick {
  practice: PracticeId;
  minutes: number;
  why: string;
}

export interface RechargePlan {
  level: number;
  headline: string;
  body: string;
  picks: RechargePick[];
}

export const RECHARGE_PLANS: Record<number, RechargePlan> = {
  1: {
    level: 1,
    headline: 'Stop. You are running on fumes.',
    body: 'Nothing you do on an empty battery is your best work. Cancel or postpone one thing, then lie down. This is not optional.',
    picks: [
      { practice: 'nap', minutes: 20, why: 'Sleep is the fastest recharge there is.' },
      { practice: 'nothing', minutes: 10, why: 'If you cannot sleep, just stop.' },
      { practice: 'unplug', minutes: 60, why: 'Step away from every feed for an hour.' },
    ],
  },
  2: {
    level: 2,
    headline: 'You are depleted. Recharge before it gets worse.',
    body: 'Low battery is a signal, not a weakness. The work will still be there in twenty minutes, and you will be better at it.',
    picks: [
      { practice: 'nap', minutes: 20, why: 'A short nap restores more than coffee.' },
      { practice: 'bodyscan', minutes: 10, why: 'Release the tension you are carrying.' },
      { practice: 'unplug', minutes: 30, why: 'Give your nervous system a break from alerts.' },
    ],
  },
  3: {
    level: 3,
    headline: 'Getting by is not the same as okay.',
    body: 'This is the moment most people push through. Top up now and you will not end up empty tonight.',
    picks: [
      { practice: 'wander', minutes: 20, why: 'Movement and daylight lift a flat battery.' },
      { practice: 'nothing', minutes: 5, why: 'Five minutes of stillness resets more than you think.' },
      { practice: 'breathe', minutes: 5, why: 'Slow breathing calms a buzzing mind.' },
    ],
  },
  4: {
    level: 4,
    headline: 'Steady. Rest now so you stay here.',
    body: 'Rest is not only for recovery. Small breaks while you are doing well keep you from crashing later.',
    picks: [
      { practice: 'breathe', minutes: 5, why: 'A quick reset between tasks.' },
      { practice: 'wander', minutes: 10, why: 'A short walk to keep the charge.' },
      { practice: 'bodyscan', minutes: 5, why: 'Catch tension before it builds.' },
    ],
  },
  5: {
    level: 5,
    headline: 'Fully charged. Protect it.',
    body: 'Notice what got you here and do more of it. Resting while full is how you stay full.',
    picks: [
      { practice: 'breathe', minutes: 3, why: 'Savor it. Three slow minutes.' },
      { practice: 'wander', minutes: 20, why: 'Enjoy the energy without spending it on work.' },
      { practice: 'nothing', minutes: 5, why: 'Practice stopping while it is easy.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Permission slips
// ---------------------------------------------------------------------------

export interface Affirmation {
  text: string;
  cite?: string;
}

export const AFFIRMATIONS: Affirmation[] = [
  {
    text: 'Caring for myself is not self-indulgence, it is self-preservation, and that is an act of political warfare.',
    cite: 'Audre Lorde',
  },
  { text: 'Rest is part of the work, not a break from it.' },
  { text: 'Burnout is not a badge of honor. It is a warning light.' },
  { text: 'This is a marathon. Pace yourself like you plan to finish.' },
  { text: 'Your worth is not measured in output.' },
  { text: 'A rested organizer is a dangerous organizer.' },
  { text: 'The world needs you here for the long haul.' },
  { text: 'Saying no to this makes room for your yes.' },
  { text: 'You cannot build a caring world by treating yourself as disposable.' },
  { text: 'The systems you fight want you exhausted. Refuse.' },
  { text: 'You are allowed to put it down for a while.' },
  { text: 'Nobody wins anything faster because you skipped lunch.' },
];

export function affirmationForDay(key: string): Affirmation {
  return AFFIRMATIONS[hashString(key) % AFFIRMATIONS.length];
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export const CIRCLE_TAG = 'restful';

export function shareText(practice: Practice, minutes: number, note?: string): string {
  const lead = `I just took ${minutes} minute${minutes === 1 ? '' : 's'} to ${practice.verb}.`;
  const body = note?.trim() ? `\n\n${note.trim()}` : '';
  return `${lead}${body}\n\nRest is resistance. #${CIRCLE_TAG}`;
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
