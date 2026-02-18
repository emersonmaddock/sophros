import { MetricInput } from '@/components/MetricInput';
import { Colors, Shadows } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { cmToFeetAndInches, feetAndInchesToCm, kgToLbs, lbsToKg } from '@/utils/units';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step2Screen() {
  const { data, updateField, errors, isSection2Complete } = useOnboarding();
  const [imperialWeight, setImperialWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const hasInitializedImperialInputs = useRef(false);

  const canContinue = isSection2Complete();

  useEffect(() => {
    if (!data.showImperial) {
      setImperialWeight('');
      setHeightFeet('');
      setHeightInches('');
      hasInitializedImperialInputs.current = false;
      return;
    }

    if (hasInitializedImperialInputs.current) {
      return;
    }

    if (data.weight) {
      const weightKg = parseFloat(data.weight);
      setImperialWeight(Number.isNaN(weightKg) ? '' : kgToLbs(weightKg).toString());
    } else {
      setImperialWeight('');
    }

    if (data.height) {
      const heightCm = parseFloat(data.height);
      if (Number.isNaN(heightCm)) {
        setHeightFeet('');
        setHeightInches('');
      } else {
        const { feet, inches } = cmToFeetAndInches(heightCm);
        setHeightFeet(feet.toString());
        setHeightInches(inches.toString());
      }
    } else {
      setHeightFeet('');
      setHeightInches('');
    }
    hasInitializedImperialInputs.current = true;
  }, [data.showImperial, data.weight, data.height]);

  const toggleUnits = () => {
    updateField('showImperial', !data.showImperial);
  };

  const handleWeightChange = (value: string) => {
    if (!data.showImperial) {
      updateField('weight', value);
      return;
    }

    setImperialWeight(value);
    if (!value) {
      updateField('weight', '');
      return;
    }

    const weightLbs = parseFloat(value);
    if (Number.isNaN(weightLbs)) return;
    updateField('weight', lbsToKg(weightLbs).toString());
  };

  const updateHeightFromImperial = (feetText: string, inchesText: string) => {
    if (!feetText && !inchesText) {
      updateField('height', '');
      return;
    }

    const feet = parseInt(feetText || '0', 10);
    const inches = parseInt(inchesText || '0', 10);
    if (Number.isNaN(feet) || Number.isNaN(inches)) return;

    updateField('height', feetAndInchesToCm(feet, inches).toString());
  };

  const handleHeightFeetChange = (value: string) => {
    setHeightFeet(value);
    updateHeightFromImperial(value, heightInches);
  };

  const handleHeightInchesChange = (value: string) => {
    setHeightInches(value);
    updateHeightFromImperial(heightFeet, value);
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
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
            <Text style={styles.progressText}>Step 2 of 4</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Physical Metrics</Text>
            <Text style={styles.subtitle}>Help us personalize your nutrition plan</Text>
          </View>

          <View style={styles.content}>
            <View>
              <View style={styles.inputHeader}>
                <Text style={styles.fieldLabel}>Weight</Text>
                <TouchableOpacity style={styles.unitToggle} onPress={toggleUnits}>
                  <Text
                    style={[
                      styles.unitToggleText,
                      !data.showImperial && styles.unitToggleTextActive,
                    ]}
                  >
                    kg
                  </Text>
                  <Text style={styles.unitToggleSeparator}>|</Text>
                  <Text
                    style={[
                      styles.unitToggleText,
                      data.showImperial && styles.unitToggleTextActive,
                    ]}
                  >
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
              <MetricInput
                label=""
                value={data.showImperial ? imperialWeight : data.weight}
                onChangeText={handleWeightChange}
                placeholder={`Enter weight in ${data.showImperial ? 'lbs' : 'kg'}`}
                error={errors.weight}
                unit={data.showImperial ? 'lbs' : 'kg'}
              />
            </View>

            <View>
              <View style={styles.inputHeader}>
                <Text style={styles.fieldLabel}>Height</Text>
                <TouchableOpacity style={styles.unitToggle} onPress={toggleUnits}>
                  <Text
                    style={[
                      styles.unitToggleText,
                      !data.showImperial && styles.unitToggleTextActive,
                    ]}
                  >
                    cm
                  </Text>
                  <Text style={styles.unitToggleSeparator}>|</Text>
                  <Text
                    style={[
                      styles.unitToggleText,
                      data.showImperial && styles.unitToggleTextActive,
                    ]}
                  >
                    ft/in
                  </Text>
                </TouchableOpacity>
              </View>

              {!data.showImperial ? (
                <MetricInput
                  label=""
                  value={data.height}
                  onChangeText={(value) => updateField('height', value)}
                  placeholder="Enter height in cm"
                  error={errors.height}
                  unit="cm"
                />
              ) : (
                <View style={styles.heightFeetRow}>
                  <View style={styles.heightFeetInput}>
                    <MetricInput
                      label=""
                      value={heightFeet}
                      onChangeText={handleHeightFeetChange}
                      placeholder="Feet"
                      unit="ft"
                    />
                  </View>
                  <View style={styles.heightInchesInput}>
                    <MetricInput
                      label=""
                      value={heightInches}
                      onChangeText={handleHeightInchesChange}
                      placeholder="Inches"
                      error={errors.height}
                      unit="in"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
            onPress={() =>
              router.push(data.gender === 'female' ? '/onboarding/step3' : '/onboarding/step4')
            }
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
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    padding: 4,
    gap: 8,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unitToggleTextActive: {
    color: Colors.light.primary,
  },
  unitToggleSeparator: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  heightFeetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightFeetInput: {
    flex: 1,
  },
  heightInchesInput: {
    flex: 1,
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
});
