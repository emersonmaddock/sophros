/**
 * DailyCheckinPrompt — combined daily check-in banner shown on the Home tab.
 *
 * Sleep is the primary action (shown daily until logged or dismissed).
 * Weight logging is secondary (shown always as an optional action; becomes
 * a stronger reminder after 7 days without a weight log).
 *
 * Dismissal and submission are tracked independently:
 *   - Dismissing sleep records today's date in `sleep_wake_prompt_date`
 *   - Dismissing weight records today's date in `progress_weight_prompt_dismissed_date`
 *   - Logging weight via this prompt calls upsertWeightEntry + records the log date
 *
 * The component returns null when there is nothing to show (sleep already
 * handled today AND weight is recent AND dismissed today or already logged).
 *
 * Future-data purge is the responsibility of the parent screen effect so this
 * component stays stateless regarding purging.
 */
import { WeightLogForm } from '@/components/WeightLogForm';
import { Colors, Layout } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { clearFutureSleepData, shouldShowSleepPrompt } from '@/components/SleepWakePrompt';
import {
  getWeightPromptState,
  isWeightPromptDismissedToday,
  purgeFutureProgressData,
  setWeightPromptDismissedToday,
} from '@/lib/progress/storage';
import { TimePickerInput } from '@/components/TimePickerInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moon, Scale, Sun, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mirrors the key from SleepWakePrompt so we write to the same location
const SLEEP_STORAGE_KEY = 'sleep_wake_prompt_date';
const SLEEP_LOG_COUNT_KEY = 'sleep_log_count';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckinState = {
  showSleep: boolean;
  weightState: 'urgent' | 'optional';
  weightDismissedToday: boolean;
};

type Props = {
  showImperial: boolean;
  onWeightLogged?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyCheckinPrompt({ showImperial, onWeightLogged }: Props) {
  const now = useNow();
  const [state, setState] = useState<CheckinState | null>(null);
  const [sleepTime, setSleepTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [showWeightForm, setShowWeightForm] = useState(false);

  const refresh = useCallback(async () => {
    await purgeFutureProgressData(now);
    await clearFutureSleepData(now);
    const [showSleep, weightState, weightDismissedToday] = await Promise.all([
      shouldShowSleepPrompt(now),
      getWeightPromptState(now),
      isWeightPromptDismissedToday(now),
    ]);
    setState({ showSleep, weightState, weightDismissedToday });
  }, [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!state) return null;

  const { showSleep, weightState, weightDismissedToday } = state;

  // Determine visibility:
  //   - Always show if sleep not yet handled today
  //   - Show if weight is urgent and not dismissed today
  //   - Show if weight is optional (always available, never hides)
  const showWeightReminder = weightState === 'urgent' && !weightDismissedToday;
  const showWeightOptional = weightState === 'optional';

  if (!showSleep && !showWeightReminder && !showWeightOptional) return null;

  const handleSleepLog = async () => {
    await AsyncStorage.setItem(SLEEP_STORAGE_KEY, localDateStr(now));
    const raw = await AsyncStorage.getItem(SLEEP_LOG_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    await AsyncStorage.setItem(SLEEP_LOG_COUNT_KEY, String(count + 1));
    setState((prev) => prev && { ...prev, showSleep: false });
  };

  const handleSleepDismiss = async () => {
    await AsyncStorage.setItem(SLEEP_STORAGE_KEY, localDateStr(now));
    setState((prev) => prev && { ...prev, showSleep: false });
  };

  const handleWeightDismiss = async () => {
    await setWeightPromptDismissedToday(now);
    setState((prev) => prev && { ...prev, weightDismissedToday: true });
    setShowWeightForm(false);
  };

  const handleWeightLogged = () => {
    // Weight logged — remove urgent state and call parent
    setState((prev) => prev && { ...prev, weightState: 'optional', weightDismissedToday: false });
    setShowWeightForm(false);
    onWeightLogged?.();
  };

  // When only the weight reminder is needed (sleep already done)
  if (!showSleep && (showWeightReminder || showWeightOptional)) {
    return (
      <WeightOnlyBanner
        urgent={showWeightReminder}
        showForm={showWeightForm}
        showImperial={showImperial}
        onToggleForm={() => setShowWeightForm((v) => !v)}
        onDismiss={handleWeightDismiss}
        onLogged={handleWeightLogged}
      />
    );
  }

  // Combined sleep + weight
  return (
    <View style={styles.banner}>
      <TouchableOpacity onPress={handleSleepDismiss} hitSlop={10} style={styles.closeButton}>
        <X size={16} color={Colors.light.textMuted} />
      </TouchableOpacity>

      {/* Sleep section */}
      <View style={styles.pickerRow}>
        <View style={styles.pickerWrap}>
          <View style={styles.pickerLabel}>
            <Moon size={13} color="#4338CA" />
            <Text style={styles.pickerLabelText}>Slept at</Text>
          </View>
          <TimePickerInput label="" value={sleepTime} onChange={setSleepTime} format="24h" />
        </View>
        <View style={styles.pickerDivider} />
        <View style={styles.pickerWrap}>
          <View style={styles.pickerLabel}>
            <Sun size={13} color="#D97706" />
            <Text style={styles.pickerLabelText}>Woke up at</Text>
          </View>
          <TimePickerInput label="" value={wakeTime} onChange={setWakeTime} format="24h" />
        </View>
      </View>

      <TouchableOpacity style={styles.sleepLogButton} onPress={handleSleepLog} activeOpacity={0.8}>
        <Text style={styles.sleepLogButtonText}>Log Sleep</Text>
      </TouchableOpacity>

      {/* Weight section — always shows as optional, or urgent with copy */}
      <View style={styles.weightDivider} />

      <View style={styles.weightRow}>
        <Scale size={14} color={Colors.light.primary} />
        <View style={{ flex: 1 }}>
          {weightState === 'urgent' && !weightDismissedToday ? (
            <Text style={styles.weightUrgentText}>
              It&apos;s been a while — log your weight to keep your progress accurate.
            </Text>
          ) : (
            <Text style={styles.weightOptionalText}>Optional: log your weight today</Text>
          )}
        </View>
        {weightState === 'urgent' && !weightDismissedToday && (
          <TouchableOpacity onPress={handleWeightDismiss} hitSlop={8}>
            <X size={14} color={Colors.light.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {!showWeightForm ? (
        <TouchableOpacity
          style={styles.weightLogButton}
          onPress={() => setShowWeightForm(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.weightLogButtonText}>Log Weight</Text>
        </TouchableOpacity>
      ) : (
        <WeightLogForm showImperial={showImperial} onLogged={handleWeightLogged} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Weight-only banner (sleep already handled for today)
// ---------------------------------------------------------------------------

function WeightOnlyBanner({
  urgent,
  showForm,
  showImperial,
  onToggleForm,
  onDismiss,
  onLogged,
}: {
  urgent: boolean;
  showForm: boolean;
  showImperial: boolean;
  onToggleForm: () => void;
  onDismiss: () => void;
  onLogged: () => void;
}) {
  return (
    <View style={[styles.banner, styles.weightOnlyBanner]}>
      {urgent && (
        <TouchableOpacity onPress={onDismiss} hitSlop={10} style={styles.closeButton}>
          <X size={16} color={Colors.light.textMuted} />
        </TouchableOpacity>
      )}
      <View style={styles.weightRow}>
        <Scale size={14} color={Colors.light.primary} />
        <Text style={urgent ? styles.weightUrgentText : styles.weightOptionalText}>
          {urgent
            ? "It's been a while — log your weight to keep your progress accurate."
            : 'Optional: log your weight today'}
        </Text>
      </View>
      {!showForm ? (
        <TouchableOpacity style={styles.weightLogButton} onPress={onToggleForm} activeOpacity={0.8}>
          <Text style={styles.weightLogButtonText}>Log Weight</Text>
        </TouchableOpacity>
      ) : (
        <>
          <WeightLogForm showImperial={showImperial} onLogged={onLogged} />
          <TouchableOpacity onPress={onToggleForm}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EEF2FF',
    borderRadius: Layout.cardRadius,
    paddingHorizontal: 14,
    paddingTop: 28,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 8,
  },
  weightOnlyBanner: {
    paddingTop: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    padding: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pickerWrap: {
    flex: 1,
    gap: 4,
  },
  pickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  pickerLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  pickerDivider: {
    width: 1,
    backgroundColor: '#C7D2FE',
    alignSelf: 'stretch',
    marginHorizontal: 4,
    marginTop: 22,
  },
  sleepLogButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sleepLogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  weightDivider: {
    height: 1,
    backgroundColor: '#C7D2FE',
    marginVertical: 4,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  weightUrgentText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '500',
    lineHeight: 17,
    flex: 1,
  },
  weightOptionalText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    lineHeight: 17,
  },
  weightLogButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  weightLogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
