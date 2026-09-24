// Privacy guideline: team-rest records stay local by default and are never published to Nostr.
export type AgreementFrame = 'movement' | 'secular' | 'faith';
export type CoverageStatus = 'proposed' | 'accepted' | 'needs-change' | 'paused';
export type PulseAnswer = 'yes' | 'partly' | 'no' | 'prefer-not';

export interface TeamAgreement {
  frame: AgreementFrame;
  text: string;
  revision: number;
  adoptedAt?: number;
}

export interface HandoverNote {
  currentStatus: string;
  nextAction: string;
  limit: string;
  reference: string;
}

export interface CoverageItem {
  id: string;
  responsibility: string;
  restingAlias: string;
  coveringAlias?: string;
  startsAt: number;
  endsAt: number;
  status: CoverageStatus;
  handover: HandoverNote;
}

export interface TeamPulse {
  answer: PulseAnswer;
  recordedAt: number;
}

export interface TeamRestState {
  version: 1;
  aliases: string[];
  agreement: TeamAgreement;
  coverage: CoverageItem[];
  pulse?: TeamPulse;
}

export const AGREEMENT_STARTER =
  'We protect planned rest. Coverage only counts when the receiving person accepts it. ' +
  'If nobody has capacity, we pause, reduce, or postpone nonessential work instead of pulling someone back from rest.';

export const DEFAULT_TEAM_REST_STATE: TeamRestState = {
  version: 1,
  aliases: [],
  agreement: {
    frame: 'movement',
    text: AGREEMENT_STARTER,
    revision: 0,
  },
  coverage: [],
};

export function overlaps(
  a: Pick<CoverageItem, 'startsAt' | 'endsAt'>,
  b: Pick<CoverageItem, 'startsAt' | 'endsAt'>,
) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function hasAcceptedCoverageConflict(items: CoverageItem[], candidate: CoverageItem): boolean {
  if (!candidate.coveringAlias) return false;

  return items.some((item) => (
    item.id !== candidate.id &&
    item.status === 'accepted' &&
    item.coveringAlias === candidate.coveringAlias &&
    overlaps(item, candidate)
  ));
}

export function createDemoTeamRestState(now = Date.now()): TeamRestState {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  return {
    version: 1,
    aliases: ['Cedar', 'Birch', 'Ash'],
    agreement: {
      frame: 'movement',
      text: AGREEMENT_STARTER,
      revision: 1,
      adoptedAt: now - day,
    },
    coverage: [
      {
        id: crypto.randomUUID(),
        responsibility: 'Community contact',
        restingAlias: 'Cedar',
        coveringAlias: 'Birch',
        startsAt: now + hour,
        endsAt: now + 5 * hour,
        status: 'accepted',
        handover: {
          currentStatus: 'Inbox is clear through this morning.',
          nextAction: 'Reply only to time-sensitive community questions.',
          limit: 'Anything else waits until Cedar returns.',
          reference: 'Use the team contact notes already on your device.',
        },
      },
      {
        id: crypto.randomUUID(),
        responsibility: 'Public updates',
        restingAlias: 'Cedar',
        coveringAlias: 'Ash',
        startsAt: now + hour,
        endsAt: now + 5 * hour,
        status: 'accepted',
        handover: {
          currentStatus: 'No scheduled announcement is due.',
          nextAction: 'Post only if an already-approved update becomes necessary.',
          limit: 'Do not draft new campaign language.',
          reference: 'Use the approved-message folder.',
        },
      },
      {
        id: crypto.randomUUID(),
        responsibility: 'Planning meeting',
        restingAlias: 'Cedar',
        startsAt: now + 2 * hour,
        endsAt: now + 3 * hour,
        status: 'paused',
        handover: {
          currentStatus: '',
          nextAction: '',
          limit: 'Postponed because nobody has capacity.',
          reference: '',
        },
      },
    ],
    pulse: {
      answer: 'partly',
      recordedAt: now - day,
    },
  };
}
