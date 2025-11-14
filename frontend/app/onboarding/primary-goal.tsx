import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { SelectableCard } from '@/components/ui/selectable-card';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PrimaryGoal } from '@/types/onboarding';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const goalOptions: { value: PrimaryGoal; icon: string; title: string }[] = [
  { value: 'build-muscle', icon: '🏋️', title: 'Build muscle & strength' },
  { value: 'lose-weight', icon: '⚖️', title: 'Lose weight healthily' },
  { value: 'maintain-health', icon: '🎯', title: 'Maintain current health' },
  { value: 'increase-energy', icon: '⚡', title: 'Increase energy levels' },
  { value: 'improve-fitness', icon: '💪', title: 'Improve overall fitness' },
  { value: 'eat-nutritiously', icon: '🍎', title: 'Eat more nutritiously' },
];

export default function PrimaryGoalScreen() {
  const { data, updateData, nextStep } = useOnboarding();
  const backgroundColor = useThemeColor({}, 'background');

  const handleSelect = (goal: PrimaryGoal) => {
    updateData({ primaryGoal: goal });
  };

  const handleContinue = () => {
    nextStep();
    router.push('/onboarding/biological-profile-1');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ProgressIndicator totalSteps={13} currentStep={3} />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText style={styles.question}>
              What brings you to Sophros?
            </ThemedText>
          </View>

          <View style={styles.optionsContainer}>
            {goalOptions.map((option) => (
              <SelectableCard
                key={option.value}
                title={option.title}
                icon={option.icon}
                selected={data.primaryGoal === option.value}
                onPress={() => handleSelect(option.value)}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Continue"
              onPress={handleContinue}
              fullWidth
              disabled={!data.primaryGoal}
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
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  buttonContainer: {
    paddingVertical: 20,
  },
});
