import { createContext } from 'react';

import type { RechargeId, RestSession, RestSettings, RestState } from '@/lib/rest';

export interface CheckinResult {
  /** Bars gained since the pre-rest reading, when there was one. */
  gained?: number;
}

export interface RestContextType {
  state: RestState;
  completeSession: (input: { practice: RechargeId; minutes: number }) => RestSession;
  /**
   * Record a battery reading. Pass `sessionId` for the check-in right after a
   * rest; that returns how many bars were gained.
   */
  checkIn: (level: number, sessionId?: string) => CheckinResult;
  toggleQuest: (id: string) => void;
  updateSettings: (patch: Partial<RestSettings>) => void;
}

export const RestContext = createContext<RestContextType | undefined>(undefined);
