import { createContext } from 'react';

import type { Badge, EmberLine, Level, PracticeId, RestSession, RestSettings, RestState } from '@/lib/rest';

export interface SessionResult {
  session: RestSession;
  lines: EmberLine[];
  earned: Badge[];
  /** Set when this session pushed you into a new moon phase. */
  levelUp?: Level;
}

export interface RestContextType {
  state: RestState;
  completeSession: (input: { practice: PracticeId; minutes: number; logged?: boolean }) => SessionResult;
  checkIn: (level: number) => void;
  toggleQuest: (id: string) => void;
  recordShare: () => void;
  updateSettings: (patch: Partial<RestSettings>) => void;
  resetAll: () => void;
}

export const RestContext = createContext<RestContextType | undefined>(undefined);
