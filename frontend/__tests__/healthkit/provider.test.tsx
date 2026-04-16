import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthKitProvider, useHealthKit } from '@/lib/healthkit/provider';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@clerk/expo';

const getMock = SecureStore.getItemAsync as jest.Mock;
const setMock = SecureStore.setItemAsync as jest.Mock;

function wrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <HealthKitProvider>{children}</HealthKitProvider>
    </QueryClientProvider>
  );
}

describe('HealthKitProvider', () => {
  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
    getMock.mockResolvedValue(null); // default: nothing stored
  });

  it('starts in off and loads persisted direction', async () => {
    getMock.mockResolvedValueOnce('read');
    const qc = new QueryClient();
    const { result } = renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.direction).toBe('read'));
  });

  it('persists direction on setDirection', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });
    await act(async () => {
      await result.current.setDirection('readWrite');
    });
    expect(setMock).toHaveBeenCalledWith('healthkit.direction.test-user-id', 'readWrite');
    expect(result.current.direction).toBe('readWrite');
  });

  it('invalidates healthkit queries on AppState → active', async () => {
    const qc = new QueryClient();
    const spy = jest.spyOn(qc, 'invalidateQueries');
    renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });

    // Simulate AppState transition. react-native's AppState.addEventListener returns { remove }.
    // Capture the latest registered handler via the mock.
    const calls = (AppState.addEventListener as jest.Mock).mock.calls;
    const lastHandler = calls[calls.length - 1][1] as (s: string) => void;
    act(() => {
      lastHandler('active');
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['healthkit'] });
  });

  it('resets to off when the user signs out', async () => {
    getMock.mockResolvedValueOnce('readWrite');
    const qc = new QueryClient();
    const { result, rerender } = renderHook(() => useHealthKit(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.direction).toBe('readWrite'));

    // Flip Clerk to signed-out. `useAuth` is mocked at jest.setup.ts to always return isSignedIn: true;
    // re-mock here just for this test.
    (useAuth as jest.Mock).mockReturnValueOnce({
      isSignedIn: false,
      userId: null,
      getToken: jest.fn(),
    });
    rerender({});
    await waitFor(() => expect(result.current.direction).toBe('off'));
  });
});
