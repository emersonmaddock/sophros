import '@testing-library/react-native/extend-expect';

// Silence React Native log warnings in tests
// Platform.select is called at module-init level in theme.ts and OAuthButton.tsx.
// react-native's index.js resolves Platform as require('./Libraries/Utilities/Platform').default,
// so the mock must export a `default` property.
const platformMock = {
  OS: 'ios',
  select: (obj: Record<string, unknown>) => obj['ios'] ?? obj['default'],
};
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  ...platformMock,
  default: platformMock,
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
  Redirect: ({ href }: { href: string }) => null,
  Stack: { Screen: 'Screen' },
  Tabs: { Screen: 'Screen' },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useSegments: () => [],
}));

// Mock Clerk
jest.mock('@clerk/expo', () => ({
  useAuth: () => ({
    isSignedIn: true,
    userId: 'test-user-id',
    getToken: jest.fn().mockResolvedValue('mock-token'),
  }),
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
    isLoaded: true,
  }),
  useSignIn: () => ({
    signIn: { create: jest.fn() },
    isLoaded: true,
    setActive: jest.fn(),
  }),
  useSignUp: () => ({
    signUp: { create: jest.fn() },
    isLoaded: true,
    setActive: jest.fn(),
  }),
  useClerk: () => ({ signOut: jest.fn() }),
  useUserProfileModal: () => ({ presentUserProfile: jest.fn() }),
  ClerkProvider: ({ children }: { children: unknown }) => children,
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

// Mock expo-web-browser — warmUpAsync/coolDownAsync spawn timers that prevent Jest from exiting
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn().mockResolvedValue({}),
  coolDownAsync: jest.fn().mockResolvedValue({}),
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
}));

// Mock expo-auth-session (used by OAuthButton)
jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
  makeRedirectUri: jest.fn(() => 'exp://redirect'),
}));

// Mock AsyncStorage — used by sleep/streak hooks
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock useNow — returns a fixed date so tests don't get extra re-renders from
// the setInterval inside the real hook, and mockReturnValueOnce patterns stay stable.
jest.mock('@/hooks/useNow', () => ({
  useNow: () => new Date('2026-01-15T10:00:00'),
}));

// Mock DevTimeContext — no-op provider so components that call useDevTime() don't crash.
jest.mock('@/contexts/DevTimeContext', () => ({
  useDevTime: () => ({ overrideTime: null, setOverrideTime: jest.fn() }),
  DevTimeProvider: ({ children }: { children: unknown }) => children,
}));

// theme.ts calls Platform.select at module-init level; mock to avoid ordering issues.
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
