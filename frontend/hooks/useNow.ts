/**
 * useNow — returns the current Date.
 *
 * In normal operation it refreshes every minute so UI stays accurate.
 * When a dev override is active (set via DevTimeContext) it returns that
 * fixed value instead, enabling time-travel testing without touching any
 * other code.
 */
import { useDevTime } from '@/contexts/DevTimeContext';
import { useEffect, useState } from 'react';

export function useNow(): Date {
  const { overrideTime } = useDevTime();
  const [now, setNow] = useState<Date>(() => overrideTime ?? new Date());

  useEffect(() => {
    if (overrideTime) {
      setNow(overrideTime);
      return;
    }
    // Keep real time fresh
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [overrideTime]);

  return now;
}
