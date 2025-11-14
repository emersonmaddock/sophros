import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { OnboardingProvider } from '@/contexts/onboarding-context';

export const unstable_settings = {
  initialRouteName: 'onboarding',
};

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </OnboardingProvider>
  );
}
