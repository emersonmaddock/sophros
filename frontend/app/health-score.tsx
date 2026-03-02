import type { Day } from '@/api/types.gen';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useSavedWeekPlanQuery } from '@/lib/queries/mealPlan';
import { useUserQuery, useUserTargetsQuery } from '@/lib/queries/user';
import { calculateHealthScore } from '@/utils/healthScore';
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

  const todayPlan = useMemo(() => {
    const todayApiDay = JS_DAY_TO_API_DAY[today.getDay()];
    return savedPlan?.plan_data?.daily_plans?.find((p) => p.day === todayApiDay);
  }, [savedPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  const healthScore = useMemo(
    () => calculateHealthScore(todayPlan, targets, user, !!todayPlan),
    [todayPlan, targets, user]
  );

  const scoreComponents = [
    {
      label: 'Nutrition',
      score: healthScore.nutrition.score,
      weight: '40%',
      color: Colors.light.secondary,
      description: 'Based on calorie and macro adherence',
      status: healthScore.nutrition.status,
    },
    {
      label: 'Exercise',
      score: healthScore.exercise.score,
      weight: '30%',
      color: Colors.light.primary,
      description: 'Workout frequency and intensity',
      status: healthScore.exercise.status,
    },
    {
      label: 'Sleep',
      score: healthScore.sleep.score,
      weight: '30%',
      color: Colors.light.charts.carbs,
      description: 'Duration and quality of sleep',
      status: healthScore.sleep.status,
    },
  ];

  const overallStatus =
    healthScore.overall >= 90
      ? 'Excellent'
      : healthScore.overall >= 70
        ? 'Good'
        : healthScore.overall >= 50
          ? 'Fair'
          : 'Needs Work';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Score</Text>
          <TouchableOpacity>
            <Info size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Main Score */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <CircularProgress
              percentage={healthScore.overall}
              size={160}
              color={Colors.light.primary}
              label="Total Score"
              value={`${healthScore.overall}`}
            />
          </View>
          <Text style={styles.heroDescription}>
            Your overall health score is {overallStatus.toLowerCase()}. Keep building healthy habits!
          </Text>
        </View>

        {/* Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          <View style={styles.breakdownContainer}>
            {scoreComponents.map((item, i) => (
              <View key={i} style={styles.scoreRow}>
                <View style={[styles.scoreIcon, { backgroundColor: `${item.color}15` }]}>
                  <Text style={[styles.scoreIconText, { color: item.color }]}>{item.label[0]}</Text>
                </View>
                <View style={styles.scoreInfo}>
                  <View style={styles.scoreHeader}>
                    <Text style={styles.scoreLabel}>{item.label}</Text>
                    <Text style={[styles.scoreStatus, { color: item.color }]}>{item.status}</Text>
                  </View>
                  <Text style={styles.scoreDesc}>{item.description}</Text>
                  <View style={styles.scoreMeta}>
                    <Text style={styles.scoreWeight}>Weight: {item.weight}</Text>
                    <Text style={styles.scoreValue}>{item.score}/100</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.score}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Info size={20} color={Colors.light.textMuted} />
          <Text style={styles.infoText}>
            Your health score is calculated daily based on your activity, nutrition, and sleep data.
          </Text>
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
    marginBottom: 4,
  },
  scoreMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
