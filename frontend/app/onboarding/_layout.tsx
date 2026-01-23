import { Colors } from '@/constants/theme';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function OnboardingLayout() {
  const router = useRouter();

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
