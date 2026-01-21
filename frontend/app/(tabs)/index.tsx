import { MacroNutrients } from '@/components/MacroNutrients';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Calendar, ChevronRight, Dumbbell, Plus, TrendingUp, Utensils } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardPage() {
  const router = useRouter();

  const upcomingItems = [
    {
      time: '12:30 PM',
      title: 'Lunch',
      subtitle: 'Chicken & Quinoa',
      icon: Utensils,
      color: Colors.light.secondary,
      status: 'upcoming',
    },
    {
      time: '3:00 PM',
      title: 'Afternoon Snack',
      subtitle: 'Protein Shake',
      icon: Utensils,
      color: Colors.light.secondary,
      status: 'upcoming',
    },
    {
      time: '6:00 PM',
      title: 'Evening Workout',
      subtitle: '45 min Strength',
      icon: Dumbbell,
      color: Colors.light.primary,
      status: 'scheduled',
    },
  ];

  const macroData = {
    calories: { value: '1,840', percentage: 84 },
    protein: { value: '78g', percentage: 65 },
    carbs: { value: '185g', percentage: 74 },
    fats: { value: '52g', percentage: 80 },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Good Morning, Alex</Text>
          <Text style={styles.headerSubtitle}>
            Let&apos;s make today healthy · Wednesday, Dec 23
          </Text>
        </View>

        {/* Health Score Card */}
        <TouchableOpacity
          style={styles.scoreCard}
          onPress={() => router.push('/health-score')}
          activeOpacity={0.9}
        >
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.scoreLabel}>Health Score</Text>
              <Text style={styles.scoreValue}>87</Text>
            </View>
            <View style={styles.trendBadge}>
              <TrendingUp size={16} color="#FFFFFF" />
              <Text style={styles.trendText}>+5</Text>
            </View>
          </View>

          <View style={styles.scoreDetails}>
            {[
              { label: 'Nutrition', value: 92 },
              { label: 'Exercise', value: 85 },
              { label: 'Sleep', value: 84 },
            ].map((item, i) => (
              <View key={i} style={styles.scoreItem}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${item.value}%` }]} />
                </View>
                <Text style={styles.scoreItemLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/schedule')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>Full Schedule</Text>
              <ChevronRight size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {upcomingItems.map((item, i) => (
              <TouchableOpacity key={i} style={[styles.listItem, i === 0 && styles.activeListItem]}>
                <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                  <item.icon size={24} color={item.color} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.timeBox}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  {i === 0 && <Text style={styles.nowText}>• Now</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Macros Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Macros</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <MacroNutrients data={macroData} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/schedule')}
            >
              <Calendar size={24} color={Colors.light.primary} />
              <Text style={styles.actionText}>Plan Week</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Plus size={24} color={Colors.light.primary} />
              <Text style={styles.actionText}>Log Activity</Text>
            </TouchableOpacity>
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
    gap: 24,
    padding: 20,
    paddingBottom: 120,
  },
  header: {},
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
  scoreCard: {
    backgroundColor: Colors.light.primary,
    borderRadius: Layout.cardRadius,
    paddingVertical: 20,
    paddingHorizontal: 24,
    ...Shadows.card,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 13,
    color: Colors.light.surface,
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.light.surface,
    lineHeight: 48,
  },
  trendBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 13,
    color: Colors.light.surface,
    fontWeight: '600',
  },
  scoreDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreItem: {
    flex: 1,
  },
  progressBarBg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  progressBarFill: {
    backgroundColor: Colors.light.surface,
    height: 4,
    borderRadius: 2,
  },
  scoreItemLabel: {
    fontSize: 13,
    color: Colors.light.surface,
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    paddingVertical: 20,
    paddingHorizontal: 24,
    ...Shadows.card,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Shadows.card,
  },
  activeListItem: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  timeBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeBadge: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  nowText: {
    display: 'none', // Hide for now
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    gap: 8,
    ...Shadows.card,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
});
