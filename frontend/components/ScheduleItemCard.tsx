import { Colors, Layout } from '@/constants/theme';
import type { WeeklyScheduleItem } from '@/types/schedule';
import { Edit2, Repeat, Trash2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ScheduleItemCardProps = {
  item: WeeklyScheduleItem;
  onSwap?: (item: WeeklyScheduleItem) => void;
  onEdit?: (item: WeeklyScheduleItem) => void;
  onDelete?: (id: string) => void;
};

export function ScheduleItemCard({ item, onSwap, onEdit, onDelete }: ScheduleItemCardProps) {
  const getBorderColor = () => {
    switch (item.type) {
      case 'meal':
        return Colors.light.secondary;
      case 'workout':
        return Colors.light.primary;
      case 'sleep':
        return Colors.light.charts.carbs;
      default:
        return Colors.light.textMuted;
    }
  };

  const getTypeLabel = () => {
    switch (item.type) {
      case 'meal':
        return '🍽️';
      case 'workout':
        return '💪';
      case 'sleep':
        return '😴';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.card, { borderLeftColor: getBorderColor() }]}>
      <View style={styles.cardHeader}>
        <View style={styles.timeContainer}>
          <Text style={styles.typeEmoji}>{getTypeLabel()}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <View style={styles.actions}>
          {onSwap && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onSwap(item)}>
              <Repeat size={18} color={Colors.light.primary} />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
              <Edit2 size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(item.id)}>
              <Trash2 size={18} color={Colors.light.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        {item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
        <View style={styles.footer}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeEmoji: {
    fontSize: 16,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
    fontWeight: '500',
  },
});
