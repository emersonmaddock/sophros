/**
 * Log Today — dedicated screen for logging sleep and weight.
 * Navigated to from the Home tab button.
 */
import { WeightLogForm } from '@/components/WeightLogForm';
import { TimePickerInput } from '@/components/TimePickerInput';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { useUserQuery } from '@/lib/queries/user';
import { localDateStr } from '@/lib/progress/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Moon, Scale, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SLEEP_STORAGE_KEY = 'sleep_wake_prompt_date';
const SLEEP_LOG_COUNT_KEY = 'sleep_log_count';

export default function LogTodayPage() {
  const router = useRouter();
  const now = useNow();
  const { data: user } = useUserQuery();

  const [sleepTime, setSleepTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepLogged, setSleepLogged] = useState(false);
  const [weightLogged, setWeightLogged] = useState(false);

  const handleLogSleep = async () => {
    await AsyncStorage.setItem(SLEEP_STORAGE_KEY, localDateStr(now));
    const raw = await AsyncStorage.getItem(SLEEP_LOG_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    await AsyncStorage.setItem(SLEEP_LOG_COUNT_KEY, String(count + 1));
    setSleepLogged(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Log Today</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <X size={22} color={Colors.light.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sleep card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Moon size={18} color="#4338CA" />
            <Text style={styles.cardTitle}>Sleep</Text>
            {sleepLogged && <Text style={styles.loggedBadge}>Logged ✓</Text>}
          </View>
          <Text style={styles.cardSubtitle}>When did you sleep and wake up?</Text>

          <View style={styles.pickerRow}>
            <View style={styles.pickerWrap}>
              <Text style={styles.pickerLabel}>Slept at</Text>
              <TimePickerInput label="" value={sleepTime} onChange={setSleepTime} format="24h" />
            </View>
            <View style={styles.pickerDivider} />
            <View style={styles.pickerWrap}>
              <Text style={styles.pickerLabel}>Woke up at</Text>
              <TimePickerInput label="" value={wakeTime} onChange={setWakeTime} format="24h" />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logButton, sleepLogged && styles.logButtonDone]}
            onPress={handleLogSleep}
            activeOpacity={0.8}
            disabled={sleepLogged}
          >
            <Text style={styles.logButtonText}>{sleepLogged ? 'Sleep logged' : 'Log Sleep'}</Text>
          </TouchableOpacity>
        </View>

        {/* Weight card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Scale size={18} color={Colors.light.primary} />
            <Text style={styles.cardTitle}>Weight</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
            {weightLogged && <Text style={styles.loggedBadge}>Logged ✓</Text>}
          </View>
          <Text style={styles.cardSubtitle}>
            Log your weight to keep your progress graph accurate.
          </Text>
          <WeightLogForm
            showImperial={user?.show_imperial ?? false}
            onLogged={() => setWeightLogged(true)}
          />
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>Done</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    gap: 12,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    lineHeight: 18,
    marginTop: -4,
  },
  optionalBadge: {
    fontSize: 11,
    color: Colors.light.textMuted,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  loggedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.success,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
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
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  pickerDivider: {
    width: 1,
    backgroundColor: Colors.light.background,
    alignSelf: 'stretch',
    marginHorizontal: 4,
    marginTop: 20,
  },
  logButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logButtonDone: {
    backgroundColor: Colors.light.success,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  doneButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: Layout.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
