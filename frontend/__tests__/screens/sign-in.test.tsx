import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { renderWithProviders } from '@/__tests__/test-utils';
import SignInScreen from '@/app/(auth)/sign-in';

// theme.ts calls Platform.select at module-init level; mock the whole module to
// avoid relying on the Platform mock being established before module evaluation.
jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      text: '#111827',
      textMuted: '#6B7280',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      primary: '#2B9D8F',
      primaryDark: '#1F6D63',
      tint: '#2B9D8F',
      secondary: '#FFB74D',
      success: '#22C55E',
      error: '#EF4444',
      charts: { calories: '#FFB74D', protein: '#2B9D8F', carbs: '#8B5CF6', fats: '#EC4899' },
    },
  },
  Shadows: { card: {} },
  Layout: { cardRadius: 16 },
  Fonts: { sans: 'system-ui', serif: 'serif', rounded: 'normal', mono: 'monospace' },
}));

// Override the global Clerk mock so useSignIn is a proper jest.fn() for per-test control
jest.mock('@clerk/clerk-expo', () => ({
  ...jest.requireActual('@clerk/clerk-expo'),
  useSignIn: jest.fn(),
  useSSO: jest.fn(() => ({ startSSOFlow: jest.fn() })),
}));

// Mock native modules used by this screen's dependency tree
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'myapp://redirect'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
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

// Override the global Clerk mock for per-test control
const mockSetActive = jest.fn();
const mockSignInCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useSignIn as jest.Mock).mockReturnValue({
    signIn: { create: mockSignInCreate },
    isLoaded: true,
    setActive: mockSetActive,
  });
});

// Helper: the screen has both a title "Sign In" and a button labeled "Sign In".
// getAllByText returns them in DOM order; the last one is the button inside the form.
function pressSignInButton() {
  const allSignIn = screen.getAllByText('Sign In');
  // The button is the last match (rendered after the title)
  fireEvent.press(allSignIn[allSignIn.length - 1]);
}

describe('SignInScreen', () => {
  it('renders email input, password input, and sign-in button', () => {
    renderWithProviders(<SignInScreen />);

    expect(screen.getByPlaceholderText('Enter your email address')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
    // Both the page title and the button say "Sign In"
    expect(screen.getAllByText('Sign In').length).toBeGreaterThanOrEqual(1);
  });

  it('updates email input value when text is changed', () => {
    renderWithProviders(<SignInScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email address');
    fireEvent.changeText(emailInput, 'test@example.com');

    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('updates password input value when text is changed', () => {
    renderWithProviders(<SignInScreen />);

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    fireEvent.changeText(passwordInput, 'secret123');

    expect(passwordInput.props.value).toBe('secret123');
  });

  it('calls signIn.create with email and password on sign-in press', async () => {
    mockSignInCreate.mockResolvedValueOnce({
      status: 'needs_identifier',
    });

    renderWithProviders(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your email address'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'mypassword');
    pressSignInButton();

    await waitFor(() => {
      expect(mockSignInCreate).toHaveBeenCalledWith({
        identifier: 'user@test.com',
        password: 'mypassword',
      });
    });
  });

  it('calls setActive when sign-in returns complete status', async () => {
    mockSignInCreate.mockResolvedValueOnce({
      status: 'complete',
      createdSessionId: 'sess_123',
    });

    renderWithProviders(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your email address'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'mypassword');
    pressSignInButton();

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_123' });
    });
  });

  it('shows an error message when sign-in throws a Clerk error', async () => {
    const clerkError = {
      errors: [{ longMessage: 'Invalid credentials' }],
    };
    mockSignInCreate.mockRejectedValueOnce(clerkError);

    renderWithProviders(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your email address'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
    pressSignInButton();

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });
});
