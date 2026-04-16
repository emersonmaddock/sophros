import type { ActivityLevel, BusyTime, Day, UserUpdate } from '@/api/types.gen';
import { DatePickerInput } from '@/components/DatePickerInput';
import { SelectionCard } from '@/components/SelectionCard';
import { TimePickerInput } from '@/components/TimePickerInput';
import { ACTIVITY_LEVEL_OPTIONS, VALIDATION_RULES } from '@/constants/onboarding';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useLogWeight } from '@/lib/healthkit';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getSleepWarning } from '@/utils/sleep-validation';
import { cmToFeetAndInches, feetAndInchesToCm, kgToLbs, lbsToKg } from '@/utils/units';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BusyTimeEntry {
  day: Day;
  start: string;
  end: string;
}

interface ProfileEditForm {
  age: string;
  weight: string;
  heightCm: string;
  heightFeet: string;
  heightInches: string;
  showImperial: boolean;
  activityLevel: ActivityLevel;
  targetWeight: string;
  targetBodyFat: string;
  targetDate: string;
  wakeUpTime: string;
  sleepTime: string;
  busyTimes: BusyTimeEntry[];
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
  const logWeight = useLogWeight();
  const [form, setForm] = React.useState<ProfileEditForm | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!backendUser) {
      return;
    }

    const metricHeight = backendUser.height ?? null;
    const { feet, inches } =
      metricHeight === null ? { feet: 0, inches: 0 } : cmToFeetAndInches(metricHeight);

    const targetWeightKg = backendUser.target_weight ?? null;
    const displayTargetWeight =
      targetWeightKg === null
        ? ''
        : backendUser.show_imperial
          ? kgToLbs(targetWeightKg).toString()
          : targetWeightKg.toString();

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
      targetWeight: displayTargetWeight,
      targetBodyFat: backendUser.target_body_fat?.toString() ?? '',
      targetDate: backendUser.target_date ?? '',
      wakeUpTime: backendUser.wake_up_time ? backendUser.wake_up_time.substring(0, 5) : '',
      sleepTime: backendUser.sleep_time ? backendUser.sleep_time.substring(0, 5) : '',
      busyTimes: (backendUser.busy_times ?? []).map((bt: BusyTime) => ({
        day: bt.day ?? 'Monday',
        start: bt.start ? bt.start.substring(0, 5) : '09:00',
        end: bt.end ? bt.end.substring(0, 5) : '17:00',
      })),
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
        const metricTargetWeight = parseFloatOrNull(prev.targetWeight);
        const convertedWeight = metricWeight === null ? '' : kgToLbs(metricWeight).toString();
        const convertedTargetWeight =
          metricTargetWeight === null ? '' : kgToLbs(metricTargetWeight).toString();

        if (metricHeight === null) {
          return {
            ...prev,
            showImperial: true,
            weight: convertedWeight,
            targetWeight: convertedTargetWeight,
            heightFeet: '',
            heightInches: '',
          };
        }

        const { feet, inches } = cmToFeetAndInches(metricHeight);
        return {
          ...prev,
          showImperial: true,
          weight: convertedWeight,
          targetWeight: convertedTargetWeight,
          heightFeet: feet.toString(),
          heightInches: inches.toString(),
        };
      }

      const imperialWeight = parseFloatOrNull(prev.weight);
      const imperialTargetWeight = parseFloatOrNull(prev.targetWeight);
      const convertedWeight = imperialWeight === null ? '' : lbsToKg(imperialWeight).toString();
      const convertedTargetWeight =
        imperialTargetWeight === null ? '' : lbsToKg(imperialTargetWeight).toString();

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
        targetWeight: convertedTargetWeight,
        heightCm: convertedHeightCm,
      };
    });
  };

  const DAYS: Day[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const addBusyTime = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            busyTimes: [...prev.busyTimes, { day: 'Monday' as Day, start: '09:00', end: '17:00' }],
          }
        : prev
    );
  };

  const removeBusyTime = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.busyTimes];
      next.splice(index, 1);
      return { ...prev, busyTimes: next };
    });
  };

  const updateBusyTime = (
    index: number,
    field: keyof BusyTimeEntry,
    value: BusyTimeEntry[keyof BusyTimeEntry]
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.busyTimes];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, busyTimes: next };
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

    // Target weight
    const targetWeightText = form.targetWeight.trim();
    if (targetWeightText) {
      const enteredTargetWeight = parseFloatOrNull(targetWeightText);
      if (enteredTargetWeight === null || enteredTargetWeight <= 0) {
        errors.push('Target weight must be a positive number.');
      } else {
        const targetWeightKg = form.showImperial
          ? lbsToKg(enteredTargetWeight)
          : enteredTargetWeight;
        if (
          targetWeightKg < VALIDATION_RULES.weight.min ||
          targetWeightKg > VALIDATION_RULES.weight.max
        ) {
          errors.push(
            `Target weight must be between ${VALIDATION_RULES.weight.min}kg and ${VALIDATION_RULES.weight.max}kg.`
          );
        } else {
          const backendTargetWeight = backendUser.target_weight ?? 0;
          if (Math.abs(targetWeightKg - backendTargetWeight) > 0.0001) {
            updates.target_weight = targetWeightKg;
          }
        }
      }
    } else if (backendUser.target_weight != null) {
      updates.target_weight = null;
    }

    // Target body fat
    const targetBodyFatText = form.targetBodyFat.trim();
    if (targetBodyFatText) {
      const bodyFat = parseFloatOrNull(targetBodyFatText);
      if (bodyFat === null || bodyFat < 3 || bodyFat > 60) {
        errors.push('Target body fat must be between 3% and 60%.');
      } else {
        const backendBodyFat = backendUser.target_body_fat ?? 0;
        if (Math.abs(bodyFat - backendBodyFat) > 0.0001) {
          updates.target_body_fat = bodyFat;
        }
      }
    } else if (backendUser.target_body_fat != null) {
      updates.target_body_fat = null;
    }

    // Target date
    const targetDateText = form.targetDate.trim();
    if (targetDateText) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateText)) {
        errors.push('Target date must be in YYYY-MM-DD format.');
      } else if (targetDateText !== (backendUser.target_date ?? '')) {
        updates.target_date = targetDateText;
      }
    } else if (backendUser.target_date != null) {
      updates.target_date = null;
    }

    // Wake up time
    const wakeUpText = form.wakeUpTime.trim();
    if (wakeUpText) {
      if (!/^\d{2}:\d{2}$/.test(wakeUpText)) {
        errors.push('Wake up time must be in HH:MM format.');
      } else {
        const backendWake = backendUser.wake_up_time
          ? backendUser.wake_up_time.substring(0, 5)
          : '';
        if (wakeUpText !== backendWake) {
          updates.wake_up_time = `${wakeUpText}:00`;
        }
      }
    } else if (backendUser.wake_up_time) {
      updates.wake_up_time = null;
    }

    // Sleep time
    const sleepText = form.sleepTime.trim();
    if (sleepText) {
      if (!/^\d{2}:\d{2}$/.test(sleepText)) {
        errors.push('Sleep time must be in HH:MM format.');
      } else {
        const backendSleep = backendUser.sleep_time ? backendUser.sleep_time.substring(0, 5) : '';
        if (sleepText !== backendSleep) {
          updates.sleep_time = `${sleepText}:00`;
        }
      }
    } else if (backendUser.sleep_time) {
      updates.sleep_time = null;
    }

    // Busy times
    const timeRegex = /^\d{2}:\d{2}$/;
    const validDays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    for (let i = 0; i < form.busyTimes.length; i++) {
      const bt = form.busyTimes[i];
      if (!validDays.includes(bt.day)) {
        errors.push(`Busy time #${i + 1}: invalid day.`);
      }
      if (!timeRegex.test(bt.start) || !timeRegex.test(bt.end)) {
        errors.push(`Busy time #${i + 1}: start and end must be HH:MM.`);
      } else if (bt.start >= bt.end) {
        errors.push(`Busy time #${i + 1}: start must be before end.`);
      }
    }

    const apiBusyTimes = form.busyTimes.map((bt) => ({
      day: bt.day,
      start: `${bt.start}:00`,
      end: `${bt.end}:00`,
    }));
    const backendBusyTimes = (backendUser.busy_times ?? []).map((bt: BusyTime) => ({
      day: bt.day ?? 'Monday',
      start: bt.start ?? '09:00:00',
      end: bt.end ?? '17:00:00',
    }));
    if (JSON.stringify(apiBusyTimes) !== JSON.stringify(backendBusyTimes)) {
      updates.busy_times = apiBusyTimes;
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
        if (typeof updates.weight === 'number') {
          try {
            await logWeight.mutateAsync({
              weightKg: updates.weight,
              recordedAtISO: new Date().toISOString(),
            });
          } catch (err) {
            // Non-blocking: profile save already succeeded. Log and continue.
            console.warn('[HealthKit] failed to log weight:', err);
          }
        }
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
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior="padding">
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Goals</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Target Weight ({form.showImperial ? 'lbs' : 'kg'})
              </Text>
              <TextInput
                style={styles.input}
                value={form.targetWeight}
                onChangeText={(text) => updateForm('targetWeight', text)}
                keyboardType="decimal-pad"
                placeholder="Optional"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Body Fat %</Text>
              <TextInput
                style={styles.input}
                value={form.targetBodyFat}
                onChangeText={(text) => updateForm('targetBodyFat', text)}
                keyboardType="decimal-pad"
                placeholder="Optional"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>

            <DatePickerInput
              label="Target Date"
              value={form.targetDate}
              onChange={(v) => updateForm('targetDate', v)}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Schedule</Text>

            <TimePickerInput
              label="Wake Up Time"
              value={form.wakeUpTime}
              onChange={(v) => updateForm('wakeUpTime', v)}
            />

            <TimePickerInput
              label="Sleep Time"
              value={form.sleepTime}
              onChange={(v) => updateForm('sleepTime', v)}
            />

            {getSleepWarning(form.wakeUpTime, form.sleepTime) && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  {getSleepWarning(form.wakeUpTime, form.sleepTime)}
                </Text>
              </View>
            )}

            <View style={styles.busyTimesHeader}>
              <Text style={styles.inputLabel}>Busy Times</Text>
              <TouchableOpacity onPress={addBusyTime} activeOpacity={0.8}>
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {form.busyTimes.length === 0 ? (
              <Text style={styles.emptyStateText}>
                No busy times set. Add recurring weekly blocks to optimize meal scheduling.
              </Text>
            ) : (
              form.busyTimes.map((bt, index) => (
                <View key={index} style={styles.busyTimeBlock}>
                  <View style={styles.dayChipsRow}>
                    {DAYS.map((day, dayIndex) => (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayChip, bt.day === day && styles.dayChipActive]}
                        onPress={() => updateBusyTime(index, 'day', day)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.dayChipText, bt.day === day && styles.dayChipTextActive]}
                        >
                          {DAY_LABELS[dayIndex]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.busyTimeRow}>
                    <TimePickerInput
                      label="Start"
                      value={bt.start}
                      onChange={(text) => updateBusyTime(index, 'start', text)}
                      style={styles.imperialInput}
                      minTime={form.wakeUpTime}
                      maxTime={form.sleepTime}
                    />
                    <Text style={styles.timeSeparator}>to</Text>
                    <TimePickerInput
                      label="End"
                      value={bt.end}
                      onChange={(text) => updateBusyTime(index, 'end', text)}
                      style={styles.imperialInput}
                      minTime={form.wakeUpTime}
                      maxTime={form.sleepTime}
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeBusyTime(index)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
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
      </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
  busyTimesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonText: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyStateText: {
    color: Colors.light.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  busyTimeBlock: {
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dayChipsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayChipActive: {
    backgroundColor: `${Colors.light.primary}20`,
    borderColor: Colors.light.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  dayChipTextActive: {
    color: Colors.light.primaryDark,
  },
  busyTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    color: Colors.light.textMuted,
    fontSize: 14,
    paddingBottom: 12,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
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
  warningContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 4,
    marginBottom: 8,
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
