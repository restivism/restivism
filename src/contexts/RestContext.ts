import { createContext } from 'react';

import type { Badge, EmberLine, Level, PracticeId, RestSession, RestSettings, RestState } from '@/lib/rest';

export interface SessionResult {
  session: RestSession;
  lines: EmberLine[];
  earned: Badge[];
  /** Set when this session pushed you into a new moon phase. */
  levelUp?: Level;
}

export interface CheckinResult {
  /** Bars gained since the pre-rest reading, when there was one. */
  gained?: number;
  /** Recharge embers awarded for a post-rest check-in. */
  embers?: number;
}

export interface RestContextType {
  state: RestState;
  completeSession: (input: { practice: PracticeId; minutes: number; logged?: boolean }) => SessionResult;
  /**
   * Record a battery reading. Pass `sessionId` for the check-in right after a
   * rest; that awards recharge embers and returns how many bars were gained.
   */
  checkIn: (level: number, sessionId?: string) => CheckinResult;
  toggleQuest: (id: string) => void;
  recordShare: () => void;
  updateSettings: (patch: Partial<RestSettings>) => void;
  resetAll: () => void;
}

export const RestContext = createContext<RestContextType | undefined>(undefined);
