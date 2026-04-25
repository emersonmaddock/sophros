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
jest.mock('@/lib/queries/schedule', () => ({
  useWeekScheduleQuery: jest.fn(() => ({ data: [], isLoading: false, error: null })),
}));

jest.mock('@/lib/queries/mealPlan', () => ({
  useGenerateWeekPlanMutation: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock('@/lib/queries/user', () => ({
  useUserQuery: jest.fn(() => ({ data: null, isLoading: false })),
  useUserTargetsQuery: jest.fn(() => ({ data: null, isLoading: false })),
}));

// Note: the home screen imports useUser from @clerk/expo (as useClerkUser alias),
// but also reads from our UserContext for health-score calculation; stub the
// context module so the test doesn't need a real UserProvider wrapper.
jest.mock('@/contexts/UserContext', () => ({
  useUser: jest.fn(() => ({ user: null, isOnboarded: false, loading: false })),
}));

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

import { useWeekScheduleQuery } from '@/lib/queries/schedule';
import { useUserQuery, useUserTargetsQuery } from '@/lib/queries/user';
import { useUser } from '@clerk/expo';

describe('DashboardPage (Home)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default empty-data state
    (useWeekScheduleQuery as jest.Mock).mockReturnValue({
      data: [],
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

  it('shows "All done for today" when today had meals but all have already passed', () => {
    // `useNow` is globally mocked to 2026-01-15T10:00 local (jest.setup.ts).
    // Place the meal at 08:00 that day so it's past-but-same-day.
    const pastMeal = new Date(2026, 0, 15, 8, 0, 0);
    (useWeekScheduleQuery as jest.Mock).mockReturnValue({
      data: [
        {
          id: 1,
          user_id: 'u',
          date: pastMeal.toISOString(),
          activity_type: 'meal',
          is_completed: false,
          duration_minutes: 15,
          meal: {
            id: 10,
            title: 'Breakfast',
            calories: 300,
            protein: 20,
            carbohydrates: 30,
            fat: 10,
          },
        },
      ],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/All done for today/i)).toBeTruthy();
    expect(screen.queryByText(/No meals planned yet/i)).toBeNull();
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
    (useWeekScheduleQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    renderWithProviders(<DashboardPage />);

    // Check for ActivityIndicator by testID or by looking for the loading indicator
    expect(screen.getByTestId('home-loading-indicator')).toBeTruthy();
  });
});
