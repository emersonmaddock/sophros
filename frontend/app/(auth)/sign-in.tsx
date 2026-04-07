import { AuthView } from '@clerk/expo/native';

export default function SignInScreen() {
  return <AuthView mode="signInOrUp" />;
}
