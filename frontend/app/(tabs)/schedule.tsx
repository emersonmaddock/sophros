import { EditItemModal } from '@/components/EditItemModal';
import { MealDetailModal } from '@/components/MealDetailModal';
import { MissedItemModal } from '@/components/MissedItemModal';
import {
  SleepWakePrompt,
  clearFutureSleepData,
  shouldShowSleepPrompt,
} from '@/components/SleepWakePrompt';
import { SwipeableScheduleItem } from '@/components/SwipeableScheduleItem';
import { Colors } from '@/constants/theme';
import type { ScheduleItemRead } from '@/api/types.gen';
import type { ItemType, WeeklyScheduleItem } from '@/types/schedule';
import {
  useCompleteScheduleItemMutation,
  useCreateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useUpdateScheduleItemMutation,
  useWeekScheduleQuery,
} from '@/lib/queries/schedule';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight, Dumbbell, Plus, Utensils } from 'lucide-react-native';
import { useNow } from '@/hooks/useNow';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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


/** Derive a display time string (e.g. "7:30 AM") from an ISO date string */
function getDisplayTime(isoDate: string): string {
  const d = new Date(isoDate);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Derive a display title from a ScheduleItemRead */
function getItemTitle(item: ScheduleItemRead): string {
  if (item.meal?.title) return item.meal.title;
  switch (item.activity_type) {
    case 'meal':
      return 'Meal';
    case 'exercise':
      return 'Workout';
    case 'sleep':
      return 'Sleep';
    default:
      return item.activity_type.charAt(0).toUpperCase() + item.activity_type.slice(1);
  }
}

/** Derive a display duration string from duration_minutes */
function getDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Convert display time string to minutes since midnight */
function parseTimeToMins(displayTime: string): number {
  const [timePart, period] = displayTime.split(' ');
  const [h, m] = timePart.split(':').map(Number);
  let hours = h;
  if (period === 'PM' && h !== 12) hours += 12;
  if (period === 'AM' && h === 12) hours = 0;
  return hours * 60 + (m || 0);
}

/** Map ScheduleItemRead activity_type to MissedItemModal's expected type */
function getMissedItemType(item: ScheduleItemRead): 'meal' | 'workout' | 'sleep' {
  if (item.activity_type === 'meal') return 'meal';
  if (item.activity_type === 'sleep') return 'sleep';
  return 'workout';
}

export default function SchedulePage() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItemRead | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // EditItemModal state (used for add flow)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalItem, setEditModalItem] = useState<WeeklyScheduleItem | null>(null);
  const [editModalMode, setEditModalMode] = useState<'edit' | 'add'>('edit');
  const [editModalItemType, setEditModalItemType] = useState<ItemType>('meal');

  const [missedModalItem, setMissedModalItem] = useState<ScheduleItemRead | null>(null);

  const now = useNow();
  const todayDayOfWeek = now.getDay();

  // Sleep/wake daily prompt — re-evaluated whenever the current date changes
  const [showSleepPrompt, setShowSleepPrompt] = useState(false);
  useEffect(() => {
    clearFutureSleepData(now)
      .then(() => shouldShowSleepPrompt(now))
      .then(setShowSleepPrompt);
  }, [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute which day index to default to
  const todayMondayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1; // Mon=0..Sun=6
  const [selectedDayIndex, setSelectedDayIndex] = useState(weekOffset === 0 ? todayMondayIndex : 0);

  const mondayDate = getMonday(weekOffset);
  const weekStartStr = formatDateStr(mondayDate);

  const { data: scheduleItems = [], isLoading: isLoadingPlan } = useWeekScheduleQuery(weekStartStr);
  const completeMutation = useCompleteScheduleItemMutation();
  const createMutation = useCreateScheduleItemMutation();
  const updateMutation = useUpdateScheduleItemMutation();
  const deleteMutation = useDeleteScheduleItemMutation();

  // Build week dates (Mon-Sun)
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      return d;
    });
  }, [mondayDate.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const dayItems: ScheduleItemRead[] = useMemo(() => {
    const monday = mondayDate.getTime();
    return scheduleItems.filter((item) => {
      const itemDay = Math.floor((new Date(item.date).getTime() - monday) / (1000 * 60 * 60 * 24));
      return itemDay === selectedDayIndex;
    });
  }, [scheduleItems, selectedDayIndex, mondayDate.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleItemPress = useCallback((item: ScheduleItemRead) => {
    if (item.activity_type === 'meal' && item.meal) {
      setSelectedItem(item);
      setModalVisible(true);
    } else {
      // Non-meal items open EditItemModal for editing
      const displayTime = getDisplayTime(item.date);
      setEditModalItem({
        id: String(item.id),
        time: displayTime,
        title: getItemTitle(item),
        duration: getDurationDisplay(item.duration_minutes),
        type: item.activity_type === 'exercise' ? 'workout' : (item.activity_type as ItemType),
      });
      setEditModalMode('edit');
      setEditModalItemType(
        item.activity_type === 'exercise' ? 'workout' : (item.activity_type as ItemType)
      );
      setEditModalVisible(true);
    }
  }, []);

  const handleMealModify = useCallback(
    (meal: { time: string; title?: string; subtitle?: string; type: string }) => {
      if (!selectedItem) return;
      setEditModalItem({
        id: String(selectedItem.id),
        time: meal.time,
        title: meal.title || 'Meal',
        subtitle: meal.subtitle,
        duration: getDurationDisplay(selectedItem.duration_minutes),
        type: 'meal',
      });
      setEditModalMode('edit');
      setEditModalItemType('meal');
      setEditModalVisible(true);
    },
    [selectedItem]
  );

  const handleMealRemove = useCallback(
    (meal: { time: string; title?: string }) => {
      if (!selectedItem) return;
      Alert.alert('Remove Item', `Remove "${meal.title || 'this item'}" from the schedule?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate({ itemId: selectedItem.id, weekStartDate: weekStartStr });
            setModalVisible(false);
          },
        },
      ]);
    },
    [deleteMutation, selectedItem, weekStartStr]
  );

  const handleEditSave = useCallback(
    (updatedItem: WeeklyScheduleItem) => {
      if (editModalMode === 'add') {
        // Compute the date for the selected day
        const dayDate = weekDates[selectedDayIndex];
        const [timePart, period] = updatedItem.time.split(' ');
        const [h, m] = timePart.split(':').map(Number);
        let hours = h;
        if (period === 'PM' && h !== 12) hours += 12;
        if (period === 'AM' && h === 12) hours = 0;
        const itemDate = new Date(dayDate);
        itemDate.setHours(hours, m || 0, 0, 0);

        const activityType =
          updatedItem.type === 'workout' ? ('exercise' as const) : (updatedItem.type as 'meal' | 'sleep');
        const durationMinutes = parseInt(updatedItem.duration) || 30;

        createMutation.mutate({
          body: {
            date: itemDate.toISOString(),
            activity_type: activityType,
            duration_minutes: durationMinutes,
          },
          weekStartDate: weekStartStr,
        });
      } else if (editModalItem) {
        const itemId = parseInt(editModalItem.id);
        if (!isNaN(itemId)) {
          const durationMinutes = parseInt(updatedItem.duration) || 30;
          updateMutation.mutate({
            itemId,
            body: { duration_minutes: durationMinutes },
            weekStartDate: weekStartStr,
          });
        }
      }
    },
    [
      editModalMode,
      editModalItem,
      createMutation,
      updateMutation,
      selectedDayIndex,
      weekDates,
      weekStartStr,
    ]
  );

  const handleAddItem = useCallback((type: ItemType) => {
    setEditModalItem(null);
    setEditModalMode('add');
    setEditModalItemType(type);
    setEditModalVisible(true);
  }, []);

  const handleConfirmDone = useCallback(
    (item: ScheduleItemRead) => {
      completeMutation.mutate({ itemId: item.id, isCompleted: true, weekStartDate: weekStartStr });
    },
    [completeMutation, weekStartStr]
  );

  const handleConfirmMissed = useCallback((item: ScheduleItemRead) => {
    setMissedModalItem(item as any);
  }, []);

  const handleMissedSave = useCallback(
    (_actual: string | null) => {
      // Completion is handled by the done swipe; missed just records locally for now
      setMissedModalItem(null);
    },
    []
  );

  const handleWeekChange = (direction: number) => {
    setWeekOffset((prev) => prev + direction);
    setSelectedDayIndex(0); // Reset to Monday when changing weeks
  };

  const getBorderColor = (activityType: string) => {
    switch (activityType) {
      case 'meal':
        return Colors.light.secondary;
      case 'exercise':
        return Colors.light.primary;
      default:
        return Colors.light.charts.carbs;
    }
  };

  // --- current-time indicator ---
  const isToday = weekOffset === 0 && selectedDayIndex === todayMondayIndex;

  type TimelineRow =
    | { kind: 'item'; item: ScheduleItemRead }
    | { kind: 'now'; label: string };

  const timelineRows = useMemo((): TimelineRow[] => {
    const itemRows: TimelineRow[] = dayItems.map((item) => ({ kind: 'item', item }));
    if (!isToday) return itemRows;

    const nowMins = now.getHours() * 60 + now.getMinutes();
    const h = now.getHours();
    const m = now.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const nowLabel = `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    const nowRow: TimelineRow = { kind: 'now', label: nowLabel };

    const insertIdx = itemRows.findIndex(
      (r) => r.kind === 'item' && parseTimeToMins(getDisplayTime(r.item.date)) > nowMins
    );
    if (insertIdx === -1) return [...itemRows, nowRow];
    return [...itemRows.slice(0, insertIdx), nowRow, ...itemRows.slice(insertIdx)];
  }, [dayItems, isToday, now]);

  const isCurrentWeek = weekOffset === 0;

  // Month label shown above the day selector, e.g. "April 2026" or "Mar – Apr 2026"
  const weekMonthLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleString('en-US', { month: 'long' });
    const endMonth = end.toLocaleString('en-US', { month: 'long' });
    const year = end.getFullYear();
    if (startMonth === endMonth) return `${startMonth} ${year}`;
    return `${start.toLocaleString('en-US', { month: 'short' })} – ${endMonth} ${year}`;
  }, [weekDates]);

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

        {/* Month label */}
        <Text style={styles.monthLabel}>{weekMonthLabel}</Text>

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

        {/* Sleep/wake daily prompt — only shown when viewing today */}
        {showSleepPrompt && isToday && (
          <SleepWakePrompt onDismiss={() => setShowSleepPrompt(false)} />
        )}

        {/* Timeline */}
        {isLoadingPlan ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptySubtitle}>Loading...</Text>
          </View>
        ) : dayItems.length > 0 ? (
          <View style={styles.timeline}>
            {timelineRows.map((row, i) => {
              if (row.kind === 'now') {
                return (
                  <View key="now-indicator" style={styles.nowIndicatorRow}>
                    <View style={styles.nowDot} />
                    <View style={styles.nowLine} />
                    <Text style={styles.nowLineLabel}>{row.label}</Text>
                  </View>
                );
              }
              const item = row.item;
              const itemDate = new Date(item.date);
              const isInPast = itemDate < now;
              const needsConfirmation = isInPast && item.activity_type === 'meal';
              const isCompleted = item.is_completed ?? false;
              const isDone = isCompleted;

              const borderColor = isDone
                ? '#16A34A'
                : needsConfirmation && !isCompleted
                  ? '#F59E0B'
                  : getBorderColor(item.activity_type);

              const displayTime = getDisplayTime(item.date);
              const title = getItemTitle(item);
              const durationDisplay = getDurationDisplay(item.duration_minutes);

              return (
                <SwipeableScheduleItem
                  key={item.id || i}
                  needsConfirmation={needsConfirmation}
                  isCompleted={isCompleted}
                  onConfirmDone={() => handleConfirmDone(item)}
                  onConfirmMissed={() => handleConfirmMissed(item)}
                >
                  <View style={styles.timelineItem}>
                    <View style={styles.timeColumn}>
                      <Text style={styles.itemTime}>{displayTime}</Text>
                      {needsConfirmation && !isCompleted && (
                        <Text style={styles.pendingDot}>●</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.eventCard,
                        { borderLeftColor: borderColor },
                        needsConfirmation && !isCompleted && styles.pendingCard,
                        isDone && { opacity: 0.6 },
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
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
                        >
                          <Text style={styles.eventTitle} numberOfLines={1}>
                            {title}
                            {isDone && ' ✓'}
                          </Text>
                          {isDone && (
                            <View style={styles.doneBadge}>
                              <Text style={styles.doneBadgeText}>Done</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>{durationDisplay}</Text>
                        </View>
                      </View>

                      {item.meal?.tags && item.meal.tags.length > 0 && (
                        <Text style={styles.eventSubtitle}>{item.meal.tags.slice(0, 3).join(', ')}</Text>
                      )}
                      {needsConfirmation && !isCompleted && (
                        <Text style={styles.swipeHint}>← swipe to log · swipe to confirm →</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </SwipeableScheduleItem>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No items planned</Text>
            <Text style={styles.emptySubtitle}>No items scheduled for this day</Text>
            <TouchableOpacity
              style={styles.planThisWeekButton}
              onPress={() => router.push(`/week-planning?weekStart=${weekStartStr}`)}
            >
              <Calendar size={18} color="#FFF" />
              <Text style={styles.planThisWeekText}>Plan This Week</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add Item Section */}
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
      </ScrollView>

      <MealDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        meal={
          selectedItem
            ? {
                time: getDisplayTime(selectedItem.date),
                title: getItemTitle(selectedItem),
                type: selectedItem.activity_type,
                meal: selectedItem.meal,
              }
            : null
        }
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

      <MissedItemModal
        visible={missedModalItem !== null}
        itemTitle={missedModalItem ? getItemTitle(missedModalItem) : ''}
        itemType={missedModalItem ? getMissedItemType(missedModalItem) : 'meal'}
        onSave={handleMissedSave}
        onClose={() => setMissedModalItem(null)}
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
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginBottom: 8,
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
  nowIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 0,
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  nowLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#EF4444',
  },
  nowLineLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 6,
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
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
  },
  pendingDot: {
    fontSize: 8,
    color: '#F59E0B',
    marginTop: 4,
    textAlign: 'center',
  },
  doneBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  doneBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  missedNote: {
    fontSize: 13,
    color: Colors.light.error,
    marginTop: 2,
    fontStyle: 'italic',
  },
  swipeHint: {
    fontSize: 10,
    color: '#D97706',
    marginTop: 6,
    textAlign: 'center',
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
});
