import OAuthButton from '@/components/OAuthButton';
import { styles } from '@/constants/AuthStyles';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoaded, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  // [useSignUp hook](/docs/hooks/use-sign-up) from Clerk SDK to handle sign-up logic
  const onSignUpPress = async () => {
    if (!isLoaded || !signUp) {
      return;
    }

    try {
      // Start by creating a new temporary user record
      await signUp.create({
        emailAddress,
        password,
      });

      // Prepare the email address verification, which will send the email a code
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
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
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/onboarding/biological-profile-1');
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  // Email verification screen
  if (pendingVerification) {
    return (
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
              value={code}
              onChangeText={(text) => setCode(text)}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={onVerifyPress} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Sign up screen
  return (
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
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
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
            value={password}
            onChangeText={(text) => setPassword(text)}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={onSignUpPress} activeOpacity={0.8}>
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
  );
}

export default SignUpScreen;
