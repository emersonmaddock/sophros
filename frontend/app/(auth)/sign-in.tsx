import OAuthButton from '@/components/OAuthButton';
import { styles } from '@/constants/AuthStyles';
import { Colors } from '@/constants/theme';
import { useSignIn } from '@clerk/clerk-expo';
import type { ClerkAPIResponseError, EmailCodeFactor } from '@clerk/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function isClerkAPIResponseError(err: unknown): err is ClerkAPIResponseError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errors' in err &&
    Array.isArray((err as ClerkAPIResponseError).errors)
  );
}

function SignInScreen() {
  const router = useRouter();
  // [useSignIn hook](/docs/hooks/use-sign-in) from Clerk SDK to handle sign-in logic
  const { signIn, isLoaded, setActive } = useSignIn();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const onSignInPress = async () => {
    if (!isLoaded || !setActive) return;

    try {
      setLoading(true);
      setError('');

      // signIn.create() method from Clerk SDK to handle sign-in logic
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
        });

        // Auth layout will handle routing based on onboarding status
      } else if (signInAttempt.status === 'needs_second_factor') {
        // Check if email_code is a valid second factor
        // This is required when Client Trust is enabled and the user
        // is signing in from a new device.
        // See https://clerk.com/docs/guides/secure/client-trust
        const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
          (factor): factor is EmailCodeFactor => factor.strategy === 'email_code'
        );

        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setPendingVerification(true);
        }
      } else {
        console.error(signInAttempt);
      }
    } catch (err: unknown) {
      console.log(JSON.stringify(err, null, 2));
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0].longMessage || 'An error occurred');
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded || !signIn) {
      return;
    }

    try {
      // Attempt to verify the email address using the provided code
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      });

      if (signInAttempt.status === 'complete') {
        // If verification is complete, set the active session
        await setActive({
          session: signInAttempt.createdSessionId,
        });

        // Auth layout will handle routing based on onboarding status
      } else {
        console.error(signInAttempt);
      }
    } catch (err: unknown) {
      console.error(err);
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0].longMessage || 'An error occurred');
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email verification screen
  if (pendingVerification) {
    return (
      <SafeAreaView style={localStyles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={localStyles.scrollContent}>
          <View style={styles.formContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>
                Enter the verification code sent to your email address
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter the verification code"
                  placeholderTextColor={Colors.light.textMuted}
                  value={code}
                  onChangeText={(text) => setCode(text)}
                />
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity style={styles.button} onPress={onVerifyPress} activeOpacity={0.8}>
                <Text style={styles.buttonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={localStyles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
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
                placeholderTextColor={Colors.light.textMuted}
                value={emailAddress}
                onChangeText={(text) => setEmailAddress(text)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.light.textMuted}
                value={password}
                onChangeText={(text) => setPassword(text)}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={onSignInPress}
              activeOpacity={0.8}
              disabled={loading}
            >
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
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
});

export default SignInScreen;
