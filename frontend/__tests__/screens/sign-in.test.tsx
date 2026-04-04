import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import SignInScreen from '@/app/(auth)/sign-in';

// Mock the native Clerk AuthView — it has no JS implementation in tests
jest.mock('@clerk/expo/native', () => ({
  AuthView: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('SignInScreen', () => {
  it('renders without crashing', () => {
    expect(() => renderWithProviders(<SignInScreen />)).not.toThrow();
  });
});
