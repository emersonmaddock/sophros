import { ProgressCard } from '@/components/ProgressCard';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useAchievements } from '@/hooks/useAchievements';
import { useProgressData } from '@/hooks/useProgressData';
import { useStreak } from '@/hooks/useStreak';
import { useUserQuery } from '@/lib/queries/user';
import { Award, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProgressPage() {
  const streak = useStreak();
  const achievements = useAchievements();
  const [showLocked, setShowLocked] = useState(false);
  const { data: user } = useUserQuery();
  const { snapshot, isLoading: isProgressLoading, reload } = useProgressData();

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSubtitle}>Track your health journey</Text>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.streakIconBox}>
              <Award size={32} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakValue}>
                {streak} {streak === 1 ? 'Day' : 'Days'}
              </Text>
            </View>
          </View>
          <Text style={styles.streakFooter}>Keep it up! You&apos;re on fire 🔥</Text>
        </View>

        {/* Health Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Progress</Text>
          {isProgressLoading ? (
            <View style={styles.progressLoading}>
              <ActivityIndicator size="small" color={Colors.light.primary} />
            </View>
          ) : snapshot ? (
            <ProgressCard
              snapshot={snapshot}
              showImperial={user?.show_imperial ?? false}
              onLogged={reload}
            />
          ) : null}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.achievementCount}>
              {unlocked.length} / {achievements.length}
            </Text>
          </View>

          {unlocked.length === 0 ? (
            <View style={styles.emptyUnlocked}>
              <Text style={styles.emptyUnlockedText}>
                No achievements yet — start logging meals, workouts, and sleep!
              </Text>
            </View>
          ) : (
            <View style={styles.achievementsGrid}>
              {unlocked.map((badge) => (
                <View key={badge.id} style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{badge.icon}</Text>
                  <Text style={styles.achievementName}>{badge.name}</Text>
                  <Text style={styles.achievementDesc}>{badge.description}</Text>
                </View>
              ))}
            </View>
          )}

          {locked.length > 0 && (
            <TouchableOpacity
              style={styles.showLockedButton}
              onPress={() => setShowLocked((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.showLockedText}>
                {showLocked ? 'Hide locked achievements' : `${locked.length} more to unlock`}
              </Text>
              {showLocked ? (
                <ChevronUp size={16} color={Colors.light.textMuted} />
              ) : (
                <ChevronDown size={16} color={Colors.light.textMuted} />
              )}
            </TouchableOpacity>
          )}

          {showLocked && (
            <View style={[styles.achievementsGrid, styles.lockedGrid]}>
              {locked.map((badge) => (
                <View key={badge.id} style={[styles.achievementCard, styles.achievementCardLocked]}>
                  <Text style={styles.achievementIcon}>{badge.icon}</Text>
                  <Text style={[styles.achievementName, styles.achievementNameLocked]}>
                    {badge.name}
                  </Text>
                  <Text style={styles.achievementDesc}>{badge.description}</Text>
                </View>
              ))}
            </View>
          )}
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
    paddingBottom: 120,
    gap: 24,
  },
  header: {},
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  progressLoading: {
    paddingVertical: 32,
    alignItems: 'center',
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
  streakCard: {
    backgroundColor: Colors.light.success,
    borderRadius: Layout.cardRadius,
    padding: 24,
    ...Shadows.card,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  streakIconBox: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  streakFooter: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  emptyUnlocked: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    ...Shadows.card,
  },
  emptyUnlockedText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  lockedGrid: {
    marginTop: 4,
  },
  achievementCard: {
    width: '47%',
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 12,
    gap: 4,
    ...Shadows.card,
  },
  achievementCardLocked: {
    opacity: 0.45,
  },
  achievementIcon: {
    fontSize: 20,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  achievementNameLocked: {
    color: Colors.light.textMuted,
  },
  achievementDesc: {
    fontSize: 11,
    color: Colors.light.textMuted,
    lineHeight: 15,
  },
  showLockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    marginBottom: 4,
    ...Shadows.card,
  },
  showLockedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
});
