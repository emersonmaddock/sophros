import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as HealthKit from '@kingstinct/react-native-healthkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthKitProvider } from '@/lib/healthkit/provider';
import { useStepsToday, useActiveEnergyToday } from '@/lib/healthkit/queries';
import * as SecureStore from 'expo-secure-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImpl = (HealthKit as any).__mockImpl as Record<string, unknown>;

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HealthKitProvider>{children}</HealthKitProvider>
    </QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('healthkit query hooks', () => {
  beforeEach(() => {
    (SecureStore.getItemAsync as jest.Mock).mockReset();
  });

  it('useStepsToday stays disabled while direction is off (default)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null); // default off
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useStepsToday(), { wrapper });
    // Queries in disabled state stay idle.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toBeUndefined();
  });

  it('useStepsToday fetches when direction is read', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('read');
    mockImpl.queryQuantitySamples = async () => [{ quantity: 3000 }, { quantity: 2000 }];
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useStepsToday(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual(expect.objectContaining({ valueToday: 5000 }))
    );
  });

  it('useActiveEnergyToday fetches when direction is readWrite', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('readWrite');
    mockImpl.queryQuantitySamples = async () => [{ quantity: 250 }];
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useActiveEnergyToday(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual(expect.objectContaining({ kcalToday: 250 }))
    );
  });
});
