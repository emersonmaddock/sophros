import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AppleHealthKit from 'react-native-health';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthKitProvider } from '@/lib/healthkit/provider';
import { useLogWeight, useLogWorkout } from '@/lib/healthkit/mutations';
import * as SecureStore from 'expo-secure-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImpl = (AppleHealthKit as any).__mockImpl as Record<string, unknown>;

function wrap() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HealthKitProvider>{children}</HealthKitProvider>
    </QueryClientProvider>
  );
}

describe('healthkit mutation gating', () => {
  beforeEach(() => {
    (SecureStore.getItemAsync as jest.Mock).mockReset();
  });

  it('useLogWeight does not call the bridge when direction is off', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null); // off
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWeight = spy;
    const { result } = renderHook(() => useLogWeight(), { wrapper: wrap() });
    await result.current.mutateAsync({ weightKg: 80, recordedAtISO: new Date().toISOString() });
    expect(spy).not.toHaveBeenCalled();
  });

  it('useLogWeight does not call the bridge when direction is read', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('read');
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWeight = spy;
    const wrapper = wrap();
    const { result } = renderHook(() => useLogWeight(), { wrapper });
    // Wait for provider to hydrate.
    await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalled());
    await result.current.mutateAsync({ weightKg: 80, recordedAtISO: new Date().toISOString() });
    expect(spy).not.toHaveBeenCalled();
  });

  it('useLogWeight calls the bridge when direction is readWrite', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('readWrite');
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWeight = spy;
    const wrapper = wrap();
    const { result } = renderHook(() => useLogWeight(), { wrapper });
    await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalled());
    await act(async () => {}); // flush pending React state updates (direction → readWrite)
    await result.current.mutateAsync({ weightKg: 80, recordedAtISO: new Date().toISOString() });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('useLogWorkout is exported and callable', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('readWrite');
    const spy = jest.fn((_o: unknown, cb: (e: string | null, r: string) => void) => cb(null, 'ok'));
    mockImpl.saveWorkout = spy;
    const wrapper = wrap();
    const { result } = renderHook(() => useLogWorkout(), { wrapper });
    await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalled());
    await act(async () => {}); // flush pending React state updates (direction → readWrite)
    await result.current.mutateAsync({
      activityName: 'Running',
      startISO: new Date().toISOString(),
      endISO: new Date().toISOString(),
      calories: 120,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
