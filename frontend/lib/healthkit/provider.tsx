import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { NativeEventSubscription } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { initAuthorization } from './client';
import { loadDirection, saveDirection } from './storage';
import type { Direction } from './types';

interface HealthKitContextValue {
  direction: Direction;
  isIOS: boolean;
  setDirection: (d: Direction) => Promise<void>;
  lastRefreshAt: number | null;
}

const HealthKitContext = createContext<HealthKitContextValue | undefined>(undefined);

export function HealthKitProvider({ children }: { children: React.ReactNode }) {
  const { userId, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [direction, setDirectionState] = useState<Direction>('off');
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const isIOS = Platform.OS === 'ios';

  // Load persisted direction when user is available.
  useEffect(() => {
    let cancelled = false;
    if (!isSignedIn || !userId) {
      setDirectionState('off');
      queryClient.removeQueries({ queryKey: ['healthkit'] });
      return;
    }
    loadDirection(userId).then((d) => {
      if (!cancelled) setDirectionState(d);
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, queryClient]);

  // Request authorization whenever direction moves off `off`.
  useEffect(() => {
    if (!isIOS || direction === 'off') return;
    initAuthorization(direction).catch((err) => {
      console.warn('[HealthKit] authorization failed:', err);
    });
  }, [direction, isIOS]);

  // AppState: invalidate HK queries on foreground.
  const subRef = useRef<NativeEventSubscription | null>(null);
  useEffect(() => {
    const handler = (state: string) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ['healthkit'] });
        if (direction !== 'off') {
          setLastRefreshAt(Date.now());
        }
      }
    };
    subRef.current = AppState.addEventListener('change', handler);
    return () => {
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [direction, queryClient]);

  const setDirection = useCallback(
    async (d: Direction) => {
      if (!userId) return;
      await saveDirection(userId, d);
      setDirectionState(d);
      if (d === 'off') {
        queryClient.removeQueries({ queryKey: ['healthkit'] });
      } else if (isIOS) {
        try {
          await initAuthorization(d);
        } catch (err) {
          console.warn('[HealthKit] authorization failed:', err);
        }
      }
    },
    [userId, queryClient, isIOS]
  );

  const value = useMemo<HealthKitContextValue>(
    () => ({ direction, isIOS, setDirection, lastRefreshAt }),
    [direction, isIOS, setDirection, lastRefreshAt]
  );

  return <HealthKitContext.Provider value={value}>{children}</HealthKitContext.Provider>;
}

export function useHealthKit(): HealthKitContextValue {
  const v = useContext(HealthKitContext);
  if (!v) throw new Error('useHealthKit must be used within HealthKitProvider');
  return v;
}
