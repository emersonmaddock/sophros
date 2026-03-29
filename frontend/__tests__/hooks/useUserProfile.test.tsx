import { useUserProfile } from '@/hooks/useUserProfile';
import { renderHook } from '@testing-library/react-native';

// Mock UserContext — Clerk's useUser is already mocked globally in jest.setup.ts,
// but we need per-test control so we override it locally here.
jest.mock('@/contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(() => ({
    isSignedIn: true,
    userId: 'test-user-id',
    getToken: jest.fn().mockResolvedValue('mock-token'),
  })),
  useUser: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
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

import { useUser as useContextUser } from '@/contexts/UserContext';
import { useUser as useClerkUser } from '@clerk/clerk-expo';

const mockUseContextUser = useContextUser as jest.MockedFunction<typeof useContextUser>;
const mockClerkUseUser = useClerkUser as jest.MockedFunction<typeof useClerkUser>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBackendUser(overrides: Record<string, unknown> = {}) {
  return {
    email: 'test@example.com',
    age: 30,
    weight: 80,
    height: 180,
    show_imperial: false,
    gender: 'male' as const,
    activity_level: 'moderate' as const,
    pregnancy_status: undefined,
    ...overrides,
  };
}

function makeClerkUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'clerk-user-id',
    firstName: 'Test',
    lastName: 'User',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
    ...overrides,
  };
}

function setupMocks(
  backendUser: ReturnType<typeof makeBackendUser> | null,
  clerkUser: ReturnType<typeof makeClerkUser> | null,
) {
  mockUseContextUser.mockReturnValue({
    user: backendUser as any,
    isOnboarded: !!backendUser,
    loading: false,
    error: null,
    fetchUser: jest.fn(),
    refreshUser: jest.fn(),
    updateUserProfile: jest.fn(),
    clearUser: jest.fn(),
  });

  mockClerkUseUser.mockReturnValue({
    user: clerkUser as any,
    isLoaded: true,
    isSignedIn: !!clerkUser,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mocks
    setupMocks(makeBackendUser(), makeClerkUser());
  });

  it('returns null profile when backendUser is null', () => {
    setupMocks(null, makeClerkUser());
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile).toBeNull();
  });

  it('returns null profile when Clerk user is null', () => {
    setupMocks(makeBackendUser(), null);
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile).toBeNull();
  });

  it('formats weight in lbs when show_imperial is true', () => {
    setupMocks(makeBackendUser({ weight: 80, show_imperial: true }), makeClerkUser());
    const { result } = renderHook(() => useUserProfile());
    // 80 kg / 0.453592 = ~176.37 lbs → "176.4 lbs"
    expect(result.current.profile?.weight).toBe('176.4 lbs');
  });

  it('formats height in feet/inches when show_imperial is true', () => {
    setupMocks(makeBackendUser({ height: 180, show_imperial: true }), makeClerkUser());
    const { result } = renderHook(() => useUserProfile());
    // 180 cm → ~70.87 inches → 5 feet 11 inches
    expect(result.current.profile?.height).toBe("5' 11\"");
  });

  it('formats weight in kg when show_imperial is false', () => {
    setupMocks(makeBackendUser({ weight: 80, show_imperial: false }), makeClerkUser());
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile?.weight).toBe('80.0 kg');
  });

  it('formats height in cm when show_imperial is false', () => {
    setupMocks(makeBackendUser({ height: 180, show_imperial: false }), makeClerkUser());
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile?.height).toBe('180 cm');
  });

  it('maps activityLevel "moderate" to "Moderately Active"', () => {
    setupMocks(makeBackendUser({ activity_level: 'moderate' }), makeClerkUser());
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile?.activityLevel).toBe('Moderately Active');
  });

  it('maps gender "male" to "Male"', () => {
    setupMocks(makeBackendUser({ gender: 'male' }), makeClerkUser());
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile?.gender).toBe('Male');
  });

  it('constructs fullName from firstName and lastName', () => {
    setupMocks(makeBackendUser(), makeClerkUser({ firstName: 'Jane', lastName: 'Doe' }));
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile?.fullName).toBe('Jane Doe');
  });

  it('falls back to "User" when both firstName and lastName are empty', () => {
    setupMocks(makeBackendUser(), makeClerkUser({ firstName: '', lastName: '' }));
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.profile?.fullName).toBe('User');
  });
});
