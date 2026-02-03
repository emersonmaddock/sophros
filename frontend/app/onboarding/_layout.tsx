import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

export default function OnboardingLayout() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { isOnboarded, loading } = useUser();

  // Redirect to auth if session expires for whatever reason
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Show loading while checking user status
  if (isSignedIn && loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If signed in and onboarded, go to main app
  if (isSignedIn && isOnboarded) {
    return <Redirect href={'/(tabs)'} />;
  }

  // Needs onboarding
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: 'Onboarding',
          headerTransparent: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingLeft: 4, paddingTop: 4 }}
            >
              <ChevronLeft size={28} color={Colors.light.text} />
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="step1" />
        <Stack.Screen name="step2" />
        <Stack.Screen name="step3" />
        <Stack.Screen name="step4" />
        <Stack.Screen name="done" options={{ headerShown: false }} />
      </Stack>
    </OnboardingProvider>
  );
}
