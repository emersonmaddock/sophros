import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { SelectableCard } from "@/components/ui/selectable-card";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Gender } from "@/types/onboarding";
import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export default function BiologicalProfile1Screen() {
  const { data, updateData, nextStep, previousStep } = useOnboarding();
  const backgroundColor = useThemeColor({}, "background");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!data.biologicalProfile.gender) {
      newErrors.gender = "Please select your gender";
    }
    if (
      !data.biologicalProfile.age ||
      data.biologicalProfile.age < 13 ||
      data.biologicalProfile.age > 120
    ) {
      newErrors.age = "Please enter a valid age (13-120)";
    }

    if (data.biologicalProfile.useMetric) {
      if (
        !data.biologicalProfile.heightCm ||
        data.biologicalProfile.heightCm < 50
      ) {
        newErrors.height = "Please enter a valid height";
      }
      if (
        !data.biologicalProfile.weightKg ||
        data.biologicalProfile.weightKg < 20
      ) {
        newErrors.weight = "Please enter a valid weight";
      }
    } else {
      if (
        !data.biologicalProfile.heightFeet ||
        !data.biologicalProfile.heightInches
      ) {
        newErrors.height = "Please enter a valid height";
      }
      if (
        !data.biologicalProfile.weightLbs ||
        data.biologicalProfile.weightLbs < 40
      ) {
        newErrors.weight = "Please enter a valid weight";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    nextStep();
    router.push("/onboarding/biological-profile-2");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ProgressIndicator totalSteps={13} currentStep={4} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText style={styles.question}>
              Tell us about yourself
            </ThemedText>
            <ThemedText style={styles.helperText}>
              We use these to calculate your personalized nutrition needs based
              on USDA guidelines.
            </ThemedText>
          </View>

          <View style={styles.formContainer}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            {genderOptions.map((option) => (
              <SelectableCard
                key={option.value}
                title={option.label}
                selected={data.biologicalProfile.gender === option.value}
                onPress={() =>
                  updateData({
                    biologicalProfile: {
                      ...data.biologicalProfile,
                      gender: option.value,
                    },
                  })
                }
                style={styles.genderCard}
              />
            ))}
            {errors.gender && (
              <ThemedText style={styles.errorText}>{errors.gender}</ThemedText>
            )}

            <InputField
              label="Age"
              keyboardType="numeric"
              placeholder="Enter your age"
              value={data.biologicalProfile.age?.toString() || ""}
              onChangeText={(text) => {
                const age = parseInt(text, 10);
                updateData({
                  biologicalProfile: {
                    ...data.biologicalProfile,
                    age: isNaN(age) ? null : age,
                  },
                });
              }}
              error={errors.age}
            />

            <View style={styles.unitToggle}>
              <Button
                title="Imperial"
                onPress={() =>
                  updateData({
                    biologicalProfile: {
                      ...data.biologicalProfile,
                      useMetric: false,
                    },
                  })
                }
                variant={
                  !data.biologicalProfile.useMetric ? "primary" : "outline"
                }
                style={styles.toggleButton}
              />
              <Button
                title="Metric"
                onPress={() =>
                  updateData({
                    biologicalProfile: {
                      ...data.biologicalProfile,
                      useMetric: true,
                    },
                  })
                }
                variant={
                  data.biologicalProfile.useMetric ? "primary" : "outline"
                }
                style={styles.toggleButton}
              />
            </View>

            {!data.biologicalProfile.useMetric ? (
              <>
                <View style={styles.heightRow}>
                  <InputField
                    label="Height (feet)"
                    keyboardType="numeric"
                    placeholder="Feet"
                    value={data.biologicalProfile.heightFeet?.toString() || ""}
                    onChangeText={(text) => {
                      const feet = parseInt(text, 10);
                      updateData({
                        biologicalProfile: {
                          ...data.biologicalProfile,
                          heightFeet: isNaN(feet) ? null : feet,
                        },
                      });
                    }}
                    style={styles.heightInput}
                  />
                  <InputField
                    label="(inches)"
                    keyboardType="numeric"
                    placeholder="Inches"
                    value={
                      data.biologicalProfile.heightInches?.toString() || ""
                    }
                    onChangeText={(text) => {
                      const inches = parseInt(text, 10);
                      updateData({
                        biologicalProfile: {
                          ...data.biologicalProfile,
                          heightInches: isNaN(inches) ? null : inches,
                        },
                      });
                    }}
                    style={styles.heightInput}
                  />
                </View>
                {errors.height && (
                  <ThemedText style={styles.errorText}>
                    {errors.height}
                  </ThemedText>
                )}

                <InputField
                  label="Weight (lbs)"
                  keyboardType="numeric"
                  placeholder="Enter your weight"
                  value={data.biologicalProfile.weightLbs?.toString() || ""}
                  onChangeText={(text) => {
                    const weight = parseFloat(text);
                    updateData({
                      biologicalProfile: {
                        ...data.biologicalProfile,
                        weightLbs: isNaN(weight) ? null : weight,
                      },
                    });
                  }}
                  error={errors.weight}
                />
              </>
            ) : (
              <>
                <InputField
                  label="Height (cm)"
                  keyboardType="numeric"
                  placeholder="Enter your height"
                  value={data.biologicalProfile.heightCm?.toString() || ""}
                  onChangeText={(text) => {
                    const height = parseInt(text, 10);
                    updateData({
                      biologicalProfile: {
                        ...data.biologicalProfile,
                        heightCm: isNaN(height) ? null : height,
                      },
                    });
                  }}
                  error={errors.height}
                />

                <InputField
                  label="Weight (kg)"
                  keyboardType="numeric"
                  placeholder="Enter your weight"
                  value={data.biologicalProfile.weightKg?.toString() || ""}
                  onChangeText={(text) => {
                    const weight = parseFloat(text);
                    updateData({
                      biologicalProfile: {
                        ...data.biologicalProfile,
                        weightKg: isNaN(weight) ? null : weight,
                      },
                    });
                  }}
                  error={errors.weight}
                />
              </>
            )}
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
              style={styles.continueButton}
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
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  genderCard: {
    marginVertical: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#dc3545",
    marginTop: 4,
  },
  unitToggle: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 16,
  },
  toggleButton: {
    flex: 1,
  },
  heightRow: {
    flexDirection: "row",
    gap: 12,
  },
  heightInput: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 20,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 1,
  },
});
