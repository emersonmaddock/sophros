import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import DashboardPage from '@/app/(tabs)/index';

// Override the global Clerk mock to make useUser a jest.fn() for per-test control
jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(() => ({
    isSignedIn: true,
    getToken: jest.fn().mockResolvedValue('mock-token'),
  })),
  useUser: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
    isLoaded: true,
  })),
  useSignIn: jest.fn(() => ({
    signIn: { create: jest.fn() },
    isLoaded: true,
    setActive: jest.fn(),
  })),
  useSignUp: jest.fn(() => ({
    signUp: { create: jest.fn() },
    isLoaded: true,
    setActive: jest.fn(),
  })),
  useClerk: jest.fn(() => ({ signOut: jest.fn() })),
  ClerkProvider: ({ children }: { children: unknown }) => children,
}));

// Mock all data-fetching hooks used by the dashboard
jest.mock('@/lib/queries/mealPlan', () => ({
  useSavedWeekPlanQuery: jest.fn(() => ({ data: null, isLoading: false, error: null })),
  useGenerateWeekPlanMutation: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock('@/lib/queries/user', () => ({
  useUserQuery: jest.fn(() => ({ data: null, isLoading: false })),
  useUserTargetsQuery: jest.fn(() => ({ data: null, isLoading: false })),
}));

// Note: the home screen imports useUser from @clerk/clerk-expo (as useClerkUser alias),
// not from @/contexts/UserContext — the global mock in jest.setup.ts covers this.

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children,
    Svg: ({ children }: { children: React.ReactNode }) => children,
    Path: () => null,
    Circle: () => null,
    G: () => null,
  };
});

import { useSavedWeekPlanQuery } from '@/lib/queries/mealPlan';
import { useUserQuery, useUserTargetsQuery } from '@/lib/queries/user';
import { useUser } from '@clerk/expo';

describe('DashboardPage (Home)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default null-data state
    (useSavedWeekPlanQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    (useUserQuery as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (useUserTargetsQuery as jest.Mock).mockReturnValue({ data: null, isLoading: false });
  });

  it('renders without crashing when all data is null', () => {
    renderWithProviders(<DashboardPage />);
    // The greeting is always rendered
    expect(screen.getByText(/Good (Morning|Afternoon|Evening)/)).toBeTruthy();
  });

  it('renders the Health Score section', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Health Score')).toBeTruthy();
  });

  it('renders the "No meals planned yet" message when there is no saved plan', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/No meals planned yet/i)).toBeTruthy();
  });

  it("shows the user's first name in the greeting when Clerk user has firstName", async () => {
    // Override the global Clerk mock for this test only
    (useUser as jest.Mock).mockReturnValueOnce({
      user: { firstName: 'Alice', lastName: 'Smith' },
      isLoaded: true,
    });

    renderWithProviders(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeTruthy();
    });
  });

  it('renders macro nutrient section labels', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText("Today's Macros")).toBeTruthy();
  });

  it('shows loading indicator when isLoading: true', () => {
    // Mock the query to return isLoading: true
    (useSavedWeekPlanQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithProviders(<DashboardPage />);

    // Check for ActivityIndicator by testID or by looking for the loading indicator
    expect(screen.getByTestId('home-loading-indicator')).toBeTruthy();
  });
});
