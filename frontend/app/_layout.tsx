import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { queryClient } from '@/config/queryClient';
import { ConfirmationsProvider } from '@/contexts/ConfirmationsContext';
import { DevTimeProvider } from '@/contexts/DevTimeContext';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { HealthKitProvider } from '@/lib/healthkit';
import { UserProvider } from '@/contexts/UserContext';
import { client } from '../api/client.gen';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
  );
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Configure the client with base URL
client.setConfig({
  baseUrl: API_BASE_URL,
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DevTimeProvider>
        <ConfirmationsProvider>
          <QueryClientProvider client={queryClient}>
            <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
              <UserProvider>
                <OnboardingProvider>
                  <HealthKitProvider>
                    <BottomSheetModalProvider>
                      <ThemeProvider value={DefaultTheme}>
                        <Stack>
                          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                          <Stack.Screen name="index" options={{ headerShown: false }} />
                          <Stack.Screen name="welcome" options={{ headerShown: false }} />
                          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                          <Stack.Screen name="week-planning" options={{ headerShown: false }} />
                          <Stack.Screen name="health-score" options={{ headerShown: false }} />
                          <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
                          <Stack.Screen
                            name="profile/dietary-preferences"
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen name="profile/health" options={{ headerShown: false }} />
                        </Stack>
                        <StatusBar style="dark" />
                      </ThemeProvider>
                    </BottomSheetModalProvider>
                  </HealthKitProvider>
                </OnboardingProvider>
              </UserProvider>
            </ClerkProvider>
          </QueryClientProvider>
        </ConfirmationsProvider>
      </DevTimeProvider>
    </GestureHandlerRootView>
  );
}
