import { LogEntryModal } from '@/components/LogEntryModal';
import { Colors } from '@/constants/theme';
import type { LogEntry, LogEntryType } from '@/types/logging';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Check,
  Dumbbell,
  Moon,
  Plus,
  RefreshCw,
  Trash2,
  Utensils,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LogStatus = 'confirmed' | 'skipped' | 'replaced';

type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  duration: string;
  type: 'meal' | 'exercise' | 'sleep';
  status: 'completed' | 'current' | 'upcoming';
  logStatus?: LogStatus;
  replacement?: LogEntry;
};

const INITIAL_ITEMS: ScheduleItem[] = [
  { id: 's1', time: '7:00 AM', title: 'Wake Up & Stretch', duration: '30 min', type: 'exercise', status: 'completed' },
  { id: 's2', time: '7:30 AM', title: 'Breakfast', subtitle: 'Greek Yogurt Bowl (380 cal)', duration: '20 min', type: 'meal', status: 'completed' },
  { id: 's3', time: '9:00 AM', title: 'Morning Workout', subtitle: 'HIIT Training', duration: '45 min', type: 'exercise', status: 'completed' },
  { id: 's4', time: '12:30 PM', title: 'Lunch', subtitle: 'Grilled Chicken Salad (520 cal)', duration: '30 min', type: 'meal', status: 'current' },
  { id: 's5', time: '3:00 PM', title: 'Snack', subtitle: 'Protein Shake (180 cal)', duration: '10 min', type: 'meal', status: 'upcoming' },
  { id: 's6', time: '6:30 PM', title: 'Evening Walk', duration: '30 min', type: 'exercise', status: 'upcoming' },
  { id: 's7', time: '7:30 PM', title: 'Dinner', subtitle: 'Salmon & Vegetables (640 cal)', duration: '40 min', type: 'meal', status: 'upcoming' },
  { id: 's8', time: '10:30 PM', title: 'Sleep', subtitle: 'Target: 8 hours', duration: '8 hrs', type: 'sleep', status: 'upcoming' },
];

const scheduleTimeToMinutes = (time: string): number => {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const formatLoggedAt = (date: Date): string => {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export default function SchedulePage() {
  const router = useRouter();
  const [items, setItems] = useState<ScheduleItem[]>(INITIAL_ITEMS);
  const [extraEntries, setExtraEntries] = useState<LogEntry[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [replaceModal, setReplaceModal] = useState<{
    visible: boolean;
    itemId: string | null;
    initialType: LogEntryType;
  }>({ visible: false, itemId: null, initialType: 'meal' });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - todayDayOfWeek);
  const weekDates = days.map((_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date.getDate();
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  const confirmItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, logStatus: 'confirmed' as LogStatus } : item)),
    );
  };

  const skipItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, logStatus: 'skipped' as LogStatus } : item)),
    );
  };

  const undoLogStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, logStatus: undefined, replacement: undefined } : item,
      ),
    );
  };

  const startReplace = (item: ScheduleItem) => {
    setReplaceModal({ visible: true, itemId: item.id, initialType: item.type as LogEntryType });
  };

  const handleReplacement = (entry: LogEntry) => {
    if (replaceModal.itemId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === replaceModal.itemId
            ? { ...item, logStatus: 'replaced' as LogStatus, replacement: entry }
            : item,
        ),
      );
    }
    setReplaceModal({ visible: false, itemId: null, initialType: 'meal' });
  };

  const handleAddEntry = (entry: LogEntry) => {
    setExtraEntries((prev) => [...prev, entry]);
  };

  const deleteExtraEntry = (id: string) => {
    setExtraEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getBorderColor = (type: string, logStatus?: LogStatus): string => {
    if (logStatus === 'confirmed') return Colors.light.success;
    if (logStatus === 'skipped') return '#D1D5DB';
    switch (type) {
      case 'meal': return Colors.light.secondary;
      case 'exercise': return Colors.light.primary;
      default: return Colors.light.charts.carbs;
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'meal': return Colors.light.secondary;
      case 'exercise': return Colors.light.primary;
      default: return Colors.light.charts.carbs;
    }
  };

  const getReplacementLabel = (entry: LogEntry): string => {
    switch (entry.type) {
      case 'meal': return `${entry.name} (${entry.calories} cal)`;
      case 'exercise': return `${entry.name} (${entry.durationMinutes} min)`;
      case 'sleep': return `${entry.bedtime} – ${entry.wakeTime}`;
    }
  };

  const getExtraEntryLabel = (entry: LogEntry) => {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    switch (entry.type) {
      case 'meal':
        return { title: entry.name, subtitle: `${cap(entry.mealType)} · ${entry.calories} cal` };
      case 'exercise':
        return { title: entry.name, subtitle: `${cap(entry.exerciseType)} · ${entry.durationMinutes} min` };
      case 'sleep':
        return { title: 'Sleep', subtitle: `${entry.bedtime} – ${entry.wakeTime} · Quality ${entry.quality}/5` };
    }
  };

  // ── Merged timeline ───────────────────────────────────────────────────────

  type TimelineRow =
    | { kind: 'scheduled'; item: ScheduleItem; minutes: number }
    | { kind: 'extra'; entry: LogEntry; minutes: number };

  const timelineRows: TimelineRow[] = [
    ...items.map((item) => ({ kind: 'scheduled' as const, item, minutes: scheduleTimeToMinutes(item.time) })),
    ...extraEntries.map((entry) => ({
      kind: 'extra' as const,
      entry,
      minutes: entry.loggedAt.getHours() * 60 + entry.loggedAt.getMinutes(),
    })),
  ].sort((a, b) => a.minutes - b.minutes);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Weekly Schedule</Text>
            <Text style={styles.headerSubtitle}>AI-optimized</Text>
          </View>
          <TouchableOpacity style={styles.addEntryBtn} onPress={() => setAddModalVisible(true)}>
            <Plus size={18} color={Colors.light.primary} />
            <Text style={styles.addEntryBtnText}>Add Entry</Text>
          </TouchableOpacity>
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
        <View style={styles.timeline}>
          {timelineRows.map((row) => {

            // ── Extra (unscheduled) entry ──────────────────────────────────
            if (row.kind === 'extra') {
              const { entry } = row;
              const label = getExtraEntryLabel(entry);
              const color = getTypeColor(entry.type);
              return (
                <View key={`extra-${entry.id}`} style={styles.timelineItem}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.itemTime}>{formatLoggedAt(entry.loggedAt)}</Text>
                    <Text style={styles.addedLabel}>Added</Text>
                  </View>
                  <View style={[styles.eventCard, { borderLeftColor: color }]}>
                    <View style={styles.cardRow}>
                      <Text style={styles.eventTitle}>{label.title}</Text>
                      <TouchableOpacity
                        onPress={() => deleteExtraEntry(entry.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color={Colors.light.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.eventSubtitle}>{label.subtitle}</Text>
                    {entry.notes ? <Text style={styles.eventNotes}>{entry.notes}</Text> : null}
                  </View>
                </View>
              );
            }

            // ── Scheduled item ─────────────────────────────────────────────
            const { item } = row;
            const isPastOrCurrent = item.status === 'completed' || item.status === 'current';

            return (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timeColumn}>
                  <Text style={styles.itemTime}>{item.time}</Text>
                </View>

                <View
                  style={[
                    styles.eventCard,
                    { borderLeftColor: getBorderColor(item.type, item.logStatus) },
                    item.logStatus === 'skipped' && styles.skippedCard,
                  ]}
                >
                  {/* Title row */}
                  <View style={styles.cardRow}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.eventTitle,
                          item.logStatus === 'skipped' && styles.skippedTitle,
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.status === 'current' && !item.logStatus && (
                        <View style={styles.nowBadge}>
                          <Text style={styles.nowText}>NOW</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{item.duration}</Text>
                    </View>
                  </View>

                  {item.subtitle ? (
                    <Text
                      style={[
                        styles.eventSubtitle,
                        item.logStatus === 'skipped' && styles.skippedSubtitle,
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  ) : null}

                  {/* Log status badge + undo */}
                  {item.logStatus ? (
                    <View style={styles.statusRow}>
                      {item.logStatus === 'confirmed' && (
                        <View style={styles.confirmedBadge}>
                          <Check size={12} color="#FFFFFF" />
                          <Text style={styles.confirmedText}>Done</Text>
                        </View>
                      )}
                      {item.logStatus === 'skipped' && (
                        <View style={styles.skippedBadge}>
                          <X size={12} color={Colors.light.textMuted} />
                          <Text style={styles.skippedBadgeText}>Skipped</Text>
                        </View>
                      )}
                      {item.logStatus === 'replaced' && item.replacement ? (
                        <View style={styles.replacedRow}>
                          <RefreshCw size={12} color={Colors.light.primary} />
                          <Text style={styles.replacedText} numberOfLines={1}>
                            Did: {getReplacementLabel(item.replacement)}
                          </Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => undoLogStatus(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.undoText}>Undo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Action buttons — past & current items not yet logged */}
                  {isPastOrCurrent && !item.logStatus ? (
                    <>
                      <View style={styles.actionDivider} />
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.doneBtn]}
                          onPress={() => confirmItem(item.id)}
                        >
                          <Check size={12} color="#FFFFFF" />
                          <Text style={styles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.skipBtn]}
                          onPress={() => skipItem(item.id)}
                        >
                          <X size={12} color={Colors.light.textMuted} />
                          <Text style={styles.skipBtnText}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.replaceBtn]}
                          onPress={() => startReplace(item)}
                        >
                          <RefreshCw size={12} color={Colors.light.primary} />
                          <Text style={styles.replaceBtnText}>Replace</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Plan Next Week Button */}
        <TouchableOpacity style={styles.planButton} onPress={() => router.push('/week-planning')}>
          <Calendar size={20} color="#FFF" />
          <Text style={styles.planButtonText}>Plan Next Week</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add unscheduled entry */}
      <LogEntryModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddEntry}
      />

      {/* Replace a scheduled item */}
      <LogEntryModal
        visible={replaceModal.visible}
        onClose={() => setReplaceModal({ visible: false, itemId: null, initialType: 'meal' })}
        onSave={handleReplacement}
        initialType={replaceModal.initialType}
        title="What did you do instead?"
        subtitle="Log what you actually did"
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
  },
  addEntryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
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
  addedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.primary,
    marginTop: 2,
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
  skippedCard: {
    opacity: 0.6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  skippedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.light.textMuted,
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
  skippedSubtitle: {
    textDecorationLine: 'line-through',
  },
  eventNotes: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  // ── Log status display ──────────────────────────────────────────────────
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skippedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  replacedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  replacedText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500',
    flex: 1,
  },
  undoText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textDecorationLine: 'underline',
    marginLeft: 'auto',
  },
  // ── Action buttons ──────────────────────────────────────────────────────
  actionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 12,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneBtn: {
    backgroundColor: Colors.light.success,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipBtn: {
    backgroundColor: '#F3F4F6',
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  replaceBtn: {
    backgroundColor: `${Colors.light.primary}18`,
  },
  replaceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  // ── Footer ──────────────────────────────────────────────────────────────
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
