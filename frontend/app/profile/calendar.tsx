import { Colors, Layout, Shadows } from '@/constants/theme';
import {
  useGoogleCalendarConnectMutation,
  useGoogleCalendarDisconnectMutation,
  useGoogleCalendarStatusQuery,
  useGoogleCalendarSyncMutation,
} from '@/lib/queries/googleCalendar';
import { useUserProfileModal } from '@clerk/expo';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, RefreshCw, Unlink } from 'lucide-react-native';
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

/**
 * Google Calendar authorization is handled by Clerk. This screen only asks the
 * backend to verify Clerk has a Google OAuth token and then sync Calendar data.
 */

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
});
