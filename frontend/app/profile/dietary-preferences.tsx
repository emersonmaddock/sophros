import type { Allergy, Cuisine, UserUpdate } from '@/api/types.gen';
import { ChipSelect } from '@/components/ChipSelect';
import { ALL_ALLERGIES, ALL_CUISINES, DIET_OPTIONS } from '@/constants/dietary';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
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

interface DietaryForm {
  allergies: Allergy[];
  includeCuisine: Cuisine[];
  excludeCuisine: Cuisine[];
  isGlutenFree: boolean;
  isKetogenic: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isPescatarian: boolean;
}

type DietFlagKey = 'isGlutenFree' | 'isKetogenic' | 'isVegetarian' | 'isVegan' | 'isPescatarian';

const DIET_KEY_MAP: Record<string, DietFlagKey> = {
  is_gluten_free: 'isGlutenFree',
  is_ketogenic: 'isKetogenic',
  is_vegetarian: 'isVegetarian',
  is_vegan: 'isVegan',
  is_pescatarian: 'isPescatarian',
};

const DIET_API_KEY_MAP: Record<DietFlagKey, keyof UserUpdate> = {
  isGlutenFree: 'is_gluten_free',
  isKetogenic: 'is_ketogenic',
  isVegetarian: 'is_vegetarian',
  isVegan: 'is_vegan',
  isPescatarian: 'is_pescatarian',
};

export default function DietaryPreferencesScreen() {
  const router = useRouter();
  const { backendUser, loading, updateUserProfile } = useUserProfile();
  const [form, setForm] = React.useState<DietaryForm | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!backendUser) return;

    setForm({
      allergies: (backendUser.allergies as Allergy[]) ?? [],
      includeCuisine: (backendUser.include_cuisine as Cuisine[]) ?? [],
      excludeCuisine: (backendUser.exclude_cuisine as Cuisine[]) ?? [],
      isGlutenFree: backendUser.is_gluten_free ?? false,
      isKetogenic: backendUser.is_ketogenic ?? false,
      isVegetarian: backendUser.is_vegetarian ?? false,
      isVegan: backendUser.is_vegan ?? false,
      isPescatarian: backendUser.is_pescatarian ?? false,
    });
  }, [backendUser]);

  const toggleAllergy = (allergy: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const a = allergy as Allergy;
      const allergies = prev.allergies.includes(a)
        ? prev.allergies.filter((x) => x !== a)
        : [...prev.allergies, a];
      return { ...prev, allergies };
    });
  };

  const toggleIncludeCuisine = (cuisine: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const c = cuisine as Cuisine;
      const includeCuisine = prev.includeCuisine.includes(c)
        ? prev.includeCuisine.filter((x) => x !== c)
        : [...prev.includeCuisine, c];
      return { ...prev, includeCuisine };
    });
  };

  const toggleExcludeCuisine = (cuisine: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const c = cuisine as Cuisine;
      const excludeCuisine = prev.excludeCuisine.includes(c)
        ? prev.excludeCuisine.filter((x) => x !== c)
        : [...prev.excludeCuisine, c];
      return { ...prev, excludeCuisine };
    });
  };

  const toggleDietFlag = (key: DietFlagKey) => {
    setForm((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  };

  const arraysEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
  };

  const handleSave = async () => {
    if (!backendUser || !form) return;

    const updates: UserUpdate = {};

    const backendAllergies = (backendUser.allergies as Allergy[]) ?? [];
    if (!arraysEqual(form.allergies, backendAllergies)) {
      updates.allergies = form.allergies;
    }

    const backendInclude = (backendUser.include_cuisine as Cuisine[]) ?? [];
    if (!arraysEqual(form.includeCuisine, backendInclude)) {
      updates.include_cuisine = form.includeCuisine;
    }

    const backendExclude = (backendUser.exclude_cuisine as Cuisine[]) ?? [];
    if (!arraysEqual(form.excludeCuisine, backendExclude)) {
      updates.exclude_cuisine = form.excludeCuisine;
    }

    for (const option of DIET_OPTIONS) {
      const formKey = DIET_KEY_MAP[option.key];
      const apiKey = DIET_API_KEY_MAP[formKey];
      const backendValue = (backendUser as Record<string, unknown>)[option.key] ?? false;
      if (form[formKey] !== backendValue) {
        (updates as Record<string, unknown>)[apiKey] = form[formKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      const success = await updateUserProfile(updates);
      if (success) {
        Alert.alert('Success', 'Dietary preferences updated.');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update preferences. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !backendUser || !form) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dietary Preferences</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <ChipSelect options={ALL_ALLERGIES} selected={form.allergies} onToggle={toggleAllergy} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Diet Type</Text>
          {DIET_OPTIONS.map((option) => {
            const formKey = DIET_KEY_MAP[option.key];
            return (
              <View key={option.key} style={styles.switchRow}>
                <Text style={styles.switchLabel}>{option.label}</Text>
                <Switch
                  value={form[formKey]}
                  onValueChange={() => toggleDietFlag(formKey)}
                  trackColor={{
                    false: '#E5E7EB',
                    true: `${Colors.light.primary}60`,
                  }}
                  thumbColor={form[formKey] ? Colors.light.primary : '#f4f3f4'}
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
            selected={form.includeCuisine}
            onToggle={toggleIncludeCuisine}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Exclude Cuisines</Text>
          <Text style={styles.sectionHint}>Select cuisines to avoid</Text>
          <ChipSelect
            options={ALL_CUISINES}
            selected={form.excludeCuisine}
            onToggle={toggleExcludeCuisine}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={Colors.light.surface} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    ...Shadows.card,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.light.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
