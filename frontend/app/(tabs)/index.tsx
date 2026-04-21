import type { Day } from '@/api/types.gen';
import { MacroNutrients } from '@/components/MacroNutrients';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useConfirmations } from '@/contexts/ConfirmationsContext';
import { useNow } from '@/hooks/useNow';
import { useSavedWeekPlanQuery } from '@/lib/queries/mealPlan';
import { useUserQuery, useUserTargetsQuery } from '@/lib/queries/user';
import { calculateHealthScore } from '@/utils/healthScore';
import { useActiveEnergyToday, useStepsToday, useSleepLastNight } from '@/lib/healthkit';
import type { HealthKitInputs } from '@/lib/healthkit';
import { mapDailyPlanToScheduleItems } from '@/utils/mealPlanMapper';
import { useUser as useClerkUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { ChevronRight, Utensils } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const JS_DAY_TO_API_DAY: Record<number, Day> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export default function DashboardPage() {
  const router = useRouter();

  const { user: clerkUser } = useClerkUser();
  const userName = clerkUser?.firstName || 'there';
  const { confirmations } = useConfirmations();

  const now = useNow();
  const day = now.getDate();
  const dayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
  const monthName = now.toLocaleString('en-US', { month: 'short' });
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Compute this week's Monday to fetch the saved plan
  const weekStartStr = useMemo(() => {
    const d = new Date(now);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }, [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayDateStr = useMemo(() => {
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: savedPlan, isLoading: isLoadingPlan } = useSavedWeekPlanQuery(weekStartStr);
  const { data: targets, isLoading: isLoadingTargets } = useUserTargetsQuery();
  const { data: user, isLoading: isLoadingUser } = useUserQuery();

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

  const isLoading = isLoadingPlan || isLoadingTargets || isLoadingUser;

  // Derive today's plan
  const todayPlan = useMemo(() => {
    const todayApiDay = JS_DAY_TO_API_DAY[now.getDay()];
    return savedPlan?.plan_data?.daily_plans?.find((p) => p.day === todayApiDay);
  }, [savedPlan, now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute health score
  const healthScore = useMemo(
    () => calculateHealthScore(todayPlan, targets, user, !!todayPlan, hkInputs),
    [todayPlan, targets, user, hkInputs]
  );

  // Parse a display time string to minutes-from-midnight
  const parseDisplayMins = (displayTime: string): number => {
    const [timePart, period] = displayTime.split(' ');
    const [h, m] = timePart.split(':').map(Number);
    let hours = h;
    if (period === 'PM' && h !== 12) hours += 12;
    if (period === 'AM' && h === 12) hours = 0;
    return hours * 60 + (m || 0);
  };

  const nowMins = currentHour * 60 + currentMinute;

  // Derive upcoming meals (items whose time is still in the future and not confirmed missed)
  const upcomingItems = useMemo(() => {
    if (!todayPlan) return [];

    const mapped = mapDailyPlanToScheduleItems(todayPlan);

    return mapped
      .filter((item) => {
        const conf = confirmations[item.id];
        // Only honour confirmations that belong to today
        const isToday = !conf || conf.dateStr === todayDateStr;
        if (isToday && conf?.status === 'missed') return false;
        if (isToday && conf?.status === 'done') return false;
        return parseDisplayMins(item.time) >= nowMins;
      })
      .slice(0, 3)
      .map((item) => ({
        time: item.time,
        title: item.title,
        subtitle: item.subtitle || '',
        icon: Utensils,
        color: Colors.light.secondary,
      }));
  }, [todayPlan, confirmations, nowMins, todayDateStr]);

  // Sum nutrients of confirmed-done items for today only.
  // Filter by dateStr to avoid counting confirmations from other days
  // (same recipe ID can appear across multiple days in a rotation).
  const consumedTotals = useMemo(() => {
    if (!todayPlan) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const slot of todayPlan.slots) {
      const recipeId = slot.plan?.main_recipe?.id?.toString();
      if (!recipeId) continue;
      const conf = confirmations[recipeId];
      if (conf?.status !== 'done') continue;
      if (conf.dateStr !== todayDateStr) continue; // only today's confirmations

      const n = slot.plan?.main_recipe?.nutrients;
      if (n) {
        calories += n.calories;
        protein += n.protein;
        carbs += n.carbohydrates;
        fat += n.fat;
      } else {
        calories += slot.calories;
        protein += slot.protein;
        carbs += slot.carbohydrates;
        fat += slot.fat;
      }
    }

    return { calories, protein, carbs, fat };
  }, [todayPlan, confirmations, todayDateStr]);

  // Derive macro data — when items have been confirmed, show consumed vs planned
  const macroData = useMemo(() => {
    const pct = (actual: number, target: number | undefined) =>
      target ? Math.min(100, Math.round((actual / target) * 100)) : 0;

    const calTarget = targets?.calories.target;
    const proTarget = targets?.protein.target;
    const carbTarget = targets?.carbohydrates.target;
    const fatTarget = targets?.fat.target;

    if (!todayPlan) {
      return {
        calories: {
          value: '--',
          percentage: 0,
          label: 'Calories',
          subtitle: calTarget ? `of ${Math.round(calTarget)}` : undefined,
        },
        protein: {
          value: '--',
          percentage: 0,
          label: 'Protein',
          subtitle: proTarget ? `of ${Math.round(proTarget)}g` : undefined,
        },
        carbs: {
          value: '--',
          percentage: 0,
          label: 'Carbs',
          subtitle: carbTarget ? `of ${Math.round(carbTarget)}g` : undefined,
        },
        fats: {
          value: '--',
          percentage: 0,
          label: 'Fat',
          subtitle: fatTarget ? `of ${Math.round(fatTarget)}g` : undefined,
        },
      };
    }

    // Always show confirmed-consumed amounts. Progress bar shows consumed vs target.
    return {
      calories: {
        value: `${consumedTotals.calories}`,
        percentage: pct(consumedTotals.calories, calTarget),
        label: 'Calories',
        subtitle: calTarget ? `of ${Math.round(calTarget)}` : undefined,
      },
      protein: {
        value: `${consumedTotals.protein}g`,
        percentage: pct(consumedTotals.protein, proTarget),
        label: 'Protein',
        subtitle: proTarget ? `of ${Math.round(proTarget)}g` : undefined,
      },
      carbs: {
        value: `${consumedTotals.carbs}g`,
        percentage: pct(consumedTotals.carbs, carbTarget),
        label: 'Carbs',
        subtitle: carbTarget ? `of ${Math.round(carbTarget)}g` : undefined,
      },
      fats: {
        value: `${consumedTotals.fat}g`,
        percentage: pct(consumedTotals.fat, fatTarget),
        label: 'Fat',
        subtitle: fatTarget ? `of ${Math.round(fatTarget)}g` : undefined,
      },
    };
  }, [todayPlan, targets, consumedTotals]);

  // Determine greeting based on time of day
  const greeting =
    currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={Colors.light.primary}
            testID="home-loading-indicator"
          />
        </View>
      )}
      {!isLoading && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {greeting}, {userName}
            </Text>
            <Text style={styles.headerSubtitle}>
              Let&apos;s make today healthy · {dayOfWeek}, {monthName} {day}
            </Text>
          </View>

          {/* Health Score Card */}
          <TouchableOpacity
            style={styles.scoreCard}
            onPress={() => router.push('/health-score')}
            activeOpacity={0.9}
          >
            <View style={styles.scoreHeader}>
              <View>
                <Text style={styles.scoreLabel}>Health Score</Text>
                <Text style={styles.scoreValue}>
                  {healthScore.overall == null ? '—' : healthScore.overall}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {healthScore.overall == null
                    ? 'Not measured'
                    : healthScore.overall >= 90
                      ? 'Excellent'
                      : healthScore.overall >= 70
                        ? 'Good'
                        : healthScore.overall >= 50
                          ? 'Fair'
                          : 'Needs Work'}
                </Text>
              </View>
            </View>

            <View style={styles.scoreDetails}>
              {[
                { label: 'Nutrition', sub: healthScore.nutrition },
                { label: 'Exercise', sub: healthScore.exercise },
                { label: 'Sleep', sub: healthScore.sleep },
              ].map((item, i) => (
                <View key={i} style={styles.scoreItem}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${item.sub?.score ?? 0}%` }]} />
                  </View>
                  <Text style={styles.scoreItemLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Today's Schedule */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/schedule')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>Full Schedule</Text>
                <ChevronRight size={24} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            {upcomingItems.length > 0 ? (
              <View style={styles.listContainer}>
                {upcomingItems.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.listItem, i === 0 && styles.activeListItem]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                      <item.icon size={24} color={item.color} />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <View style={styles.timeBox}>
                      <View style={styles.timeBadge}>
                        <Text style={styles.timeText}>{item.time}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyUpcoming}>
                <Text style={styles.emptyText}>
                  No meals planned yet. Head to the Schedule tab to plan your week!
                </Text>
              </View>
            )}
          </View>

          {/* Macros Progress */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today&apos;s Macros</Text>
            </View>
            <View style={styles.card}>
              <MacroNutrients data={macroData} />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    gap: 24,
    padding: 20,
    paddingBottom: 120,
  },
  header: {},
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  scoreCard: {
    backgroundColor: Colors.light.primary,
    borderRadius: Layout.cardRadius,
    paddingVertical: 20,
    paddingHorizontal: 24,
    ...Shadows.card,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 13,
    color: Colors.light.surface,
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.light.surface,
    lineHeight: 48,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 13,
    color: Colors.light.surface,
    fontWeight: '600',
  },
  scoreDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreItem: {
    flex: 1,
  },
  progressBarBg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  progressBarFill: {
    backgroundColor: Colors.light.surface,
    height: 4,
    borderRadius: 2,
  },
  scoreItemLabel: {
    fontSize: 13,
    color: Colors.light.surface,
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    paddingVertical: 20,
    paddingHorizontal: 24,
    ...Shadows.card,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Shadows.card,
  },
  activeListItem: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  timeBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeBadge: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyUpcoming: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 24,
    alignItems: 'center',
    ...Shadows.card,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },
});
