import { useContext } from 'react';

import { RestContext, type RestContextType } from '@/contexts/RestContext';

/** Access the user's rest journey: sessions, embers, quests, and settings. */
export function useRest(): RestContextType {
  const context = useContext(RestContext);
  if (context === undefined) {
    throw new Error('useRest must be used within a RestProvider');
  }
  return context;
}
