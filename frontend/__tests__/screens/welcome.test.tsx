import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, Redirect } from 'expo-router';
import WelcomeScreen from '@/app/welcome';

// Override the global Clerk mock to allow per-test control of useAuth
jest.mock('@clerk/expo', () => ({
  useAuth: jest.fn(() => ({
    isSignedIn: false,
    isLoaded: true,
  })),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import { useAuth } from '@clerk/expo';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: not signed in, Clerk loaded
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: false, isLoaded: true });
  });

  it('renders app name, tagline, and Get Started button when not signed in and Clerk is loaded', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Sophros')).toBeTruthy();
    expect(screen.getByText('Your personal health companion')).toBeTruthy();
    expect(screen.getByText('Get Started')).toBeTruthy();
  });

  it('navigates to sign-in when Get Started is pressed', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText('Get Started'));

    expect(router.push).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('redirects to auth if already signed in', () => {
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, isLoaded: true });

    const { UNSAFE_getByType } = render(<WelcomeScreen />);

    expect(UNSAFE_getByType(Redirect)).toBeTruthy();
  });

  it('returns null when Clerk is not loaded', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoaded: false });

    const { toJSON } = render(<WelcomeScreen />);

    expect(toJSON()).toBeNull();
  });
});
