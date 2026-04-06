import { MetricInput } from '@/components/MetricInput';
import { TimePickerInput } from '@/components/TimePickerInput';
import { Colors, Shadows } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { kgToLbs, lbsToKg } from '@/utils/units';
import { getSleepWarning } from '@/utils/sleep-validation';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step5Screen() {
  const { data, updateField, errors, isSection5Complete } = useOnboarding();
  const [imperialTargetWeight, setImperialTargetWeight] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const canContinue = isSection5Complete();

  const handleTargetWeightChange = (value: string) => {
    if (!data.showImperial) {
      updateField('targetWeight', value);
      return;
    }

    setImperialTargetWeight(value);
    if (!value) {
      updateField('targetWeight', '');
      return;
    }

    const weightLbs = parseFloat(value);
    if (Number.isNaN(weightLbs)) return;
    updateField('targetWeight', lbsToKg(weightLbs).toString());
  };

  const displayTargetWeight = data.showImperial
    ? imperialTargetWeight ||
      (data.targetWeight ? kgToLbs(parseFloat(data.targetWeight)).toString() : '')
    : data.targetWeight;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7); // At least 1 week from now

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      updateField('targetDate', `${year}-${month}-${day}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior="padding">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '83%' }]} />
            </View>
            <Text style={styles.progressText}>Step 5 of 6</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Goals & Schedule</Text>
            <Text style={styles.subtitle}>Help us optimize your exercise and meal timing</Text>
          </View>

          <View style={styles.content}>
            <View>
              <MetricInput
                label={`Target Weight (${data.showImperial ? 'lbs' : 'kg'})`}
                value={displayTargetWeight}
                onChangeText={handleTargetWeightChange}
                placeholder="Enter your target weight"
                keyboardType="decimal-pad"
                unit={data.showImperial ? 'lbs' : 'kg'}
                error={errors.targetWeight}
              />
            </View>

            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Target Date</Text>
              <Text style={styles.fieldDescription}>When do you want to reach your goal?</Text>
              {Platform.OS === 'android' && (
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Text
                    style={data.targetDate ? styles.dateButtonText : styles.dateButtonPlaceholder}
                  >
                    {data.targetDate || 'Select a date'}
                  </Text>
                </TouchableOpacity>
              )}
              {showDatePicker && (
                <DateTimePicker
                  value={data.targetDate ? new Date(data.targetDate) : minDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={minDate}
                  onChange={handleDateChange}
                />
              )}
              {errors.targetDate && <Text style={styles.errorText}>{errors.targetDate}</Text>}
            </View>

            <TimePickerInput
              label="Wake Up Time"
              value={data.wakeUpTime}
              onChange={(v) => updateField('wakeUpTime', v)}
            />

            <TimePickerInput
              label="Sleep Time"
              value={data.sleepTime}
              onChange={(v) => updateField('sleepTime', v)}
            />

            {getSleepWarning(data.wakeUpTime, data.sleepTime) && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  {getSleepWarning(data.wakeUpTime, data.sleepTime)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
            onPress={() => router.push('/onboarding/step6')}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
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
    gap: 24,
  },
  dateField: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  fieldDescription: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  dateButton: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  dateButtonPlaceholder: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.error,
    marginTop: 4,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.background,
    ...Shadows.card,
  },
  continueButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.light.textMuted,
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.surface,
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: -8,
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
