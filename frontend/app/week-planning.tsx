// frontend/app/week-planning.tsx
import type { MealRead, ScheduleItemRead } from '@/api/types.gen';
import { AlternativesModal } from '@/components/AlternativesModal';
import { Colors, Layout } from '@/constants/theme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGenerateWeekPlanMutation } from '@/lib/queries/mealPlan';
import {
  useDeleteScheduleItemMutation,
  useSwapMealMutation,
  useWeekScheduleQuery,
} from '@/lib/queries/schedule';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toLocalDateStr } from '@/utils/date';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getNextMonday(): string {
  const today = new Date();
  const d = new Date(today);
  d.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
  return toLocalDateStr(d);
}

function formatDisplayTime(isoDatetime: string): string {
  const d = new Date(isoDatetime);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m} ${period}`;
}

function getActivityLabel(item: ScheduleItemRead): string {
  switch (item.activity_type) {
    case 'meal':
      // Use the stored slot name (Breakfast / Lunch / Dinner) when available
      return item.meal_type ?? 'Meal';
    case 'exercise':
      return item.exercise_category ?? 'Workout';
    case 'sleep':
      return 'Sleep';
    default:
      return item.activity_type.charAt(0).toUpperCase() + item.activity_type.slice(1);
  }
}

function getDayIndex(isoDatetime: string, weekStart: string): number {
  const itemDate = new Date(isoDatetime);
  const monday = new Date(weekStart + 'T00:00:00');
  return Math.floor((itemDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
}

export default function WeekPlanningScreen() {
  const router = useRouter();
  const { weekStart: weekStartParam } = useLocalSearchParams<{ weekStart?: string }>();
  const weekStart = weekStartParam || getNextMonday();

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [swapItem, setSwapItem] = useState<ScheduleItemRead | null>(null);
  const [leftoverSourceTitle, setLeftoverSourceTitle] = useState<string | null>(null);

  const { loading: profileLoading } = useUserProfile();
  const { data: scheduleItems = [], isLoading } = useWeekScheduleQuery(weekStart);
  const generateMutation = useGenerateWeekPlanMutation();
  const swapMutation = useSwapMealMutation();
  const deleteMutation = useDeleteScheduleItemMutation();

  const mealItems = useMemo(
    () => scheduleItems.filter((i) => i.activity_type === 'meal'),
    [scheduleItems]
  );

  // Auto-generate if no meal items exist for this week.
  // Profile completeness is enforced in onboarding, so we don't gate on it here
  // — a transient null backendUser (e.g. API hiccup) shouldn't block generation.
  useEffect(() => {
    if (profileLoading || isLoading) return;
    if (mealItems.length > 0) return;
    if (generateMutation.isPending || generateMutation.isError) return;

    generateMutation.mutate(weekStart, {
      onError: () => Alert.alert('Error', 'Failed to generate meal plan. Please try again.'),
    });
  }, [
    profileLoading,
    isLoading,
    mealItems.length,
    weekStart,
    generateMutation,
    generateMutation.isPending,
    generateMutation.isError,
  ]);

  const dayItems = useMemo(() => {
    const filtered = scheduleItems.filter((item) => {
      if (item.activity_type === 'sleep') return false;
      // Exclude Google Calendar busy blocks — they are planning constraints, not schedule items
      if ((item as Record<string, unknown>).source_type === 'google_calendar') return false;
      return getDayIndex(item.date, weekStart) === selectedDayIndex;
    });
    // Sort by scheduled time ascending
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return filtered;
  }, [scheduleItems, selectedDayIndex, weekStart]);

  const handleRegenerate = () => {
    generateMutation.mutate(weekStart, {
      onError: () => Alert.alert('Error', 'Failed to regenerate meal plan.'),
    });
  };

  const handleDelete = (item: ScheduleItemRead) => {
    Alert.alert('Remove', `Remove "${item.meal?.title ?? 'item'}" from schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(
            { itemId: item.id, weekStartDate: weekStart },
            { onError: () => Alert.alert('Error', 'Failed to remove item.') }
          ),
      },
    ]);
  };

  const handleSwap = (item: ScheduleItemRead) => {
    if (item.source_schedule_item_id != null) {
      const sourceItem = scheduleItems.find((i) => i.id === item.source_schedule_item_id);
      setLeftoverSourceTitle(sourceItem?.meal?.title ?? 'the source meal');
      setSwapItem(item);
      return;
    }
    setLeftoverSourceTitle(null);
    if (!item.alternatives || item.alternatives.length === 0) {
      Alert.alert('No Alternatives', 'No alternative meals available for this slot.');
      return;
    }
    setSwapItem(item);
  };

  const handleSelectAlternative = (mealId: number) => {
    if (!swapItem) return;
    swapMutation.mutate(
      { itemId: swapItem.id, mealId, weekStartDate: weekStart },
      {
        onSuccess: () => setSwapItem(null),
        onError: () => Alert.alert('Error', 'Failed to swap meal.'),
      }
    );
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isGenerating = generateMutation.isPending || (isLoading && mealItems.length === 0);

  if (isGenerating) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.subtext}>Generating your personalized week plan…</Text>
          <Text style={[styles.subtext, { fontSize: 13 }]}>
            Finding recipes that match your goals
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Week Planning</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleRegenerate}
            style={styles.iconButton}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <RefreshCw size={20} color={Colors.light.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Day Selector — matches schedule tab's compact cards */}
      <View style={styles.daySelector}>
        {DAY_NAMES_SHORT.map((short, i) => {
          const d = new Date(weekStart + 'T00:00:00');
          d.setDate(d.getDate() + i);
          const isSelected = selectedDayIndex === i;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayCard, isSelected && styles.activeDayCard]}
              onPress={() => setSelectedDayIndex(i)}
            >
              <Text style={[styles.dayText, isSelected && styles.activeDayText]}>{short}</Text>
              <Text style={[styles.dateText, isSelected && styles.activeDateText]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Schedule Items */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{DAY_NAMES[selectedDayIndex]}&apos;s Schedule</Text>
          <Text style={styles.itemCount}>{dayItems.length} items</Text>
        </View>

        {dayItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No items planned for this day.</Text>
          </View>
        ) : (
          dayItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTime}>{formatDisplayTime(item.date)}</Text>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.meal?.title ?? getActivityLabel(item)}
                  </Text>
                  {item.meal && (
                    <Text style={styles.itemMacros}>
                      {item.meal.calories} cal · {item.meal.protein}g P · {item.meal.carbohydrates}g
                      C
                    </Text>
                  )}
                </View>
                <View style={styles.itemActions}>
                  {(item.source_schedule_item_id != null ||
                    (item.alternatives && item.alternatives.length > 0)) && (
                    <TouchableOpacity
                      onPress={() => handleSwap(item)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: `${Colors.light.primary}15` },
                      ]}
                    >
                      <Text style={[styles.actionButtonText, { color: Colors.light.primary }]}>
                        Swap
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={[styles.actionButton, { backgroundColor: '#FEE2E215' }]}
                  >
                    <Text style={[styles.actionButtonText, { color: Colors.light.error }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AlternativesModal
        visible={swapItem !== null}
        onClose={() => {
          setSwapItem(null);
          setLeftoverSourceTitle(null);
        }}
        currentMealTitle={swapItem?.meal?.title ?? null}
        alternatives={(swapItem?.alternatives ?? []) as MealRead[]}
        onSelect={handleSelectAlternative}
        leftoverSourceTitle={leftoverSourceTitle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.light.text, textAlign: 'center' },
  subtext: { fontSize: 14, color: Colors.light.textMuted, textAlign: 'center' },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayCard: {
    minWidth: 44,
    height: 68,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activeDayCard: { backgroundColor: Colors.light.primary, elevation: 4 },
  dayText: { fontSize: 12, fontWeight: '500', color: Colors.light.textMuted },
  activeDayText: { color: 'rgba(255,255,255,0.8)' },
  dateText: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  activeDateText: { color: '#FFFFFF' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  itemCount: { fontSize: 14, color: Colors.light.textMuted },
  emptyCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: Colors.light.textMuted },
  itemCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    marginBottom: 12,
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  itemContent: { flex: 1, gap: 2 },
  itemTime: { fontSize: 12, color: Colors.light.textMuted, fontWeight: '600' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  itemMacros: { fontSize: 12, color: Colors.light.textMuted },
  itemActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
});
