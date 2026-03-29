import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { renderWithProviders } from '@/__tests__/test-utils';
import SignInScreen from '@/app/(auth)/sign-in';

// Override the global Clerk mock so useSignIn is a proper jest.fn() for per-test control
jest.mock('@clerk/clerk-expo', () => ({
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
  useSignIn: jest.fn(),
  useSignUp: jest.fn(() => ({
    signUp: { create: jest.fn() },
    isLoaded: true,
    setActive: jest.fn(),
  })),
  useSSO: jest.fn(() => ({ startSSOFlow: jest.fn() })),
  useClerk: jest.fn(() => ({ signOut: jest.fn() })),
  ClerkProvider: ({ children }: { children: unknown }) => children,
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
const mockPrepareSecondFactor = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useSignIn as jest.Mock).mockReturnValue({
    signIn: { create: mockSignInCreate, prepareSecondFactor: mockPrepareSecondFactor },
    isLoaded: true,
    setActive: mockSetActive,
  });
});

function renderSignIn() {
  return renderWithProviders(<SignInScreen />);
}

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

  it('does not call signIn.create when Clerk is not loaded', async () => {
    (useSignIn as jest.Mock).mockReturnValue({
      signIn: { create: mockSignInCreate, prepareSecondFactor: mockPrepareSecondFactor },
      isLoaded: false,
      setActive: mockSetActive,
    });

    renderSignIn();

    fireEvent.changeText(
      screen.getByPlaceholderText('Enter your email address'),
      'test@example.com'
    );
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    pressSignInButton();

    expect(mockSignInCreate).not.toHaveBeenCalled();
  });

  it('shows verification screen after needs_second_factor response', async () => {
    mockSignInCreate.mockResolvedValueOnce({
      status: 'needs_second_factor',
      supportedSecondFactors: [{ strategy: 'email_code', emailAddressId: 'ead_123' }],
    });
    mockPrepareSecondFactor.mockResolvedValueOnce({});

    renderSignIn();

    fireEvent.changeText(
      screen.getByPlaceholderText('Enter your email address'),
      'test@example.com'
    );
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    await act(async () => {
      pressSignInButton();
    });

    await waitFor(() => {
      expect(screen.getByText(/verify your email/i)).toBeTruthy();
    });
  });
});
