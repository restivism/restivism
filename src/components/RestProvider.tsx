import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type CheckinResult, RestContext, type RestContextType } from '@/contexts/RestContext';
import { dayKey, DEFAULT_REST_STATE, recentCheckin, type RestState } from '@/lib/rest';

const STORAGE_KEY = 'restivism:state';

function loadState(): RestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REST_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_REST_STATE;
    const p = parsed as Partial<RestState>;
    return {
      ...DEFAULT_REST_STATE,
      sessions: Array.isArray(p.sessions) ? p.sessions : [],
      checkins: Array.isArray(p.checkins) ? p.checkins : [],
      quests: p.quests && typeof p.quests === 'object' ? p.quests : {},
      settings: { ...DEFAULT_REST_STATE.settings, music: p.settings?.music ?? DEFAULT_REST_STATE.settings.music },
    };
  } catch {
    return DEFAULT_REST_STATE;
  }
}

export function RestProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RestState>(loadState);
  const stateRef = useRef(state);

  const commit = useCallback((next: RestState) => {
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Failed to save rest state:', error);
    }
  }, []);

  // Keep other tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = loadState();
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const completeSession = useCallback<RestContextType['completeSession']>(({ practice, minutes }) => {
    const prev = stateRef.current;
    const now = Date.now();
    const session = {
      id: crypto.randomUUID(),
      practice,
      endedAt: now,
      minutes: Math.round(minutes),
      energyBefore: recentCheckin(prev.checkins, now, 6)?.level,
    };
    commit({ ...prev, sessions: [...prev.sessions, session].slice(-500) });
    return session;
  }, [commit]);

  const checkIn = useCallback<RestContextType['checkIn']>((level, sessionId) => {
    const prev = stateRef.current;
    const at = Date.now();
    const result: CheckinResult = {};

    let sessions = prev.sessions;
    if (sessionId) {
      sessions = sessions.map((s) => {
        if (s.id !== sessionId) return s;
        if (s.energyBefore) result.gained = level - s.energyBefore;
        return { ...s, energyAfter: level };
      });
    }

    // Changing your mind about a post-rest reading replaces it rather than adding another.
    const last = prev.checkins[prev.checkins.length - 1];
    const base = sessionId && last?.sessionId === sessionId ? prev.checkins.slice(0, -1) : prev.checkins;
    const checkins = [...base, { at, level, sessionId }].slice(-500);

    commit({ ...prev, sessions, checkins });
    return result;
  }, [commit]);

  const toggleQuest = useCallback((id: string) => {
    const prev = stateRef.current;
    const key = dayKey(Date.now());
    const done = prev.quests[key] ?? [];
    const nextDone = done.includes(id) ? done.filter((q) => q !== id) : [...done, id];
    commit({ ...prev, quests: { ...prev.quests, [key]: nextDone } });
  }, [commit]);

  const updateSettings = useCallback<RestContextType['updateSettings']>((patch) => {
    const prev = stateRef.current;
    commit({ ...prev, settings: { ...prev.settings, ...patch } });
  }, [commit]);

  const value = useMemo<RestContextType>(() => ({
    state,
    completeSession,
    checkIn,
    toggleQuest,
    updateSettings,
  }), [state, completeSession, checkIn, toggleQuest, updateSettings]);

  return <RestContext.Provider value={value}>{children}</RestContext.Provider>;
}
