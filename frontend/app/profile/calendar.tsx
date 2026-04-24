import { Colors, Layout, Shadows } from '@/constants/theme';
import {
  useGoogleCalendarConnectMutation,
  useGoogleCalendarDisconnectMutation,
  useGoogleCalendarStatusQuery,
  useGoogleCalendarSyncMutation,
} from '@/lib/queries/googleCalendar';
import { useWeekScheduleQuery } from '@/lib/queries/schedule';
import type { ScheduleItemRead } from '@/api/types.gen';
import { useUserProfileModal } from '@clerk/expo';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Unlink,
} from 'lucide-react-native';
import React from 'react';
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

// source_type is returned by the API but not yet in the generated types
type ScheduleItemWithSource = ScheduleItemRead & { source_type?: string };

/**
 * Google Calendar authorization is handled by Clerk. This screen only asks the
 * backend to verify Clerk has a Google OAuth token and then sync Calendar data.
 */

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toWeekStartString(monday: Date): string {
  return monday.toISOString().slice(0, 10);
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}`;
}

// Backend stores naive UTC datetimes serialized without a 'Z'. Appending 'Z'
// tells JS to treat the value as UTC so it converts to the device's local time.
function toLocalDate(isoUtc: string): Date {
  return new Date(isoUtc.endsWith('Z') ? isoUtc : isoUtc + 'Z');
}

// Returns a YYYY-MM-DD key in the device's LOCAL timezone for grouping.
function localDateKey(isoUtc: string): string {
  const d = toLocalDate(isoUtc);
  return d.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD
}

function formatDayHeading(localDateStr: string): string {
  // localDateStr is already YYYY-MM-DD in local time — construct as local midnight
  // to avoid UTC-midnight being reinterpreted as the previous day in western zones.
  const [year, month, day] = localDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeRange(isoStart: string, durationMinutes: number): string {
  const start = toLocalDate(isoStart);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatSyncTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Imported schedule preview ─────────────────────────────────────────────────

function ImportedSchedulePreview() {
  const [weekOffset, setWeekOffset] = React.useState(0);

  const monday = React.useMemo(() => {
    const base = getMondayOf(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekStartStr = toWeekStartString(monday);
  const { data: items, isLoading } = useWeekScheduleQuery(weekStartStr);

  const busyBlocks = React.useMemo(() => {
    if (!items) return [];
    return (items as ScheduleItemWithSource[]).filter(
      (item) => item.source_type === 'google_calendar'
    );
  }, [items]);

  // Group by LOCAL date (YYYY-MM-DD in device timezone) so late-evening events
  // don't bleed into the next UTC day.
  const grouped = React.useMemo(() => {
    const map = new Map<string, ScheduleItemWithSource[]>();
    for (const item of busyBlocks) {
      const day = localDateKey(item.date);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [busyBlocks]);

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.previewHeader}>
        <Text style={styles.cardLabel}>Imported Busy Blocks</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => o - 1)}
            style={styles.navBtn}
            disabled={weekOffset === 0}
          >
            <ChevronLeft
              size={18}
              color={weekOffset === 0 ? Colors.light.textMuted : Colors.light.primary}
            />
          </TouchableOpacity>
          <Text style={styles.weekRangeText}>{formatWeekRange(monday)}</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => o + 1)}
            style={styles.navBtn}
            disabled={weekOffset >= 7}
          >
            <ChevronRight
              size={18}
              color={weekOffset >= 7 ? Colors.light.textMuted : Colors.light.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 8 }} />
      ) : grouped.length === 0 ? (
        <Text style={styles.emptyText}>No busy blocks this week.</Text>
      ) : (
        <View style={styles.dayList}>
          {grouped.map(([day, dayItems]) => (
            <View key={day} style={styles.dayRow}>
              <Text style={styles.dayHeading}>{formatDayHeading(day)}</Text>
              {dayItems.map((item) => (
                <View key={item.id} style={styles.busyBlock}>
                  <View style={styles.busyDot} />
                  <Text style={styles.busyTime}>
                    {formatTimeRange(item.date, item.duration_minutes)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CalendarIntegrationScreen() {
  const router = useRouter();
  const { data: status, isLoading } = useGoogleCalendarStatusQuery();
  const { presentUserProfile, isAvailable: isUserProfileAvailable } = useUserProfileModal();
  const connectMutation = useGoogleCalendarConnectMutation();
  const syncMutation = useGoogleCalendarSyncMutation();
  const disconnectMutation = useGoogleCalendarDisconnectMutation();

  const handleConnect = async () => {
    try {
      await connectMutation.mutateAsync();
      Alert.alert(
        'Connected',
        'Google Calendar connected. Your busy times will now be used in meal planning.'
      );
    } catch {
      if (!isUserProfileAvailable) {
        Alert.alert(
          'Connect in Clerk',
          'Open your Clerk profile and connect Google Calendar, then return here and tap Connect again.'
        );
        return;
      }

      try {
        await presentUserProfile();
        await connectMutation.mutateAsync();
        Alert.alert(
          'Connected',
          'Google Calendar connected. Your busy times will now be used in meal planning.'
        );
      } catch (profileErr) {
        Alert.alert(
          'Connection failed',
          profileErr instanceof Error
            ? profileErr.message
            : 'Connect Google in your Clerk profile and try again.'
        );
      }
    }
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        Alert.alert(
          'Synced',
          `Imported ${result.synced_count} busy ${result.synced_count === 1 ? 'block' : 'blocks'} from Google Calendar.`
        );
      },
      onError: (err) => {
        Alert.alert('Sync failed', err instanceof Error ? err.message : 'Unknown error');
      },
    });
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Calendar',
      'Remove imported busy blocks from your schedule too?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep busy blocks',
          onPress: () => disconnectMutation.mutate(false),
        },
        {
          text: 'Remove busy blocks',
          style: 'destructive',
          onPress: () => disconnectMutation.mutate(true),
        },
      ]
    );
  };

  const isConnected = status?.connected ?? false;
  const isBusy =
    connectMutation.isPending || syncMutation.isPending || disconnectMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Google Calendar</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Privacy note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Sophros imports only your{' '}
            <Text style={styles.infoEmphasis}>busy / free availability</Text> — never event names,
            descriptions, or attendees. Your imported busy times are used to avoid scheduling meals
            or workouts during conflicts.
          </Text>
        </View>

        {/* Status card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Status</Text>
          {isLoading ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : (
            <>
              <Text
                style={[
                  styles.statusText,
                  { color: isConnected ? Colors.light.success : Colors.light.textMuted },
                ]}
              >
                {isConnected ? `Connected as ${status?.email}` : 'Not connected'}
              </Text>
              {status?.needs_reconnect && (
                <Text style={styles.lastSyncText}>
                  Google needs to be reconnected in your Clerk profile.
                </Text>
              )}
              {isConnected && (
                <Text style={styles.lastSyncText}>
                  Last synced: {formatSyncTime(status?.last_synced_at)}
                  {status?.sync_status === 'failed' && '  ⚠️ Last sync failed'}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        {isBusy ? (
          <View style={styles.card}>
            <ActivityIndicator color={Colors.light.primary} />
            <Text style={styles.busyLabel}>Working…</Text>
          </View>
        ) : isConnected ? (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={handleSync} activeOpacity={0.8}>
              <RefreshCw size={20} color={Colors.light.surface} />
              <Text style={styles.actionButtonText}>Sync Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.destructiveButton]}
              onPress={handleDisconnect}
              activeOpacity={0.8}
            >
              <Unlink size={20} color={Colors.light.error} />
              <Text style={[styles.actionButtonText, styles.destructiveButtonText]}>
                Disconnect
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={handleConnect} activeOpacity={0.8}>
            <Calendar size={20} color={Colors.light.surface} />
            <Text style={styles.actionButtonText}>Connect Google Calendar</Text>
          </TouchableOpacity>
        )}

        {/* Imported schedule preview — only shown when connected */}
        {isConnected && <ImportedSchedulePreview />}

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>How it works</Text>
          <View style={styles.stepList}>
            {[
              'Connect your Google account using read-only calendar access.',
              'Sophros fetches your busy/free windows for the next 8 weeks.',
              'Imported busy blocks appear on your Schedule tab as "Busy".',
              'Meal and workout generation automatically avoids those windows.',
              'Syncs are manual — tap "Sync Now" any time your calendar changes.',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
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
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  infoCard: {
    backgroundColor: `${Colors.light.primary}10`,
    borderRadius: Layout.cardRadius,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 19,
  },
  infoEmphasis: {
    fontWeight: '600',
    color: Colors.light.primaryDark,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    gap: 8,
    ...Shadows.card,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '700',
  },
  lastSyncText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  busyLabel: {
    textAlign: 'center',
    color: Colors.light.textMuted,
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: Layout.cardRadius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.card,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.surface,
  },
  destructiveButton: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.error,
  },
  destructiveButtonText: {
    color: Colors.light.error,
  },
  stepList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${Colors.light.primary}20`,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 19,
  },
  // ── Preview card ────────────────────────────────────────────────────────────
  previewHeader: {
    gap: 8,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 4,
  },
  weekRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  dayList: {
    gap: 12,
    marginTop: 4,
  },
  dayRow: {
    gap: 4,
  },
  dayHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  busyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  busyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },
  busyTime: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
});
