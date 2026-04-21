/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  testPathIgnorePatterns: ['<rootDir>/__tests__/test-utils.tsx'],

  // HealthKitProvider's initAuthorization fires an unawaited promise in useEffect,
  // and React Query keeps internal timers around briefly after gc. Neither blocks test
  // correctness but both keep Jest alive for ~1s per suite. Force exit once tests finish.
  forceExit: true,

  // Ensure lucide-react-native, @tanstack, and reanimated are transformed.
  // Extends the jest-expo default to add project-specific packages.
  transformIgnorePatterns: [
    '/node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|lucide-react-native|@tanstack/.*|react-native-reanimated)',
  ],
};

module.exports = config;
