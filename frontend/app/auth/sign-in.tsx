import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const backgroundColor = useThemeColor({}, 'background');

  const handleSignIn = () => {
    // This will be replaced with Clerk authentication
    router.replace('/onboarding/primary-goal');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText style={styles.icon}>🔐</ThemedText>
          <ThemedText style={styles.title}>Sign In</ThemedText>
          <ThemedText style={styles.subtitle}>
            Authentication placeholder
          </ThemedText>
          <ThemedText style={styles.note}>
            Clerk authentication will be integrated here
          </ThemedText>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Continue with Google"
            onPress={handleSignIn}
            fullWidth
            style={styles.button}
          />
          <Button
            title="Continue with Apple"
            onPress={handleSignIn}
            fullWidth
            style={styles.button}
          />
          <Button
            title="Continue with Email"
            onPress={handleSignIn}
            variant="outline"
            fullWidth
            style={styles.button}
          />
          <Button
            title="Go Back"
            onPress={handleGoBack}
            variant="outline"
            fullWidth
          />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
});
