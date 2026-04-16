import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import { ConfirmationsProvider } from '@/contexts/ConfirmationsContext';
import { HealthKitProvider } from '@/lib/healthkit';
import React from 'react';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function createWrapper() {
  const queryClient = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <HealthKitProvider>
        <ConfirmationsProvider>{ui}</ConfirmationsProvider>
      </HealthKitProvider>
    </QueryClientProvider>,
    options
  );
}
