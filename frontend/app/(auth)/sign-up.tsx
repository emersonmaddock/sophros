import OAuthButton from '@/components/OAuthButton';
import { styles } from '@/constants/AuthStyles';
import { Colors } from '@/constants/theme';
import { useSignUp } from '@clerk/clerk-expo';
import type { ClerkAPIResponseError } from '@clerk/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoaded, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function isClerkAPIResponseError(err: unknown): err is ClerkAPIResponseError {
    return (
      typeof err === 'object' &&
      err !== null &&
      'errors' in err &&
      Array.isArray((err as ClerkAPIResponseError).errors)
    );
  }

  // [useSignUp hook](/docs/hooks/use-sign-up) from Clerk SDK to handle sign-up logic
  const onSignUpPress = async () => {
    if (!isLoaded || !signUp) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Start by creating a new temporary user record
      await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName,
      });

      // Prepare the email address verification, which will send the email a code
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setPendingVerification(true);
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

  const onVerifyPress = async () => {
    if (!isLoaded || !signUp) {
      return;
    }

    try {
      // Attempt to verify the email address using the provided code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        // If the sign-up is complete, set the active session and navigate to the protected screen
        await setActive({
          session: completeSignUp.createdSessionId
        });
      } else {
        console.error(completeSignUp);
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

              <TouchableOpacity
                style={styles.button}
                onPress={onVerifyPress}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Sign up screen
  return (
    <SafeAreaView style={localStyles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
        <View style={styles.formContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>Create your account to get started</Text>
          </View>

          {/* OAuthButton component can also be used to create accounts */}
          <View style={{ marginBottom: 24 }}>
            <OAuthButton strategy="oauth_google">Sign in with Google</OAuthButton>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                placeholderTextColor={Colors.light.textMuted}
                value={firstName}
                onChangeText={(text) => setFirstName(text)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your last name"
                placeholderTextColor={Colors.light.textMuted}
                value={lastName}
                onChangeText={(text) => setLastName(text)}
                autoCapitalize="words"
              />
            </View>

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
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor={Colors.light.textMuted}
                value={password}
                onChangeText={(text) => setPassword(text)}
                secureTextEntry
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={onSignUpPress}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
              onPress={() => router.push('/sign-in')}
              activeOpacity={0.8}
            >
              <Text style={styles.textButtonText}>Already have an account? Sign in.</Text>
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

export default SignUpScreen;
