import type { ActivityLevel, UserUpdate } from '@/api/types.gen';
import { SelectionCard } from '@/components/SelectionCard';
import { ACTIVITY_LEVEL_OPTIONS, VALIDATION_RULES } from '@/constants/onboarding';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cmToFeetAndInches, feetAndInchesToCm, kgToLbs, lbsToKg } from '@/utils/units';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProfileEditForm {
  age: string;
  weight: string;
  heightCm: string;
  heightFeet: string;
  heightInches: string;
  showImperial: boolean;
  activityLevel: ActivityLevel;
}

function parseFloatOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { backendUser, loading, updateUserProfile } = useUserProfile();
  const [form, setForm] = React.useState<ProfileEditForm | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!backendUser) {
      return;
    }

    const metricHeight = backendUser.height ?? null;
    const { feet, inches } =
      metricHeight === null ? { feet: 0, inches: 0 } : cmToFeetAndInches(metricHeight);

    setForm({
      age: backendUser.age?.toString() ?? '',
      weight:
        backendUser.weight === null
          ? ''
          : backendUser.show_imperial
            ? kgToLbs(backendUser.weight).toString()
            : backendUser.weight.toString(),
      heightCm: metricHeight === null ? '' : metricHeight.toString(),
      heightFeet: metricHeight === null ? '' : feet.toString(),
      heightInches: metricHeight === null ? '' : inches.toString(),
      showImperial: backendUser.show_imperial,
      activityLevel: backendUser.activity_level,
    });
  }, [backendUser]);

  const updateForm = <K extends keyof ProfileEditForm>(key: K, value: ProfileEditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleUnitPreferenceChange = (nextImperial: boolean) => {
    setForm((prev) => {
      if (!prev || prev.showImperial === nextImperial) {
        return prev;
      }

      if (nextImperial) {
        const metricWeight = parseFloatOrNull(prev.weight);
        const metricHeight = parseFloatOrNull(prev.heightCm);
        const convertedWeight = metricWeight === null ? '' : kgToLbs(metricWeight).toString();

        if (metricHeight === null) {
          return {
            ...prev,
            showImperial: true,
            weight: convertedWeight,
            heightFeet: '',
            heightInches: '',
          };
        }

        const { feet, inches } = cmToFeetAndInches(metricHeight);
        return {
          ...prev,
          showImperial: true,
          weight: convertedWeight,
          heightFeet: feet.toString(),
          heightInches: inches.toString(),
        };
      }

      const imperialWeight = parseFloatOrNull(prev.weight);
      const convertedWeight = imperialWeight === null ? '' : lbsToKg(imperialWeight).toString();

      const hasImperialHeight =
        prev.heightFeet.trim().length > 0 || prev.heightInches.trim().length > 0;
      const parsedFeet = prev.heightFeet.trim().length > 0 ? Number.parseFloat(prev.heightFeet) : 0;
      const parsedInches =
        prev.heightInches.trim().length > 0 ? Number.parseFloat(prev.heightInches) : 0;

      const convertedHeightCm =
        hasImperialHeight && !Number.isNaN(parsedFeet) && !Number.isNaN(parsedInches)
          ? feetAndInchesToCm(parsedFeet, parsedInches).toString()
          : '';

      return {
        ...prev,
        showImperial: false,
        weight: convertedWeight,
        heightCm: convertedHeightCm,
      };
    });
  };

  const handleSave = async () => {
    if (!backendUser || !form) {
      return;
    }

    const updates: UserUpdate = {};
    const errors: string[] = [];

    const ageText = form.age.trim();
    if (!ageText) {
      errors.push('Age is required.');
    } else if (!/^\d+$/.test(ageText)) {
      errors.push('Age must be a whole number.');
    } else {
      const ageValue = Number.parseInt(ageText, 10);
      if (ageValue < VALIDATION_RULES.age.min || ageValue > VALIDATION_RULES.age.max) {
        errors.push(
          `Age must be between ${VALIDATION_RULES.age.min} and ${VALIDATION_RULES.age.max}.`
        );
      } else if (ageValue !== backendUser.age) {
        updates.age = ageValue;
      }
    }

    const enteredWeight = parseFloatOrNull(form.weight);
    if (enteredWeight === null) {
      errors.push(`Weight is required (${form.showImperial ? 'lbs' : 'kg'}).`);
    } else if (enteredWeight < 0) {
      errors.push('Weight cannot be negative.');
    } else {
      const weightKg = form.showImperial ? lbsToKg(enteredWeight) : enteredWeight;
      if (weightKg < VALIDATION_RULES.weight.min || weightKg > VALIDATION_RULES.weight.max) {
        errors.push(
          `Weight must be between ${VALIDATION_RULES.weight.min}kg and ${VALIDATION_RULES.weight.max}kg.`
        );
      } else if (Math.abs(weightKg - backendUser.weight) > 0.0001) {
        updates.weight = weightKg;
      }
    }

    let heightCm: number | null = null;

    if (form.showImperial) {
      const hasFeetInput = form.heightFeet.trim().length > 0;
      const hasInchesInput = form.heightInches.trim().length > 0;

      if (!hasFeetInput && !hasInchesInput) {
        errors.push('Height is required.');
      } else {
        const feetValue = hasFeetInput ? Number.parseFloat(form.heightFeet) : 0;
        const inchesValue = hasInchesInput ? Number.parseFloat(form.heightInches) : 0;

        if (Number.isNaN(feetValue) || Number.isNaN(inchesValue)) {
          errors.push('Height must be numeric.');
        } else if (feetValue < 0 || inchesValue < 0) {
          errors.push('Height cannot be negative.');
        } else {
          heightCm = feetAndInchesToCm(feetValue, inchesValue);
        }
      }
    } else {
      const metricHeight = parseFloatOrNull(form.heightCm);
      if (metricHeight === null) {
        errors.push('Height is required (cm).');
      } else if (metricHeight < 0) {
        errors.push('Height cannot be negative.');
      } else {
        heightCm = metricHeight;
      }
    }

    if (heightCm !== null) {
      if (heightCm < VALIDATION_RULES.height.min || heightCm > VALIDATION_RULES.height.max) {
        errors.push(
          `Height must be between ${VALIDATION_RULES.height.min}cm and ${VALIDATION_RULES.height.max}cm.`
        );
      } else if (Math.abs(heightCm - backendUser.height) > 0.0001) {
        updates.height = heightCm;
      }
    }

    if (form.activityLevel !== backendUser.activity_level) {
      updates.activity_level = form.activityLevel;
    }

    if (form.showImperial !== backendUser.show_imperial) {
      updates.show_imperial = form.showImperial;
    }

    if (errors.length > 0) {
      Alert.alert('Invalid Profile Data', errors[0]);
      return;
    }

    if (Object.keys(updates).length === 0) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      const success = await updateUserProfile(updates);

      if (success) {
        Alert.alert('Success', 'Profile updated successfully.');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while updating your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !backendUser || !form) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading profile editor...</Text>
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basics</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={form.age}
              onChangeText={(text) => updateForm('age', text)}
              keyboardType="number-pad"
              placeholder="Enter age"
              placeholderTextColor={Colors.light.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Unit Preference</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentButton, !form.showImperial && styles.segmentButtonActive]}
                onPress={() => handleUnitPreferenceChange(false)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    !form.showImperial && styles.segmentButtonTextActive,
                  ]}
                >
                  Metric
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, form.showImperial && styles.segmentButtonActive]}
                onPress={() => handleUnitPreferenceChange(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    form.showImperial && styles.segmentButtonTextActive,
                  ]}
                >
                  Imperial
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Weight ({form.showImperial ? 'lbs' : 'kg'})</Text>
            <TextInput
              style={styles.input}
              value={form.weight}
              onChangeText={(text) => updateForm('weight', text)}
              keyboardType="decimal-pad"
              placeholder={form.showImperial ? 'Enter weight in lbs' : 'Enter weight in kg'}
              placeholderTextColor={Colors.light.textMuted}
            />
          </View>

          {form.showImperial ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height</Text>
              <View style={styles.imperialHeightRow}>
                <TextInput
                  style={[styles.input, styles.imperialInput]}
                  value={form.heightFeet}
                  onChangeText={(text) => updateForm('heightFeet', text)}
                  keyboardType="decimal-pad"
                  placeholder="ft"
                  placeholderTextColor={Colors.light.textMuted}
                />
                <TextInput
                  style={[styles.input, styles.imperialInput]}
                  value={form.heightInches}
                  onChangeText={(text) => updateForm('heightInches', text)}
                  keyboardType="decimal-pad"
                  placeholder="in"
                  placeholderTextColor={Colors.light.textMuted}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={form.heightCm}
                onChangeText={(text) => updateForm('heightCm', text)}
                keyboardType="decimal-pad"
                placeholder="Enter height in cm"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Activity Level</Text>
          <View style={styles.activityList}>
            {ACTIVITY_LEVEL_OPTIONS.map((option) => (
              <SelectionCard
                key={option.value}
                title={option.label}
                description={option.description}
                selected={form.activityLevel === option.value}
                onPress={() => updateForm('activityLevel', option.value)}
              />
            ))}
          </View>
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
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  segmentedControl: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    flexDirection: 'row',
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: `${Colors.light.primary}20`,
  },
  segmentButtonText: {
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: Colors.light.primaryDark,
  },
  imperialHeightRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imperialInput: {
    flex: 1,
  },
  activityList: {
    gap: 10,
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
