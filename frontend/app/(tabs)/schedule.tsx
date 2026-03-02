import { MealDetailModal } from '@/components/MealDetailModal';
import { Colors } from '@/constants/theme';
import { usePlannedWeeksQuery, useSavedWeekPlanQuery } from '@/lib/queries/mealPlan';
import { mapDailyPlanToScheduleItems } from '@/utils/mealPlanMapper';
import type { Day } from '@/api/types.gen';
import type { WeeklyScheduleItem } from '@/types/schedule';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ORDER: Day[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function getMonday(weekOffset: number): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Monday = 1, so offset from today to this week's Monday
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

type ScheduleItem = {
  time: string;
  title: string;
  subtitle?: string;
  duration: string;
  type: 'meal' | 'exercise' | 'sleep';
  status: 'completed' | 'current' | 'upcoming';
  recipe?: WeeklyScheduleItem['recipe'];
};

export default function SchedulePage() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<ScheduleItem | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const currentHour = today.getHours();

  // Compute which day index to default to
  // For current week, default to today; for other weeks, default to Monday (index 0)
  const todayMondayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1; // Mon=0..Sun=6
  const [selectedDayIndex, setSelectedDayIndex] = useState(weekOffset === 0 ? todayMondayIndex : 0);

  const mondayDate = getMonday(weekOffset);
  const weekStartStr = formatDateStr(mondayDate);

  const { data: savedPlan, isLoading: isLoadingPlan } = useSavedWeekPlanQuery(weekStartStr);
  const { data: plannedWeeks } = usePlannedWeeksQuery();

  // Build week dates (Mon-Sun)
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      return d;
    });
  }, [mondayDate.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert saved plan to schedule items for selected day
  const scheduleItems: ScheduleItem[] = useMemo(() => {
    const dayName = DAY_ORDER[selectedDayIndex];
    const dailyPlan = savedPlan?.plan_data?.daily_plans?.find((p) => p.day === dayName);

    if (!dailyPlan) return [];

    const mapped = mapDailyPlanToScheduleItems(dailyPlan);

    return mapped.map((item) => {
      const [timePart, period] = item.time.split(' ');
      const [hours] = timePart.split(':').map(Number);
      let itemHour = hours;
      if (period === 'PM' && hours !== 12) itemHour += 12;
      if (period === 'AM' && hours === 12) itemHour = 0;

      const isToday = weekOffset === 0 && selectedDayIndex === todayMondayIndex;
      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (isToday) {
        if (itemHour < currentHour) status = 'completed';
        else if (itemHour === currentHour) status = 'current';
      }

      return {
        time: item.time,
        title: item.title,
        subtitle: item.subtitle,
        duration: item.duration,
        type: 'meal' as const,
        status,
        recipe: item.recipe,
      };
    });
  }, [savedPlan, selectedDayIndex, weekOffset, currentHour, todayMondayIndex]);

  const handleItemPress = (item: ScheduleItem) => {
    if (item.type === 'meal') {
      setSelectedMeal(item);
      setModalVisible(true);
    }
  };

  const handleWeekChange = (direction: number) => {
    setWeekOffset((prev) => prev + direction);
    setSelectedDayIndex(0); // Reset to Monday when changing weeks
  };

  const handlePlanWeek = () => {
    // Find the next unplanned Monday
    const plannedSet = new Set(plannedWeeks ?? []);
    let candidate = getMonday(0); // Start from this week's Monday

    // Check up to 52 weeks ahead
    for (let i = 0; i < 52; i++) {
      const candidateStr = formatDateStr(candidate);
      if (!plannedSet.has(candidateStr)) {
        router.push(`/week-planning?weekStart=${candidateStr}`);
        return;
      }
      candidate.setDate(candidate.getDate() + 7);
    }

    // Fallback: next week
    const nextMonday = getMonday(1);
    router.push(`/week-planning?weekStart=${formatDateStr(nextMonday)}`);
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'meal':
        return Colors.light.secondary;
      case 'exercise':
        return Colors.light.primary;
      default:
        return Colors.light.charts.carbs;
    }
  };

  const isCurrentWeek = weekOffset === 0;

  const weekLabel = isCurrentWeek
    ? 'This Week'
    : weekOffset === 1
      ? 'Next Week'
      : weekOffset === -1
        ? 'Last Week'
        : (() => {
            const mon = weekDates[0];
            const sun = weekDates[6];
            const fmt = (d: Date) =>
              d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `${fmt(mon)} - ${fmt(sun)}`;
          })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly Schedule</Text>
          <Text style={styles.headerSubtitle}>AI-optimized</Text>
        </View>

        {/* Week Navigation */}
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => handleWeekChange(-1)} style={styles.weekNavButton}>
            <ChevronLeft size={20} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.weekNavLabel}>{weekLabel}</Text>
          <TouchableOpacity onPress={() => handleWeekChange(1)} style={styles.weekNavButton}>
            <ChevronRight size={20} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Day Selector (Mon-Sun) */}
        <View style={styles.daySelector}>
          {weekDates.map((date, i) => {
            const isSelected = selectedDayIndex === i;
            const isTodayDot = isCurrentWeek && i === todayMondayIndex && !isSelected;

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCard, isSelected && styles.activeDayCard]}
                onPress={() => setSelectedDayIndex(i)}
              >
                <Text style={[styles.dayText, isSelected && styles.activeDayText]}>
                  {DAY_NAMES_SHORT[date.getDay()]}
                </Text>
                <Text style={[styles.dateText, isSelected && styles.activeDateText]}>
                  {date.getDate()}
                </Text>
                {isTodayDot && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline */}
        {isLoadingPlan ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptySubtitle}>Loading...</Text>
          </View>
        ) : scheduleItems.length > 0 ? (
          <View style={styles.timeline}>
            {scheduleItems.map((item, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timeColumn}>
                  <Text style={styles.itemTime}>{item.time}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.eventCard,
                    { borderLeftColor: getBorderColor(item.type) },
                    item.status === 'completed' && { opacity: 0.6 },
                  ]}
                  onPress={() => handleItemPress(item)}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {item.title}
                        {item.status === 'completed' && ' ✓'}
                      </Text>
                      {item.status === 'current' && (
                        <View style={styles.nowBadge}>
                          <Text style={styles.nowText}>NOW</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{item.duration}</Text>
                    </View>
                  </View>

                  {item.subtitle && <Text style={styles.eventSubtitle}>{item.subtitle}</Text>}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No meals planned</Text>
            <Text style={styles.emptySubtitle}>
              {savedPlan ? 'No meals scheduled for this day' : 'No plan saved for this week yet'}
            </Text>
            {!savedPlan && (
              <TouchableOpacity
                style={styles.planThisWeekButton}
                onPress={() => router.push(`/week-planning?weekStart=${weekStartStr}`)}
              >
                <Calendar size={18} color="#FFF" />
                <Text style={styles.planThisWeekText}>Plan This Week</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Plan Button */}
        <TouchableOpacity style={styles.planButton} onPress={handlePlanWeek}>
          <Calendar size={20} color="#FFF" />
          <Text style={styles.planButtonText}>Plan Next Week</Text>
        </TouchableOpacity>
      </ScrollView>

      <MealDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        meal={selectedMeal}
      />
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
    paddingBottom: 120,
  },
  header: {
    marginBottom: 16,
  },
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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    minWidth: 120,
    textAlign: 'center',
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  activeDayCard: {
    backgroundColor: Colors.light.primary,
    elevation: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textMuted,
  },
  activeDayText: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  activeDateText: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
    position: 'absolute',
    bottom: 4,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timeColumn: {
    width: 60,
    paddingTop: 4,
  },
  itemTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  eventCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  nowBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  durationBadge: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  eventSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },
  planThisWeekButton: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  planThisWeekText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  planButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
