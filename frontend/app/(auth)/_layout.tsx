import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AuthRoutesLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isOnboarded, loading } = useUser();

  // Wait for Clerk to finish loading before rendering anything.
  // The native AuthView accesses Clerk.shared on init, which crashes
  // if Clerk.configure() hasn't completed yet.
  if (!isLoaded || (isSignedIn && loading)) {
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

  // If signed in but not onboarded, go to onboarding
  if (isSignedIn && !isOnboarded) {
    return <Redirect href={'/onboarding'} />;
  }

  // Not signed in - show auth screens
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
