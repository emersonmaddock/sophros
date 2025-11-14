import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { DietaryRestriction } from '@/types/onboarding';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const restrictionOptions: { value: DietaryRestriction; icon: string; label: string }[] = [
  { value: 'vegetarian', icon: '🥬', label: 'Vegetarian' },
  { value: 'vegan', icon: '🌱', label: 'Vegan' },
  { value: 'pescatarian', icon: '🐟', label: 'Pescatarian' },
  { value: 'gluten-free', icon: '🌾', label: 'Gluten-free' },
  { value: 'dairy-free', icon: '🥛', label: 'Dairy-free' },
  { value: 'nut-allergies', icon: '🥜', label: 'Nut allergies' },
  { value: 'no-restrictions', icon: '✨', label: 'No restrictions' },
];

export default function DietaryPreferencesScreen() {
  const { data, updateData, nextStep, previousStep } = useOnboarding();
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'tint');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const toggleRestriction = (restriction: DietaryRestriction) => {
    const current = data.dietaryRestrictions;
    
    if (restriction === 'no-restrictions') {
      updateData({ dietaryRestrictions: ['no-restrictions'] });
      return;
    }
    
    const filtered = current.filter((r) => r !== 'no-restrictions');
    
    if (filtered.includes(restriction)) {
      updateData({
        dietaryRestrictions: filtered.filter((r) => r !== restriction),
      });
    } else {
      updateData({
        dietaryRestrictions: [...filtered, restriction],
      });
    }
  };

  const handleContinue = () => {
    nextStep();
    // router.push('/onboarding/schedule-context');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ProgressIndicator totalSteps={13} currentStep={6} />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText style={styles.question}>
              Any dietary preferences or restrictions?
            </ThemedText>
          </View>

          <View style={styles.chipsContainer}>
            {restrictionOptions.map((option) => {
              const isSelected = data.dietaryRestrictions.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? primaryColor : backgroundColor,
                      borderColor: isSelected ? primaryColor : '#e0e0e0',
                    },
                  ]}
                  onPress={() => toggleRestriction(option.value)}
                >
                  <ThemedText style={styles.chipIcon}>{option.icon}</ThemedText>
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#ffffff' : undefined },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.otherButton}
            onPress={() => setShowOtherInput(!showOtherInput)}
          >
            <ThemedText style={styles.otherButtonText}>
              {showOtherInput ? '− Hide other restrictions' : '+ I have other restrictions'}
            </ThemedText>
          </TouchableOpacity>

          {showOtherInput && (
            <InputField
              placeholder="Enter other restrictions..."
              value={data.otherRestrictions}
              onChangeText={(text) => updateData({ otherRestrictions: text })}
              multiline
              numberOfLines={3}
              style={styles.otherInput}
            />
          )}

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
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
  },
  chipIcon: {
    fontSize: 18,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  otherButton: {
    padding: 12,
    alignItems: 'center',
  },
  otherButtonText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  otherInput: {
    marginTop: 12,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 20,
    marginTop: 'auto',
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 1,
  },
});
