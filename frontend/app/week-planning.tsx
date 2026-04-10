import type {
  BusyTime,
  DailyMealPlanOutput,
  Day,
  MealSlotTargetOutput,
  Recipe,
  WeeklyMealPlanOutput,
} from '@/api/types.gen';
import { AlternativesModal } from '@/components/AlternativesModal';
import { EditItemModal } from '@/components/EditItemModal';
import { ScheduleItemCard } from '@/components/ScheduleItemCard';
import { Colors, Layout } from '@/constants/theme';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  useGenerateWeekPlanMutation,
  useSaveMealPlanMutation,
  useWeeklyMealPlanOutputQuery,
} from '@/lib/queries/mealPlan';
import type { DaySchedule, ItemType, WeeklyScheduleItem } from '@/types/schedule';
import { mapDailyPlanToScheduleItems } from '@/utils/mealPlanMapper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, RefreshCw, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

const DAY_ORDER: Day[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function weeklyPlanToDaySchedules(plan: WeeklyMealPlanOutput, weekStart: string): DaySchedule[] {
  const monday = new Date(weekStart + 'T00:00:00');

  return DAY_ORDER.map((dayName, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    const dailyPlan = plan.daily_plans?.find((p: { day: Day }) => p.day === dayName);
    const items = dailyPlan ? mapDailyPlanToScheduleItems(dailyPlan) : [];

    return {
      dayOfWeek: date.getDay(),
      date,
      items,
    };
  });
}

function getNextMonday(): string {
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
  return nextMonday.toISOString().split('T')[0];
}

export default function WeekPlanningScreen() {
  const router = useRouter();
  const { weekStart: weekStartParam } = useLocalSearchParams<{ weekStart?: string }>();
  const weekStart = weekStartParam || getNextMonday();

  const [weekPlan, setWeekPlan] = useState<DaySchedule[]>([]);
  const [rawPlan, setRawPlan] = useState<WeeklyMealPlanOutput | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WeeklyScheduleItem | null>(null);
  const [alternatives, setAlternatives] = useState<WeeklyScheduleItem[]>([]);
  const [editMode, setEditMode] = useState<'edit' | 'add' | 'replace'>('edit');
  const [addItemType, setAddItemType] = useState<ItemType>('meal');

  // Global alternative pools — persist across swaps until plan is confirmed.
  // When a user swaps meal A for alternative B: B leaves the pool, A enters it.
  // This allows swapping back at any point during drafting.
  type AltPool = {
    breakfast: WeeklyScheduleItem[];
    lunch: WeeklyScheduleItem[];
    dinner: WeeklyScheduleItem[];
  };
  const [altPool, setAltPool] = useState<AltPool>({ breakfast: [], lunch: [], dinner: [] });

  const generateWeekMutation = useGenerateWeekPlanMutation();
  const saveMutation = useSaveMealPlanMutation();
  const { data: cachedPlan } = useWeeklyMealPlanOutputQuery();

  const { backendUser, loading: profileLoading } = useUserProfile();

  const recipeToAltItem = (
    recipe: Recipe,
    slotName: 'Breakfast' | 'Lunch' | 'Dinner'
  ): WeeklyScheduleItem => ({
    id: recipe.id,
    time: '',
    title: recipe.title,
    subtitle: `${recipe.nutrients.calories} cal · ${recipe.nutrients.protein}g protein`,
    duration: recipe.preparation_time_minutes ? `${recipe.preparation_time_minutes} min` : '30 min',
    type: 'meal',
    calories: recipe.nutrients.calories,
    recipe,
    slotName,
  });

  const initAltPool = (data: WeeklyMealPlanOutput): AltPool => ({
    breakfast: (data.breakfast_alternatives ?? []).map((r) => recipeToAltItem(r, 'Breakfast')),
    lunch: (data.lunch_alternatives ?? []).map((r) => recipeToAltItem(r, 'Lunch')),
    dinner: (data.dinner_alternatives ?? []).map((r) => recipeToAltItem(r, 'Dinner')),
  });

  useEffect(() => {
    // If profile is still loading, wait
    if (profileLoading) return;

    // If critical settings are missing, don't generate automatically
    if (!backendUser?.target_weight || !backendUser?.target_date) {
      return;
    }

    // If we have a cached plan, use it
    if (cachedPlan) {
      setRawPlan(cachedPlan);
      setWeekPlan(weeklyPlanToDaySchedules(cachedPlan, weekStart));
      setAltPool(initAltPool(cachedPlan));
      return;
    }

    // Otherwise, generate a new plan
    generateWeekMutation.mutate(undefined, {
      onSuccess: (data) => {
        setRawPlan(data);
        setWeekPlan(weeklyPlanToDaySchedules(data, weekStart));
        setAltPool(initAltPool(data));
      },
      onError: (error) => {
        Alert.alert('Error', 'Failed to generate meal plan. Please try again.');
        console.error('[WeekPlanning] Generation error:', error);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, backendUser]);

  const handleRegenerate = () => {
    generateWeekMutation.mutate(undefined, {
      onSuccess: (data) => {
        setRawPlan(data);
        setWeekPlan(weeklyPlanToDaySchedules(data, weekStart));
        setAltPool(initAltPool(data));
      },
      onError: () => {
        Alert.alert('Error', 'Failed to regenerate meal plan.');
      },
    });
  };

  const handleConfirmSave = () => {
    if (!rawPlan) return;

    Alert.alert('Confirm Plan', 'Save this meal plan for the week?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: () => {
          saveMutation.mutate(
            { week_start_date: weekStart, plan_data: rawPlan },
            {
              onSuccess: () => {
                Alert.alert('Saved', 'Your meal plan has been saved.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              },
              onError: () => {
                Alert.alert('Error', 'Failed to save meal plan. Please try again.');
              },
            }
          );
        },
      },
    ]);
  };

  const handleSwap = (item: WeeklyScheduleItem) => {
    const slotKey = (item.slotName?.toLowerCase() ?? 'lunch') as keyof AltPool;
    setSelectedItem(item);
    setAlternatives(altPool[slotKey] ?? []);
    setSwapModalVisible(true);
  };

  const handleSelectAlternative = (alternative: WeeklyScheduleItem) => {
    if (!selectedItem) return;

    const cookDay = DAY_ORDER[selectedDayIndex];
    const cookSlotName = selectedItem.slotName;
    const slotKey = (cookSlotName?.toLowerCase() ?? 'lunch') as keyof AltPool;

    // Mutate the alt pool: remove the chosen alternative, add the displaced primary
    setAltPool((prev) => {
      const oldPrimary: WeeklyScheduleItem = {
        ...selectedItem,
        id: selectedItem.recipe?.id ?? selectedItem.id,
        slotName: cookSlotName,
      };
      return {
        ...prev,
        [slotKey]: [...prev[slotKey].filter((a) => a.id !== alternative.id), oldPrimary],
      };
    });

    // Update weekPlan display
    setWeekPlan((prevPlan) =>
      prevPlan.map((day, dayIdx) => {
        return {
          ...day,
          items: day.items.map((item) => {
            // Swap the cook slot
            if (dayIdx === selectedDayIndex && item.id === selectedItem.id) {
              return {
                ...alternative,
                id: item.id,
                time: item.time,
                duration: item.duration,
                isLeftover: false,
                slotName: cookSlotName,
              };
            }
            // Sync any leftover that pairs with this cook slot
            if (
              item.isLeftover &&
              item.leftoverFromDay === cookDay &&
              item.leftoverFromSlot === cookSlotName
            ) {
              return {
                ...item,
                title: alternative.title,
                subtitle: alternative.subtitle,
                recipe: alternative.recipe,
                calories: alternative.calories,
              };
            }
            return item;
          }),
        };
      })
    );

    // Update raw plan to keep in sync for saving
    if (rawPlan && alternative.recipe) {
      setRawPlan((prev: WeeklyMealPlanOutput | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          daily_plans: prev.daily_plans.map((dp: DailyMealPlanOutput) => ({
            ...dp,
            slots: dp.slots.map((slot: MealSlotTargetOutput) => {
              // Update the cook slot
              if (dp.day === cookDay && slot.plan?.main_recipe?.id === selectedItem.id) {
                return {
                  ...slot,
                  plan: { ...slot.plan, main_recipe: alternative.recipe ?? null },
                };
              }
              // Sync paired leftover slot
              if (
                slot.is_leftover &&
                slot.leftover_from_day === cookDay &&
                slot.leftover_from_slot === cookSlotName
              ) {
                return {
                  ...slot,
                  plan: { ...slot.plan, main_recipe: alternative.recipe ?? null },
                };
              }
              return slot;
            }),
          })),
        };
      });
    }
  };

  const handleSaveEdit = (updatedItem: WeeklyScheduleItem) => {
    if (editMode === 'replace' && selectedItem) {
      // Replace the existing slot with the manually entered item
      const cookDay = DAY_ORDER[selectedDayIndex];
      const cookSlotName = selectedItem.slotName;
      setWeekPlan((prevPlan) =>
        prevPlan.map((day, dayIdx) => ({
          ...day,
          items: day.items.map((item) => {
            if (dayIdx === selectedDayIndex && item.id === selectedItem.id) {
              return {
                ...updatedItem,
                id: item.id,
                time: item.time,
                isLeftover: false,
                slotName: cookSlotName,
              };
            }
            if (
              item.isLeftover &&
              item.leftoverFromDay === cookDay &&
              item.leftoverFromSlot === cookSlotName
            ) {
              return {
                ...item,
                title: updatedItem.title,
                subtitle: updatedItem.subtitle,
                calories: updatedItem.calories,
              };
            }
            return item;
          }),
        }))
      );
    } else {
      setWeekPlan((prevPlan) =>
        prevPlan.map((day, dayIdx) => {
          if (dayIdx === selectedDayIndex) {
            return {
              ...day,
              items: [...day.items, updatedItem].sort((a, b) => {
                const timeA = convertTimeToMinutes(a.time);
                const timeB = convertTimeToMinutes(b.time);
                return timeA - timeB;
              }),
            };
          }
          return day;
        })
      );
    }
  };

  const handleAddManual = (type: ItemType) => {
    // Keep selectedItem set so handleSaveEdit can replace the correct slot
    setSwapModalVisible(false);
    setAddItemType(type);
    setEditMode('replace');
    setEditModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setWeekPlan((prevPlan) =>
            prevPlan.map((day, dayIdx) => {
              if (dayIdx === selectedDayIndex) {
                return {
                  ...day,
                  items: day.items.filter((item) => item.id !== id),
                };
              }
              return day;
            })
          );
        },
      },
    ]);
  };

  const convertTimeToMinutes = (time: string): number => {
    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes;
    if (period === 'PM') totalMinutes += 12 * 60;
    return totalMinutes;
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const formatBusyTime = (t: string | undefined): string => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

  const busyTimeToMinutes = (t: string | undefined): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatDate = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!backendUser?.target_weight || !backendUser?.target_date) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Sparkles size={48} color={Colors.light.secondary} style={{ marginBottom: 16 }} />
          <Text
            style={[
              styles.loadingText,
              { fontWeight: '700', fontSize: 20, color: Colors.light.text },
            ]}
          >
            Complete Your Profile
          </Text>
          <Text style={[styles.loadingSubtext, { textAlign: 'center', paddingHorizontal: 40 }]}>
            To generate a personalized meal plan, we need your target weight and goal date.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { marginTop: 12 }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.retryButtonText}>Go to Profile Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (weekPlan.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          {generateWeekMutation.isPending ? (
            <>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={styles.loadingText}>Generating your personalized week plan...</Text>
              <Text style={styles.loadingSubtext}>Finding recipes that match your goals</Text>
            </>
          ) : generateWeekMutation.isError ? (
            <>
              <Text style={styles.loadingText}>Something went wrong</Text>
              <View style={styles.errorButtons}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRegenerate}>
                  <RefreshCw size={20} color="#FFF" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: '#F3F4F6' }]}
                  onPress={() => router.back()}
                >
                  <ArrowLeft size={20} color={Colors.light.text} />
                  <Text style={[styles.retryButtonText, { color: Colors.light.text }]}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Sparkles size={48} color={Colors.light.primary} />
              <Text style={styles.loadingText}>Preparing your week plan...</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const selectedDay = weekPlan[selectedDayIndex];

  type ScheduleRow =
    | { kind: 'item'; item: WeeklyScheduleItem; sortKey: number }
    | { kind: 'busy'; bt: BusyTime; sortKey: number }
    | { kind: 'wake' | 'sleep'; label: string; sortKey: number };

  const sortedRows: ScheduleRow[] = [
    ...selectedDay.items.map(
      (item): ScheduleRow => ({ kind: 'item', item, sortKey: convertTimeToMinutes(item.time) })
    ),
    ...(backendUser?.busy_times ?? [])
      .filter((bt) => bt.day === DAY_ORDER[selectedDayIndex])
      .map((bt): ScheduleRow => ({ kind: 'busy', bt, sortKey: busyTimeToMinutes(bt.start) })),
    ...(backendUser?.wake_up_time
      ? [
          {
            kind: 'wake' as const,
            label: formatBusyTime(backendUser.wake_up_time),
            sortKey: busyTimeToMinutes(backendUser.wake_up_time),
          },
        ]
      : []),
    ...(backendUser?.sleep_time
      ? [
          {
            kind: 'sleep' as const,
            label: formatBusyTime(backendUser.sleep_time),
            sortKey: busyTimeToMinutes(backendUser.sleep_time),
          },
        ]
      : []),
  ].sort((a, b) => a.sortKey - b.sortKey);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Week Planning</Text>
          <Text style={styles.headerSubtitle}>Draft - Review & Save</Text>
        </View>
        <TouchableOpacity
          onPress={handleRegenerate}
          style={styles.backButton}
          disabled={generateWeekMutation.isPending}
        >
          {generateWeekMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <RefreshCw size={20} color={Colors.light.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {weekPlan.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dayCard, selectedDayIndex === index && styles.activeDayCard]}
            onPress={() => setSelectedDayIndex(index)}
          >
            <Text style={[styles.dayName, selectedDayIndex === index && styles.activeDayName]}>
              {getDayName(day.dayOfWeek)}
            </Text>
            <Text style={[styles.dayDate, selectedDayIndex === index && styles.activeDayDate]}>
              {formatDate(day.date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Schedule Items */}
      <ScrollView style={styles.scheduleContainer} contentContainerStyle={styles.scheduleContent}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>
            {getDayName(selectedDay.dayOfWeek)}&apos;s Schedule
          </Text>
          <Text style={styles.itemCount}>{selectedDay.items.length} items</Text>
        </View>

        {sortedRows.map((row, i) => {
          if (row.kind === 'item') {
            return (
              <ScheduleItemCard
                key={row.item.id}
                item={row.item}
                onSwap={handleSwap}
                onDelete={handleDelete}
              />
            );
          }
          if (row.kind === 'busy') {
            return (
              <View key={`busy-${i}`} style={styles.busyCard}>
                <View style={styles.busyIndicator} />
                <View>
                  <Text style={styles.busyLabel}>Busy</Text>
                  <Text style={styles.busyTime}>
                    {formatBusyTime(row.bt.start)} – {formatBusyTime(row.bt.end)}
                  </Text>
                </View>
              </View>
            );
          }
          return (
            <View key={`${row.kind}-${i}`} style={styles.timeMarkerRow}>
              <View
                style={[styles.timeMarkerLine, row.kind === 'sleep' && styles.timeMarkerLineSleep]}
              />
              <Text
                style={[
                  styles.timeMarkerLabel,
                  row.kind === 'sleep' && styles.timeMarkerLabelSleep,
                ]}
              >
                {row.kind === 'wake' ? '☀️' : '🌙'} {row.kind === 'wake' ? 'Wake Up' : 'Bedtime'} ·{' '}
                {row.label}
              </Text>
              <View
                style={[styles.timeMarkerLine, row.kind === 'sleep' && styles.timeMarkerLineSleep]}
              />
            </View>
          );
        })}

        {/* Confirm & Save Button */}
        <TouchableOpacity
          style={[styles.confirmButton, saveMutation.isPending && { opacity: 0.6 }]}
          onPress={handleConfirmSave}
          disabled={saveMutation.isPending || !rawPlan}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Check size={20} color="#FFF" />
          )}
          <Text style={styles.confirmButtonText}>
            {saveMutation.isPending ? 'Saving...' : 'Confirm & Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <AlternativesModal
        visible={swapModalVisible}
        onClose={() => setSwapModalVisible(false)}
        item={selectedItem}
        alternatives={alternatives}
        onSelect={handleSelectAlternative}
        onAddManual={handleAddManual}
      />

      <EditItemModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        item={selectedItem}
        onSave={handleSaveEdit}
        mode={editMode}
        itemType={addItemType}
        inheritedTime={editMode === 'replace' ? (selectedItem?.time ?? undefined) : undefined}
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  loadingSubtext: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.light.secondary,
    fontWeight: '500',
  },
  daySelector: {
    maxHeight: 90,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  daySelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  dayCard: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Layout.cardRadius,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeDayCard: {
    backgroundColor: Colors.light.primary,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  activeDayName: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  activeDayDate: {
    color: 'rgba(255,255,255,0.8)',
  },
  scheduleContainer: {
    flex: 1,
  },
  scheduleContent: {
    padding: 20,
    paddingBottom: 100,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  itemCount: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  addSection: {
    marginTop: 24,
  },
  addSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  addButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  addButtonEmoji: {
    fontSize: 24,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  confirmButton: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timeMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  timeMarkerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FCD34D',
  },
  timeMarkerLineSleep: {
    backgroundColor: '#A5B4FC',
  },
  timeMarkerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  timeMarkerLabelSleep: {
    color: '#4338CA',
  },
  busyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 14,
    marginBottom: 10,
  },
  busyIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    backgroundColor: Colors.light.error,
  },
  busyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.error,
  },
  busyTime: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
});
