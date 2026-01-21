import OAuthButton from '@/components/OAuthButton';
import { styles } from '@/constants/AuthStyles';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

function SignInScreen() {
  const router = useRouter();
  // [useSignIn hook](/docs/hooks/use-sign-in) from Clerk SDK to handle sign-in logic
  const { signIn, isLoaded, setActive } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const onSignInPress = async () => {
    if (!isLoaded || !setActive) return;

    try {
      // signIn.create() method from Clerk SDK to handle sign-in logic
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
        });
        // Navigate to protected screen once the session is created
        router.replace('/onboarding');
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter your credentials to access your account</Text>
      </View>

      {/* OAuthButton component to handle OAuth sign-in */}
      <View style={{ marginBottom: 24 }}>
        <OAuthButton strategy="oauth_google">Sign in with Google</OAuthButton>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
            value={emailAddress}
            onChangeText={(text) => setEmailAddress(text)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => setPassword(text)}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={onSignInPress} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        {/* Link to sign-up screen */}
        <TouchableOpacity
          style={styles.textButton}
          onPress={() => router.push('/sign-up')}
          activeOpacity={0.8}
        >
          <Text style={styles.textButtonText}>Don&apos;t have an account? Sign up.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default SignInScreen;
