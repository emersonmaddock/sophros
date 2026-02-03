import { Redirect } from 'expo-router';

export default function Index() {
  // Auth will handle redirecting to the correct screen
  return <Redirect href={'/(auth)/sign-up'} />;
}
