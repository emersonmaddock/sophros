import { MacroNutrients } from '@/components/MacroNutrients';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { useWeekScheduleQuery } from '@/lib/queries/schedule';
import { useUserQuery, useUserTargetsQuery } from '@/lib/queries/user';
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

function formatDisplayTime(isoDatetime: string): string {
  const d = new Date(isoDatetime);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m} ${period}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const { user: clerkUser } = useClerkUser();
  const userName = clerkUser?.firstName || 'there';

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

  const { data: scheduleItems = [], isLoading: isLoadingPlan } = useWeekScheduleQuery(weekStartStr);
  const { data: targets, isLoading: isLoadingTargets } = useUserTargetsQuery();
  const { data: user, isLoading: isLoadingUser } = useUserQuery();

  const isLoading = isLoadingPlan || isLoadingTargets || isLoadingUser;

  const nowMins = currentHour * 60 + currentMinute;

  const todayMealItems = useMemo(() => {
    return scheduleItems.filter((item) => {
      const d = new Date(item.date);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate() &&
        item.activity_type === 'meal'
      );
    });
  }, [scheduleItems, now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute health score
  const healthScore = useMemo(() => {
    const completedMeals = todayMealItems.filter((i) => i.is_completed);
    const totalMeals = todayMealItems.length;
    const nutritionScore = totalMeals > 0 ? Math.round((completedMeals.length / totalMeals) * 100) : 0;
    const overall = Math.round(nutritionScore * 0.4 + 70 * 0.6); // sleep+exercise default to 70
    return {
      overall,
      nutrition: { score: nutritionScore },
      exercise: { score: 70 },
      sleep: { score: 70 },
    };
  }, [todayMealItems]);

  // Derive upcoming meals (items whose time is still in the future and not completed)
  const upcomingItems = useMemo(() => {
    return todayMealItems
      .filter((item) => {
        if (item.is_completed) return false;
        const itemMins = new Date(item.date).getHours() * 60 + new Date(item.date).getMinutes();
        return itemMins >= nowMins;
      })
      .slice(0, 3)
      .map((item) => ({
        time: formatDisplayTime(item.date),
        title: item.meal?.title ?? 'Meal',
        subtitle: item.meal ? `${item.meal.calories} cal` : '',
        icon: Utensils,
        color: Colors.light.secondary,
      }));
  }, [todayMealItems, nowMins]);

  // Sum nutrients of completed meal items for today
  const consumedTotals = useMemo(() => {
    return todayMealItems
      .filter((item) => item.is_completed && item.meal)
      .reduce(
        (acc, item) => ({
          calories: acc.calories + (item.meal?.calories ?? 0),
          protein: acc.protein + (item.meal?.protein ?? 0),
          carbs: acc.carbs + (item.meal?.carbohydrates ?? 0),
          fat: acc.fat + (item.meal?.fat ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
  }, [todayMealItems]);

  // Derive macro data — when items have been confirmed, show consumed vs planned
  const macroData = useMemo(() => {
    const pct = (actual: number, target: number | undefined) =>
      target ? Math.min(100, Math.round((actual / target) * 100)) : 0;

    const calTarget = targets?.calories.target;
    const proTarget = targets?.protein.target;
    const carbTarget = targets?.carbohydrates.target;
    const fatTarget = targets?.fat.target;

    if (todayMealItems.length === 0) {
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

    // Always show consumed amounts. Progress bar shows consumed vs target.
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
  }, [todayMealItems, targets, consumedTotals]);

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
                <Text style={styles.scoreValue}>{healthScore.overall}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {healthScore.overall >= 90
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
                { label: 'Nutrition', value: healthScore.nutrition.score },
                { label: 'Exercise', value: healthScore.exercise.score },
                { label: 'Sleep', value: healthScore.sleep.score },
              ].map((item, i) => (
                <View key={i} style={styles.scoreItem}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${item.value}%` }]} />
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
