import { Colors, Layout, Shadows } from '@/constants/theme';
import {
  useActiveEnergyToday,
  useDietaryCarbsToday,
  useDietaryEnergyToday,
  useDietaryFatToday,
  useDietaryProteinToday,
  useHealthKit,
  useLatestBodyFat,
  useLatestWeight,
  useRecentWorkouts,
  useSleepLastNight,
  useStepsToday,
} from '@/lib/healthkit';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Option = { label: string; value: 'off' | 'read' | 'readWrite' };

const OPTIONS: Option[] = [
  { label: 'Off', value: 'off' },
  { label: 'Read only', value: 'read' },
  { label: 'Read & Write', value: 'readWrite' },
];

function formatTimestamp(ms: number | null): string {
  if (!ms) return 'never';
  return new Date(ms).toLocaleTimeString();
}

export default function HealthIntegrationScreen() {
  const router = useRouter();
  const { direction, isIOS, setDirection, lastRefreshAt } = useHealthKit();

  const steps = useStepsToday();
  const active = useActiveEnergyToday();
  const sleep = useSleepLastNight();
  const workouts = useRecentWorkouts(7);
  const weight = useLatestWeight();
  const bodyFat = useLatestBodyFat();
  const dietEnergy = useDietaryEnergyToday();
  const dietProtein = useDietaryProteinToday();
  const dietFat = useDietaryFatToday();
  const dietCarbs = useDietaryCarbsToday();

  const statusLabel = !isIOS
    ? 'Not supported on this platform'
    : direction === 'off'
      ? 'Off'
      : 'Connected';

  const metrics: Array<{ key: string; label: string; value: string }> = [
    { key: 'steps', label: 'Steps today', value: steps.data ? `${steps.data.valueToday}` : '—' },
    {
      key: 'activeEnergy',
      label: 'Active energy today',
      value: active.data ? `${Math.round(active.data.kcalToday)} kcal` : '—',
    },
    {
      key: 'sleep',
      label: 'Sleep last night',
      value: sleep.data?.minutesLastNight
        ? `${(sleep.data.minutesLastNight / 60).toFixed(1)} h`
        : '—',
    },
    {
      key: 'workouts',
      label: 'Workouts (last 7 days)',
      value: workouts.data ? `${workouts.data.length}` : '—',
    },
    {
      key: 'weight',
      label: 'Latest weight',
      value: weight.data ? `${weight.data.value.toFixed(1)} ${weight.data.unit}` : '—',
    },
    {
      key: 'bodyFat',
      label: 'Latest body fat',
      value: bodyFat.data ? `${bodyFat.data.value.toFixed(1)}%` : '—',
    },
    {
      key: 'dietaryEnergy',
      label: 'Dietary energy today',
      value: dietEnergy.data ? `${Math.round(dietEnergy.data.totalToday)} kcal` : '—',
    },
    {
      key: 'dietaryProtein',
      label: 'Dietary protein today',
      value: dietProtein.data ? `${dietProtein.data.totalToday.toFixed(1)} g` : '—',
    },
    {
      key: 'dietaryFat',
      label: 'Dietary fat today',
      value: dietFat.data ? `${dietFat.data.totalToday.toFixed(1)} g` : '—',
    },
    {
      key: 'dietaryCarbs',
      label: 'Dietary carbs today',
      value: dietCarbs.data ? `${dietCarbs.data.totalToday.toFixed(1)} g` : '—',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apple Health</Text>
          <View style={{ width: 24 }} />
        </View>

        {!isIOS && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Apple Health is iOS only. Health Connect for Android is planned.
            </Text>
          </View>
        )}

        {isIOS && __DEV__ && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Dev build: some HealthKit data types are unavailable in the iOS Simulator. Manual
              testing on a physical device is required.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <Text style={styles.statusLabel}>{statusLabel}</Text>
          <Text style={styles.statusSub}>Last refreshed: {formatTimestamp(lastRefreshAt)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync mode</Text>
          <View style={styles.segmented}>
            {OPTIONS.map((opt) => {
              const active = direction === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  disabled={!isIOS}
                  onPress={() => setDirection(opt.value)}
                >
                  <Text
                    style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {direction !== 'off' && isIOS && (
            <Text style={styles.hint}>
              Not seeing data? Check iOS Settings → Privacy & Security → Health → Sophros.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Metrics</Text>
          {metrics.map((m) => (
            <View key={m.key} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>
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
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    gap: 8,
    ...Shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statusSub: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  segmentButtonTextActive: {
    color: Colors.light.surface,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  infoBanner: {
    backgroundColor: `${Colors.light.primary}10`,
    borderRadius: Layout.cardRadius,
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
});
