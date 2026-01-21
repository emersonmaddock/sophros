import { MealDetailModal } from '@/components/MealDetailModal';
import { Colors } from '@/constants/theme';
import { Calendar } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScheduleItem = {
  time: string;
  title: string;
  subtitle?: string;
  duration: string;
  type: 'meal' | 'exercise' | 'sleep';
  status: 'completed' | 'current' | 'upcoming';
};

export default function SchedulePage() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<ScheduleItem | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const scheduleItems: ScheduleItem[] = [
    {
      time: '7:00 AM',
      title: 'Wake Up & Stretch',
      duration: '30 min',
      type: 'exercise',
      status: 'completed',
    },
    {
      time: '7:30 AM',
      title: 'Breakfast',
      subtitle: 'Greek Yogurt Bowl (380 cal)',
      duration: '20 min',
      type: 'meal',
      status: 'completed',
    },
    {
      time: '9:00 AM',
      title: 'Morning Workout',
      subtitle: 'HIIT Training',
      duration: '45 min',
      type: 'exercise',
      status: 'completed',
    },
    {
      time: '12:30 PM',
      title: 'Lunch',
      subtitle: 'Grilled Chicken Salad (520 cal)',
      duration: '30 min',
      type: 'meal',
      status: 'current',
    },
    {
      time: '3:00 PM',
      title: 'Snack',
      subtitle: 'Protein Shake (180 cal)',
      duration: '10 min',
      type: 'meal',
      status: 'upcoming',
    },
    {
      time: '6:30 PM',
      title: 'Evening Walk',
      duration: '30 min',
      type: 'exercise',
      status: 'upcoming',
    },
    {
      time: '7:30 PM',
      title: 'Dinner',
      subtitle: 'Salmon & Vegetables (640 cal)',
      duration: '40 min',
      type: 'meal',
      status: 'upcoming',
    },
    {
      time: '10:30 PM',
      title: 'Sleep',
      subtitle: 'Target: 8 hours',
      duration: '8 hrs',
      type: 'sleep',
      status: 'upcoming',
    },
  ];

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
            <TouchableOpacity key={i} style={[styles.dayCard, i === 2 && styles.activeDayCard]}>
              <Text style={[styles.dayText, i === 2 && styles.activeDayText]}>{day}</Text>
              <Text style={[styles.dateText, i === 2 && styles.activeDateText]}>{17 + i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timeline */}
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
                disabled={item.type !== 'meal'}
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
                    }}
                  >
                    <Text style={styles.eventTitle}>
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

        {/* Plan Next Week Button */}
        <TouchableOpacity style={styles.planButton}>
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
  timeIndicator: {
    backgroundColor: `${Colors.light.primary}10`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  timeSubText: {
    fontSize: 12,
    color: Colors.light.textMuted,
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
  tapHint: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '500',
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
