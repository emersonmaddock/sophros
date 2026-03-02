import { MealDetailModal } from '@/components/MealDetailModal';
import { Colors } from '@/constants/theme';
import { useWeeklyMealPlanQuery } from '@/lib/queries/mealPlan';
import { mapDailyPlanToScheduleItems } from '@/utils/mealPlanMapper';
import type { Day } from '@/api/types.gen';
import type { WeeklyScheduleItem } from '@/types/schedule';
import { useRouter } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  const { data: weeklyPlan } = useWeeklyMealPlanQuery();

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const currentHour = today.getHours();

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - todayDayOfWeek);

  const weekDates = days.map((_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return date.getDate();
  });

  // Convert today's API plan to schedule items
  const scheduleItems: ScheduleItem[] = useMemo(() => {
    const todayApiDay = JS_DAY_TO_API_DAY[todayDayOfWeek];
    const todayPlan = weeklyPlan?.daily_plans?.find((p) => p.day === todayApiDay);

    if (!todayPlan) {
      // Fallback to empty state if no plan cached
      return [];
    }

    const mapped = mapDailyPlanToScheduleItems(todayPlan);

    return mapped.map((item) => {
      // Parse time to determine status
      const [timePart, period] = item.time.split(' ');
      const [hours] = timePart.split(':').map(Number);
      let itemHour = hours;
      if (period === 'PM' && hours !== 12) itemHour += 12;
      if (period === 'AM' && hours === 12) itemHour = 0;

      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (itemHour < currentHour) status = 'completed';
      else if (itemHour === currentHour) status = 'current';

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
  }, [weeklyPlan, todayDayOfWeek, currentHour]);

  const handleItemPress = (item: ScheduleItem) => {
    if (item.type === 'meal') {
      setSelectedMeal(item);
      setModalVisible(true);
    }
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly Schedule</Text>
          <Text style={styles.headerSubtitle}>AI-optimized</Text>
        </View>

        {/* Day Selector */}
        <View style={styles.daySelector}>
          {days.map((day, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayCard, i === todayDayOfWeek && styles.activeDayCard]}
            >
              <Text style={[styles.dayText, i === todayDayOfWeek && styles.activeDayText]}>
                {day}
              </Text>
              <Text style={[styles.dateText, i === todayDayOfWeek && styles.activeDateText]}>
                {weekDates[i]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timeline */}
        {scheduleItems.length > 0 ? (
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
            <Text style={styles.emptyTitle}>No meals planned yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a week plan to see your daily meals here
            </Text>
          </View>
        )}

        {/* Plan Next Week Button */}
        <TouchableOpacity style={styles.planButton} onPress={() => router.push('/week-planning')}>
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
    marginBottom: 24,
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
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayCard: {
    minWidth: 48,
    height: 64,
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
