/**
 * SleepWakePrompt — a non-blocking banner shown on the schedule tab,
 * asking the user to log last night's sleep time and today's wake time.
 *
 * Gated by AsyncStorage: once the user logs or dismisses for a given date,
 * the prompt won't appear again for that date.
 *
 * clearFutureSleepData() should be called before shouldShowSleepPrompt()
 * whenever `now` changes — it wipes the stored date if it is in the future
 * relative to `now`, ensuring time-travel backwards re-triggers the prompt.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimePickerInput } from '@/components/TimePickerInput';
import { Colors, Layout } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { Moon, Sun, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = 'sleep_wake_prompt_date';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  /** Called when the user submits times or dismisses (so parent can hide) */
  onDismiss: () => void;
};

export function SleepWakePrompt({ onDismiss }: Props) {
  const now = useNow();
  const [sleepTime, setSleepTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');

  const markDone = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, localDateStr(now));
    onDismiss();
  };

  const handleLog = () => {
    // Future: post sleepTime + wakeTime to backend user profile
    markDone();
  };

  const handleDismiss = () => {
    markDone();
  };

  return (
    <View style={styles.banner}>
      <View style={styles.bannerHeader}>
        <View style={styles.bannerTitleRow}>
          <Moon size={15} color="#4338CA" />
          <Text style={styles.bannerTitle}>Log your sleep</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={10}>
          <X size={18} color={Colors.light.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.bannerSubtitle}>
        Log last night&apos;s sleep time and this morning&apos;s wake-up time.
      </Text>

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

      <TouchableOpacity style={styles.logButton} onPress={handleLog} activeOpacity={0.8}>
        <Text style={styles.logButtonText}>Log Sleep</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Clears stored sleep data if it is in the future relative to `now`.
 * Call this before shouldShowSleepPrompt() whenever `now` changes so that
 * going backwards in time re-triggers the prompt.
 */
export async function clearFutureSleepData(now: Date): Promise<void> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored && stored > localDateStr(now)) {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

/** Returns whether the prompt should be shown for the given `now` date. */
export async function shouldShowSleepPrompt(now: Date): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored !== localDateStr(now);
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EEF2FF',
    borderRadius: Layout.cardRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
    gap: 10,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3730A3',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 18,
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
  logButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
