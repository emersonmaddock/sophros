import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { SelectableCard } from "@/components/ui/selectable-card";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ActivityLevel } from "@/types/onboarding";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const activityOptions: {
  value: ActivityLevel;
  title: string;
  description: string;
}[] = [
  {
    value: "sedentary",
    title: "Sedentary",
    description: "Desk job, minimal exercise",
  },
  {
    value: "lightly-active",
    title: "Lightly Active",
    description: "Light exercise 1-3 days/week",
  },
  {
    value: "moderately-active",
    title: "Moderately Active",
    description: "Moderate exercise 3-5 days/week",
  },
  {
    value: "very-active",
    title: "Very Active",
    description: "Hard exercise 6-7 days/week",
  },
];

export default function BiologicalProfile2Screen() {
  const { data, updateData, nextStep, previousStep } = useOnboarding();
  const backgroundColor = useThemeColor({}, "background");

  const handleSelect = (level: ActivityLevel) => {
    updateData({ activityLevel: level });
  };

  const handleContinue = () => {
    nextStep();
    router.push("/onboarding/dietary-preferences");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ProgressIndicator totalSteps={13} currentStep={5} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText style={styles.question}>
              How active is your typical day?
            </ThemedText>
          </View>
          <View style={styles.optionsContainer}>
            {activityOptions.map((option) => (
              <SelectableCard
                key={option.value}
                title={option.title}
                description={option.description}
                selected={data.activityLevel === option.value}
                onPress={() => handleSelect(option.value)}
              />
            ))}
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Back"
              onPress={() => {
                previousStep();
                router.back();
              }}
              variant="outline"
              fullWidth
              style={styles.backButton}
            />
            <Button
              title="Continue"
              onPress={handleContinue}
              fullWidth
              disabled={!data.activityLevel}
              style={styles.continueButton}
            />
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  container: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, marginBottom: 24 },
  question: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  optionsContainer: { flex: 1, marginBottom: 20 },
  buttonContainer: { flexDirection: "row", gap: 12, paddingVertical: 20 },
  backButton: { flex: 1 },
  continueButton: { flex: 1 },
});
