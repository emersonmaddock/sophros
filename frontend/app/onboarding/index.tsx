import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <View style={styles.logoContainer}>
            {/* <ThemedText style={styles.logo}>🌊</ThemedText> */}
            <ThemedText style={styles.logoText}>Sophros</ThemedText>
          </View>

          <View style={styles.content}>
            <ThemedText style={styles.headline}>
              Your Personal Health Planner
            </ThemedText>
            
            <ThemedText style={styles.subtext}>
              Stop tracking. Start planning. We&apos;ll create your optimal schedule for meals, workouts, and sleep.
            </ThemedText>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Get Started"
              onPress={() => router.push('/onboarding/primary-goal')}
              fullWidth
            />
            
            <Button
              title="Sign In"
              onPress={() => router.push('/auth/sign-in')}
              variant="outline"
              fullWidth
              style={styles.secondaryButton}
            />
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headline: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  buttonContainer: {
    gap: 12,
  },
  secondaryButton: {
    marginTop: 4,
  },
});
