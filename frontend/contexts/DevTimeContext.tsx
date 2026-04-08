/**
 * DevTimeContext — isolated developer override for the current date/time.
 *
 * All production code should call `useNow()` (hooks/useNow.ts) rather than
 * `new Date()` directly.  This context is the only place the override is
 * stored; nothing else in the app imports from here except useNow and the
 * developer settings UI.
 */
import React, { createContext, useContext, useState } from 'react';

type DevTimeContextType = {
  overrideTime: Date | null;
  setOverrideTime: (d: Date | null) => void;
};

const DevTimeContext = createContext<DevTimeContextType>({
  overrideTime: null,
  setOverrideTime: () => {},
});

export function DevTimeProvider({ children }: { children: React.ReactNode }) {
  const [overrideTime, setOverrideTime] = useState<Date | null>(null);
  return (
    <DevTimeContext.Provider value={{ overrideTime, setOverrideTime }}>
      {children}
    </DevTimeContext.Provider>
  );
}

export function useDevTime() {
  return useContext(DevTimeContext);
}
