import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RestContext, type RestContextType, type SessionResult } from '@/contexts/RestContext';
import { toast } from '@/hooks/useToast';
import {
  awardBadges,
  type Badge,
  calculateEmbers,
  dayKey,
  DEFAULT_REST_STATE,
  levelFor,
  type RestState,
  totalEmbers,
} from '@/lib/rest';

const STORAGE_KEY = 'restful:state';

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
      badges: p.badges && typeof p.badges === 'object' ? p.badges : {},
      shares: typeof p.shares === 'number' ? p.shares : 0,
      settings: { ...DEFAULT_REST_STATE.settings, ...p.settings },
    };
  } catch {
    return DEFAULT_REST_STATE;
  }
}

function announceBadges(earned: Badge[]) {
  for (const badge of earned) {
    toast({ title: `Badge earned: ${badge.name}`, description: badge.description });
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

  const completeSession = useCallback<RestContextType['completeSession']>(({ practice, minutes, logged }) => {
    const prev = stateRef.current;
    const now = Date.now();
    const { total, lines, lowEnergy } = calculateEmbers(prev, { minutes, logged, now });
    const session = {
      id: crypto.randomUUID(),
      practice,
      endedAt: now,
      minutes: Math.round(minutes),
      embers: total,
      logged,
      lowEnergy,
    };
    const withSession = { ...prev, sessions: [...prev.sessions, session] };
    const { state: next, earned } = awardBadges(withSession, now);
    commit(next);

    const before = levelFor(totalEmbers(prev)).level;
    const after = levelFor(totalEmbers(next)).level;
    const result: SessionResult = { session, lines, earned };
    if (after.index > before.index) result.levelUp = after;
    return result;
  }, [commit]);

  const checkIn = useCallback((level: number) => {
    const prev = stateRef.current;
    const checkins = [...prev.checkins, { at: Date.now(), level }].slice(-200);
    commit({ ...prev, checkins });
  }, [commit]);

  const toggleQuest = useCallback((id: string) => {
    const prev = stateRef.current;
    const key = dayKey(Date.now());
    const done = prev.quests[key] ?? [];
    const nextDone = done.includes(id) ? done.filter((q) => q !== id) : [...done, id];
    const { state: next, earned } = awardBadges({ ...prev, quests: { ...prev.quests, [key]: nextDone } });
    commit(next);
    announceBadges(earned);
  }, [commit]);

  const recordShare = useCallback(() => {
    const prev = stateRef.current;
    const { state: next, earned } = awardBadges({ ...prev, shares: prev.shares + 1 });
    commit(next);
    announceBadges(earned);
  }, [commit]);

  const updateSettings = useCallback<RestContextType['updateSettings']>((patch) => {
    const prev = stateRef.current;
    commit({ ...prev, settings: { ...prev.settings, ...patch } });
  }, [commit]);

  const resetAll = useCallback(() => {
    commit(DEFAULT_REST_STATE);
  }, [commit]);

  useRestReminders(state);

  const value = useMemo<RestContextType>(() => ({
    state,
    completeSession,
    checkIn,
    toggleQuest,
    recordShare,
    updateSettings,
    resetAll,
  }), [state, completeSession, checkIn, toggleQuest, recordShare, updateSettings, resetAll]);

  return <RestContext.Provider value={value}>{children}</RestContext.Provider>;
}

/** While the app is open, periodically remind the user to take a break. */
function useRestReminders(state: RestState) {
  const lastReminded = useRef(0);
  const interval = state.settings.reminderMinutes;
  const lastSession = state.sessions[state.sessions.length - 1]?.endedAt ?? 0;

  useEffect(() => {
    if (!interval) return;
    // Count from when reminders were switched on or the app was opened.
    lastReminded.current = Math.max(lastReminded.current, Date.now());

    const tick = () => {
      const now = Date.now();
      const hour = new Date(now).getHours();
      if (hour < 8 || hour >= 23) return;
      if (now - Math.max(lastSession, lastReminded.current) < interval * 60_000) return;
      lastReminded.current = now;

      const title = 'Time to rest';
      const body = 'You have been going for a while. Take five minutes. The work will wait.';

      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/dusk.webp', tag: 'restful-reminder' });
          return;
        } catch {
          // Some mobile browsers only allow notifications from a service worker.
        }
      }
      toast({ title, description: body });
    };

    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [interval, lastSession]);
}
