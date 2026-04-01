import { AuthView } from '@clerk/expo/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AuthView mode="signInOrUp" />
    </SafeAreaView>
  );
}
