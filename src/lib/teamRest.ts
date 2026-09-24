export type CoverageStatus = 'waiting' | 'covered' | 'paused';
export type PulseAnswer = 'yes' | 'partly' | 'no';

export interface RestAgreement {
  protectedRest: boolean;
  acceptedCoverage: boolean;
  pauseWhenFull: boolean;
  note: string;
  revision: number;
  adoptedAt?: number;
}

export interface CoverageItem {
  id: string;
  restingPerson: string;
  work: string;
  coveringPerson?: string;
  date: string;
  note: string;
  status: CoverageStatus;
}

export interface TeamPulse {
  answer: PulseAnswer;
  recordedAt: number;
}

export interface OrganizationRestState {
  version: 2;
  agreement: RestAgreement;
  coverage: CoverageItem[];
  pulse?: TeamPulse;
}

export const DEFAULT_REST_AGREEMENT: RestAgreement = {
  protectedRest: true,
  acceptedCoverage: true,
  pauseWhenFull: true,
  note: '',
  revision: 0,
};

export const DEFAULT_ORGANIZATION_REST_STATE: OrganizationRestState = {
  version: 2,
  agreement: DEFAULT_REST_AGREEMENT,
  coverage: [],
};

export function agreementSummary(agreement: RestAgreement) {
  const promises = [
    agreement.protectedRest && 'Rest time is protected',
    agreement.acceptedCoverage && 'Coverage only counts when someone accepts it',
    agreement.pauseWhenFull && 'If nobody has capacity, nonessential work waits',
  ].filter(Boolean);

  return promises.join(' · ');
}

export function createDemoOrganizationRestState(): OrganizationRestState {
  const today = new Date().toISOString().slice(0, 10);

  return {
    version: 2,
    agreement: {
      protectedRest: true,
      acceptedCoverage: true,
      pauseWhenFull: true,
      note: 'We protect rest without making someone else silently carry too much.',
      revision: 1,
      adoptedAt: Date.now(),
    },
    coverage: [
      {
        id: crypto.randomUUID(),
        restingPerson: 'Cedar',
        work: 'Community contact',
        coveringPerson: 'Birch',
        date: today,
        note: 'Urgent replies only. Everything else can wait.',
        status: 'covered',
      },
      {
        id: crypto.randomUUID(),
        restingPerson: 'Cedar',
        work: 'Planning meeting',
        date: today,
        note: 'No one has capacity, so the meeting moves.',
        status: 'paused',
      },
    ],
    pulse: {
      answer: 'partly',
      recordedAt: Date.now(),
    },
  };
}
