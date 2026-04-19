/**
 * BodyFatLogForm — inline form for manually logging today's body fat %.
 *
 * Only accepts manual entry; never estimates from other data.
 * Upserts for the current local date (one entry per day).
 */
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { localDateStr, upsertBodyFatEntry } from '@/lib/progress/storage';
import { Activity } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BF_MIN = 3;
const BF_MAX = 60;

function validateBodyFat(pct: number): string | null {
  if (isNaN(pct) || pct <= 0) return 'Enter a valid body fat %.';
  if (pct < BF_MIN) return `Must be at least ${BF_MIN}%.`;
  if (pct > BF_MAX) return `Must be at most ${BF_MAX}%.`;
  return null;
}

type Props = {
  onLogged: () => void;
};

export function BodyFatLogForm({ onLogged }: Props) {
  const now = useNow();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(value.trim());
    const err = validateBodyFat(parsed);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await upsertBodyFatEntry({
        date: localDateStr(now),
        bodyFatPercent: parseFloat(parsed.toFixed(1)),
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
        <Activity size={16} color={Colors.light.charts.carbs} />
        <Text style={styles.label}>Log body fat</Text>
        <Text style={styles.optional}>(optional)</Text>
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
          placeholder="e.g. 18.5"
          placeholderTextColor={Colors.light.textMuted}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        <Text style={styles.unit}>%</Text>
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
  optional: {
    fontSize: 11,
    color: Colors.light.textMuted,
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
    width: 20,
  },
  saveButton: {
    backgroundColor: Colors.light.charts.carbs,
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
