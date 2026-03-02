import { EditItemModal } from '@/components/EditItemModal';
import { MealDetailModal } from '@/components/MealDetailModal';
import { Colors } from '@/constants/theme';
import { useScheduleEditing } from '@/hooks/useScheduleEditing';
import { useSavedWeekPlanQuery } from '@/lib/queries/mealPlan';
import type { Day } from '@/api/types.gen';
import type { ItemType, WeeklyScheduleItem } from '@/types/schedule';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight, Dumbbell, Plus, Utensils } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
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
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  duration: string;
  type: 'meal' | 'workout' | 'sleep';
  status: 'completed' | 'current' | 'upcoming';
  recipe?: WeeklyScheduleItem['recipe'];
  workoutType?: string;
};

export default function SchedulePage() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<ScheduleItem | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // EditItemModal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalItem, setEditModalItem] = useState<WeeklyScheduleItem | null>(null);
  const [editModalMode, setEditModalMode] = useState<'edit' | 'add'>('edit');
  const [editModalItemType, setEditModalItemType] = useState<ItemType>('meal');

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

  const {
    isDirty,
    saveStatus,
    statusText,
    save,
    removeItem,
    addItem,
    editItem,
    getScheduleItems,
  } = useScheduleEditing(savedPlan, weekStartStr);

  // Build week dates (Mon-Sun)
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      return d;
    });
  }, [mondayDate.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDayName = DAY_ORDER[selectedDayIndex];

  // Derive schedule items from the editing hook
  const scheduleItems: ScheduleItem[] = useMemo(() => {
    const mapped = getScheduleItems(selectedDayIndex);

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
        id: item.id,
        time: item.time,
        title: item.title,
        subtitle: item.subtitle,
        duration: item.duration,
        type: item.type,
        status,
        recipe: item.recipe,
        workoutType: item.workoutType,
      };
    });
  }, [getScheduleItems, selectedDayIndex, weekOffset, currentHour, todayMondayIndex]);

  const handleItemPress = useCallback((item: ScheduleItem) => {
    if (item.type === 'meal' && item.recipe) {
      setSelectedMeal(item);
      setModalVisible(true);
    } else {
      // Non-meal items open EditItemModal directly
      setEditModalItem({
        id: item.id,
        time: item.time,
        title: item.title,
        subtitle: item.subtitle,
        duration: item.duration,
        type: item.type,
        workoutType: item.workoutType,
      });
      setEditModalMode('edit');
      setEditModalItemType(item.type);
      setEditModalVisible(true);
    }
  }, []);

  const handleMealModify = useCallback((meal: { time: string; title?: string; subtitle?: string; type: string; recipe?: WeeklyScheduleItem['recipe'] }) => {
    setEditModalItem({
      id: meal.recipe?.id?.toString() || `${Date.now()}`,
      time: meal.time,
      title: meal.title || 'Meal',
      subtitle: meal.subtitle,
      duration: '30 min',
      type: 'meal',
      recipe: meal.recipe,
    });
    setEditModalMode('edit');
    setEditModalItemType('meal');
    setEditModalVisible(true);
  }, []);

  const handleMealRemove = useCallback((meal: { time: string; title?: string; recipe?: WeeklyScheduleItem['recipe'] }) => {
    const itemId = meal.recipe?.id?.toString() || '';
    Alert.alert(
      'Remove Item',
      `Remove "${meal.title || 'this item'}" from the schedule?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItem(selectedDayName, itemId),
        },
      ]
    );
  }, [removeItem, selectedDayName]);

  const handleEditSave = useCallback(
    (updatedItem: WeeklyScheduleItem) => {
      if (editModalMode === 'add') {
        addItem(selectedDayName, updatedItem);
      } else if (editModalItem) {
        editItem(selectedDayName, editModalItem.id, updatedItem);
      }
    },
    [editModalMode, editModalItem, addItem, editItem, selectedDayName]
  );

  const handleAddItem = useCallback((type: ItemType) => {
    setEditModalItem(null);
    setEditModalMode('add');
    setEditModalItemType(type);
    setEditModalVisible(true);
  }, []);

  const handleWeekChange = (direction: number) => {
    setWeekOffset((prev) => prev + direction);
    setSelectedDayIndex(0); // Reset to Monday when changing weeks
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'meal':
        return Colors.light.secondary;
      case 'workout':
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
          <Text style={[styles.headerSubtitle, saveStatus === 'error' && { color: Colors.light.error }]}>
            {statusText}
          </Text>
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
              <View key={item.id || i} style={styles.timelineItem}>
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

        {/* Add Item Section */}
        {savedPlan && (
          <View style={styles.addItemSection}>
            <Text style={styles.addItemLabel}>Add Item</Text>
            <View style={styles.addItemRow}>
              <TouchableOpacity style={styles.addItemCard} onPress={() => handleAddItem('meal')}>
                <Utensils size={20} color={Colors.light.secondary} />
                <Text style={styles.addItemText}>Meal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addItemCard} onPress={() => handleAddItem('workout')}>
                <Dumbbell size={20} color={Colors.light.primary} />
                <Text style={styles.addItemText}>Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Save Changes Button */}
        {isDirty && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={save}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Plus size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <MealDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        meal={selectedMeal}
        onModify={handleMealModify}
        onRemove={handleMealRemove}
      />

      <EditItemModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        item={editModalItem}
        onSave={handleEditSave}
        mode={editModalMode}
        itemType={editModalItemType}
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
  addItemSection: {
    marginTop: 24,
  },
  addItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginBottom: 12,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addItemCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.light.textMuted,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexDirection: 'row',
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  saveButton: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
