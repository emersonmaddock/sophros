import type { Allergy, Cuisine } from '@/api/types.gen';
import { ChipSelect } from '@/components/ChipSelect';
import { ALL_ALLERGIES, ALL_CUISINES, DIET_OPTIONS } from '@/constants/dietary';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIET_KEY_MAP: Record<string, keyof DietFlags> = {
  is_gluten_free: 'isGlutenFree',
  is_ketogenic: 'isKetogenic',
  is_vegetarian: 'isVegetarian',
  is_vegan: 'isVegan',
  is_pescatarian: 'isPescatarian',
};

type DietFlags = {
  isGlutenFree: boolean;
  isKetogenic: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isPescatarian: boolean;
};

export default function Step6Screen() {
  const { data, updateField, loading, error: apiError, submit } = useOnboarding();

  const toggleAllergy = (allergy: string) => {
    const a = allergy as Allergy;
    const updated = data.allergies.includes(a)
      ? data.allergies.filter((x) => x !== a)
      : [...data.allergies, a];
    updateField('allergies', updated);
  };

  const toggleIncludeCuisine = (cuisine: string) => {
    const c = cuisine as Cuisine;
    const updated = data.includeCuisine.includes(c)
      ? data.includeCuisine.filter((x) => x !== c)
      : [...data.includeCuisine, c];
    updateField('includeCuisine', updated);
  };

  const toggleExcludeCuisine = (cuisine: string) => {
    const c = cuisine as Cuisine;
    const updated = data.excludeCuisine.includes(c)
      ? data.excludeCuisine.filter((x) => x !== c)
      : [...data.excludeCuisine, c];
    updateField('excludeCuisine', updated);
  };

  const toggleDietFlag = (key: keyof DietFlags) => {
    updateField(key, !data[key]);
  };

  const handleSubmit = async () => {
    const success = await submit();
    if (success) {
      router.replace('/onboarding/done');
    } else if (apiError) {
      Alert.alert('Error', apiError);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 6 of 6</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Dietary Preferences</Text>
          <Text style={styles.subtitle}>
            Help us personalize your meal plans. All fields are optional.
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Allergies</Text>
            <ChipSelect
              options={ALL_ALLERGIES}
              selected={data.allergies}
              onToggle={toggleAllergy}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Diet Type</Text>
            {DIET_OPTIONS.map((option) => {
              const formKey = DIET_KEY_MAP[option.key];
              return (
                <View key={option.key} style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{option.label}</Text>
                  <Switch
                    value={data[formKey]}
                    onValueChange={() => toggleDietFlag(formKey)}
                    trackColor={{
                      false: '#E5E7EB',
                      true: `${Colors.light.primary}60`,
                    }}
                    thumbColor={data[formKey] ? Colors.light.primary : '#f4f3f4'}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Include Cuisines</Text>
            <Text style={styles.sectionHint}>Select cuisines you enjoy</Text>
            <ChipSelect
              options={ALL_CUISINES}
              selected={data.includeCuisine}
              onToggle={toggleIncludeCuisine}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Exclude Cuisines</Text>
            <Text style={styles.sectionHint}>Select cuisines to avoid</Text>
            <ChipSelect
              options={ALL_CUISINES}
              selected={data.excludeCuisine}
              onToggle={toggleExcludeCuisine}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.light.surface} />
          ) : (
            <Text style={styles.submitButtonText}>Complete Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.surface,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textMuted,
    lineHeight: 22,
  },
  content: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    gap: 12,
    ...Shadows.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: -8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.background,
    ...Shadows.card,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.light.textMuted,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.surface,
  },
});
