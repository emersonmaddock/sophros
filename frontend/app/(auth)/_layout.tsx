import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    // For now, redirect to onboarding
    // TODO: redirect to tabs if user data exists
    // Or, redirect to tabs then back to onboarding if user data doesn't exist
    return <Redirect href={'/(tabs)'} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
