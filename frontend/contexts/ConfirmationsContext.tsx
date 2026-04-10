/**
 * ConfirmationsContext — shared state for swipe-confirmed schedule items.
 *
 * Both the Schedule tab (writes) and the Home tab (reads for macros)
 * consume this context.  Confirmations are keyed by item ID and are
 * in-memory only (reset on full app restart).
 *
 * Each confirmation stores:
 *  - scheduledMins: minutes-from-midnight of the item's scheduled time, used to
 *    purge future confirmations when the dev time override moves backwards.
 *  - dateStr: "YYYY-MM-DD" local date the item belongs to, used by the home tab
 *    to ignore confirmations from other days (recipe IDs can repeat across days).
 */
import { useNow } from '@/hooks/useNow';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Confirmation =
  | { status: 'done'; scheduledMins: number; dateStr: string }
  | { status: 'missed'; actual: string | null; scheduledMins: number; dateStr: string };

type ConfirmationsContextType = {
  confirmations: Record<string, Confirmation>;
  confirm: (itemId: string, confirmation: Confirmation) => void;
};

const ConfirmationsContext = createContext<ConfirmationsContextType>({
  confirmations: {},
  confirm: () => {},
});

export function ConfirmationsProvider({ children }: { children: React.ReactNode }) {
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation>>({});
  const now = useNow();

  // Purge confirmations whose scheduled time is now in the future.
  // This fires every minute (useNow ticks) and whenever the dev override changes.
  useEffect(() => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    setConfirmations((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id].scheduledMins > nowMins) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [now]);

  const confirm = useCallback((itemId: string, confirmation: Confirmation) => {
    setConfirmations((prev) => ({ ...prev, [itemId]: confirmation }));
  }, []);

  return (
    <ConfirmationsContext.Provider value={{ confirmations, confirm }}>
      {children}
    </ConfirmationsContext.Provider>
  );
}

export function useConfirmations() {
  return useContext(ConfirmationsContext);
}
