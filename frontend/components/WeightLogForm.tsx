/**
 * WeightLogForm — inline expandable form for logging today's weight.
 *
 * - Unit-aware: displays and accepts lbs when showImperial is true,
 *   but persists internally in kg.
 * - Upserts for the current local date (one entry per day).
 * - Calls onLogged() after a successful save so the parent can reload.
 */
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { localDateStr, upsertWeightEntry } from '@/lib/progress/storage';
import { lbsToKg } from '@/utils/units';
import { Scale } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const WEIGHT_MIN_KG = 30;
const WEIGHT_MAX_KG = 500;

function validateWeightKg(kg: number): string | null {
  if (isNaN(kg) || kg <= 0) return 'Enter a valid weight.';
  if (kg < WEIGHT_MIN_KG) return `Weight must be at least ${WEIGHT_MIN_KG} kg.`;
  if (kg > WEIGHT_MAX_KG) return `Weight must be at most ${WEIGHT_MAX_KG} kg.`;
  return null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  showImperial: boolean;
  /** Called after the entry is saved successfully. */
  onLogged: () => void;
  /** Optional initial display value (in the display unit). */
  initialValue?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeightLogForm({ showImperial, onLogged, initialValue }: Props) {
  const now = useNow();
  const [value, setValue] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unit = showImperial ? 'lbs' : 'kg';

  const handleSave = async () => {
    const parsed = parseFloat(value.trim());
    const kg = showImperial ? lbsToKg(parsed) : parsed;
    const err = validateWeightKg(kg);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await upsertWeightEntry({
        date: localDateStr(now),
        weightKg: parseFloat(kg.toFixed(3)),
        source: 'manual',
      });
      onLogged();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Scale size={16} color={Colors.light.primary} />
        <Text style={styles.label}>Log weight</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setError(null);
          }}
          keyboardType="decimal-pad"
          placeholder={showImperial ? 'e.g. 165.2' : 'e.g. 75.0'}
          placeholderTextColor={Colors.light.textMuted}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        <Text style={styles.unit}>{unit}</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: Layout.cardRadius,
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1.5,
    borderColor: Colors.light.textMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.light.text,
    backgroundColor: Colors.light.surface,
    ...Shadows.card,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
    width: 28,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: -4,
  },
});
