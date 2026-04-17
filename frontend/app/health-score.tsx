import type { Day, DailyMealPlanOutput, DriOutput, UserRead } from '@/api/types.gen';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useSavedWeekPlanQuery } from '@/lib/queries/mealPlan';
import { useUserQuery, useUserTargetsQuery } from '@/lib/queries/user';
import { calculateHealthScore, type SubScoreResult } from '@/utils/healthScore';
import {
  useActiveEnergyToday,
  useHealthKit,
  useSleepLastNight,
  useStepsToday,
} from '@/lib/healthkit';
import type { HealthKitInputs } from '@/lib/healthkit';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Info } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircularProgress } from '../components/ui/circular-progress';

const JS_DAY_TO_API_DAY: Record<number, Day> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

interface PillarRow {
  label: string;
  color: string;
  baseWeightPct: string;
  result: SubScoreResult | null;
  source: string;
  detail: string;
  target: string;
  notMeasuredHint: string;
}

function nutritionRow(
  plan: DailyMealPlanOutput | undefined,
  targets: DriOutput | undefined,
  result: SubScoreResult | null
): PillarRow {
  return {
    label: 'Nutrition',
    color: Colors.light.secondary,
    baseWeightPct: '40%',
    result,
    source: "Today's meal plan vs your DRI targets",
    detail:
      plan && targets
        ? `${Math.round(plan.total_calories)} / ${Math.round(targets.calories.target)} kcal · P ${Math.round(plan.total_protein)}g · C ${Math.round(plan.total_carbs)}g · F ${Math.round(plan.total_fat)}g`
        : '',
    target: 'Average adherence across calories, protein, carbs, fat',
    notMeasuredHint: 'Generate this week’s meal plan to enable nutrition scoring.',
  };
}

function exerciseRow(hk: HealthKitInputs, result: SubScoreResult | null): PillarRow {
  const bits: string[] = [];
  if (hk.activeEnergyKcal != null) bits.push(`${Math.round(hk.activeEnergyKcal)} kcal active`);
  if (hk.stepCount != null) bits.push(`${hk.stepCount.toLocaleString()} steps`);
  return {
    label: 'Exercise',
    color: Colors.light.primary,
    baseWeightPct: '30%',
    result,
    source: 'Apple Health today',
    detail: bits.join(' · '),
    target: 'Target: 400 kcal active + 10,000 steps (70/30 blend)',
    notMeasuredHint: 'Enable Apple Health sync in Profile → Apple Health to track real activity.',
  };
}

function sleepRow(
  user: UserRead | null | undefined,
  hkSleepMinutes: number | null,
  result: SubScoreResult | null
): PillarRow {
  let source = '';
  let detail = '';

  if (hkSleepMinutes != null) {
    const h = Math.floor(hkSleepMinutes / 60);
    const m = Math.round(hkSleepMinutes % 60);
    source = 'Apple Health — last night';
    detail = `${h}h ${m}m in bed`;
  } else if (user?.sleep_time && user?.wake_up_time) {
    const sleep = user.sleep_time.substring(0, 5);
    const wake = user.wake_up_time.substring(0, 5);
    source = 'Your scheduled window';
    detail = `${sleep} → ${wake}`;
  }

  return {
    label: 'Sleep',
    color: Colors.light.charts.carbs,
    baseWeightPct: '30%',
    result,
    source,
    detail,
    target: 'Target: 8 h · scored asymmetrically (undersleep penalized 2× over)',
    notMeasuredHint:
      'Add sleep times in Edit Profile, or enable Apple Health sync for real sleep data.',
  };
}

function overallLabel(overall: number | null): string {
  if (overall == null) return 'Not yet measured';
  if (overall >= 90) return 'Excellent';
  if (overall >= 70) return 'Good';
  if (overall >= 50) return 'Fair';
  return 'Needs Work';
}

export default function HealthScorePage() {
  const router = useRouter();
  const today = new Date();

  const weekStartStr = useMemo(() => {
    const d = new Date(today);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }, [today.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: savedPlan } = useSavedWeekPlanQuery(weekStartStr);
  const { data: targets } = useUserTargetsQuery();
  const { data: user } = useUserQuery();

  const { direction } = useHealthKit();
  const { data: hkActive } = useActiveEnergyToday();
  const { data: hkSteps } = useStepsToday();
  const { data: hkSleep } = useSleepLastNight();

  const hkInputs: HealthKitInputs = useMemo(
    () => ({
      activeEnergyKcal: hkActive?.kcalToday ?? null,
      stepCount: hkSteps?.valueToday ?? null,
      sleepMinutes: hkSleep?.minutesLastNight ?? null,
    }),
    [hkActive, hkSteps, hkSleep]
  );

  const todayPlan = useMemo(() => {
    const todayApiDay = JS_DAY_TO_API_DAY[today.getDay()];
    return savedPlan?.plan_data?.daily_plans?.find((p) => p.day === todayApiDay);
  }, [savedPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  const healthScore = useMemo(
    () => calculateHealthScore(todayPlan, targets, user, !!todayPlan, hkInputs),
    [todayPlan, targets, user, hkInputs]
  );

  const rows: PillarRow[] = [
    nutritionRow(todayPlan, targets, healthScore.nutrition),
    exerciseRow(hkInputs, healthScore.exercise),
    sleepRow(user, hkInputs.sleepMinutes, healthScore.sleep),
  ];

  const overallStatus = overallLabel(healthScore.overall);
  const overallValue = healthScore.overall == null ? '—' : `${healthScore.overall}`;
  const overallPct = healthScore.overall ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Score</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <CircularProgress
              percentage={overallPct}
              size={160}
              color={Colors.light.primary}
              label="Total Score"
              value={overallValue}
            />
          </View>
          <Text style={styles.heroDescription}>
            {healthScore.overall == null
              ? 'Nothing measured yet. Generate a plan or connect Apple Health to start scoring.'
              : `Your overall health score is ${overallStatus.toLowerCase()}. Weighted across measured pillars only.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          <View style={styles.breakdownContainer}>
            {rows.map((row) => (
              <PillarCard key={row.label} row={row} />
            ))}
          </View>
        </View>

        {direction === 'off' && (
          <View style={styles.infoBox}>
            <Info size={20} color={Colors.light.textMuted} />
            <Text style={styles.infoText}>
              Apple Health is off. Exercise and sleep can still be estimated from your schedule, but
              enabling sync (Profile → Apple Health) yields real measurements.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PillarCard({ row }: { row: PillarRow }) {
  const measured = row.result != null;
  const score = row.result?.score ?? 0;
  const status = row.result?.status ?? 'Not measured';
  const statusColor = measured ? row.color : Colors.light.textMuted;

  return (
    <View style={styles.scoreRow}>
      <View
        style={[
          styles.scoreIcon,
          { backgroundColor: measured ? `${row.color}15` : `${Colors.light.textMuted}15` },
        ]}
      >
        <Text style={[styles.scoreIconText, { color: statusColor }]}>{row.label[0]}</Text>
      </View>
      <View style={styles.scoreInfo}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>{row.label}</Text>
          <Text style={[styles.scoreStatus, { color: statusColor }]}>{status}</Text>
        </View>
        {measured ? (
          <>
            <Text style={styles.scoreDesc}>{row.source}</Text>
            {row.detail.length > 0 && <Text style={styles.scoreDetail}>{row.detail}</Text>}
            <View style={styles.scoreMeta}>
              <Text style={styles.scoreWeight}>Baseline weight: {row.baseWeightPct}</Text>
              <Text style={styles.scoreValue}>{score}/100</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${score}%`, backgroundColor: row.color }]}
              />
            </View>
            <Text style={styles.scoreTarget}>{row.target}</Text>
          </>
        ) : (
          <Text style={styles.scoreHint}>{row.notMeasuredHint}</Text>
        )}
      </View>
    </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  heroCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroContent: {
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: Colors.light.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  breakdownContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    ...Shadows.card,
    gap: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
  },
  scoreIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreIconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreInfo: {
    flex: 1,
    gap: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  scoreStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreDesc: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  scoreDetail: {
    fontSize: 12,
    color: Colors.light.text,
  },
  scoreMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 6,
  },
  scoreWeight: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.light.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreTarget: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  scoreHint: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: `${Colors.light.primary}10`,
    borderRadius: Layout.cardRadius,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },
});
