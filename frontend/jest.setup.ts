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
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

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
jest.mock('@clerk/clerk-expo', () => ({
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
