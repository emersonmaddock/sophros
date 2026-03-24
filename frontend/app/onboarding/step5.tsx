import { MetricInput } from '@/components/MetricInput';
import { TimePicker } from '@/components/TimePicker';
import { Colors, Shadows } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { validateSleepDuration } from '@/utils/sleepValidation';
import { kgToLbs, lbsToKg } from '@/utils/units';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step5Screen() {
  const { data, updateField, loading, error: apiError, submit } = useOnboarding();
  const [imperialTargetWeight, setImperialTargetWeight] = useState('');

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

  // Compute live validation error whenever wake/sleep times change
  const sleepError = validateSleepDuration(data.wakeUpTime, data.sleepTime);

  const handleSubmit = async () => {
    if (sleepError) {
      Alert.alert('Invalid Schedule', sleepError);
      return;
    }
    const response = await submit();
    if (response.success) {
      router.replace('/onboarding/done');
    } else if (response.error) {
      Alert.alert('Error', response.error);
    } else if (apiError) {
      Alert.alert('Error', apiError);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.progressText}>Step 5 of 5</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Goals &amp; Schedule</Text>
            <Text style={styles.subtitle}>Help us optimize your exercise and meal timing</Text>
          </View>

          <View style={styles.content}>
            <View>
              <MetricInput
                label={`Target Weight (${data.showImperial ? 'lbs' : 'kg'})`}
                value={displayTargetWeight}
                onChangeText={handleTargetWeightChange}
                placeholder="Leave blank to maintain current weight"
                keyboardType="decimal-pad"
                unit={data.showImperial ? 'lbs' : 'kg'}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Wake Up Time</Text>
              <TimePicker
                value={data.wakeUpTime}
                onChange={(value) => updateField('wakeUpTime', value)}
                placeholder="07:00 AM"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Sleep Time</Text>
              <TimePicker
                value={data.sleepTime}
                onChange={(value) => updateField('sleepTime', value)}
                placeholder="11:00 PM"
              />
              {sleepError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {sleepError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, (loading || !!sleepError) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !!sleepError}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Complete Profile</Text>
            )}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
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
