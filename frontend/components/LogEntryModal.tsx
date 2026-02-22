import { Colors } from '@/constants/theme';
import type {
  ExerciseType,
  LogEntry,
  LogEntryType,
  MealType,
} from '@/types/logging';
import { Dumbbell, Moon, Utensils, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type LogEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
  initialType?: LogEntryType;
  title?: string;
  subtitle?: string;
};

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

const EXERCISE_TYPES: { label: string; value: ExerciseType }[] = [
  { label: 'Cardio', value: 'cardio' },
  { label: 'Strength', value: 'strength' },
  { label: 'Yoga', value: 'yoga' },
  { label: 'Walk', value: 'walk' },
  { label: 'Other', value: 'other' },
];

const TYPE_TABS: { label: string; value: LogEntryType; icon: typeof Utensils; color: string }[] = [
  { label: 'Meal', value: 'meal', icon: Utensils, color: Colors.light.secondary },
  { label: 'Exercise', value: 'exercise', icon: Dumbbell, color: Colors.light.primary },
  { label: 'Sleep', value: 'sleep', icon: Moon, color: Colors.light.charts.carbs },
];

export function LogEntryModal({
  visible,
  onClose,
  onSave,
  initialType = 'meal',
  title,
  subtitle,
}: LogEntryModalProps) {
  const [logType, setLogType] = useState<LogEntryType>(initialType);

  // Meal fields
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');

  // Exercise fields
  const [exerciseType, setExerciseType] = useState<ExerciseType>('cardio');
  const [activityName, setActivityName] = useState('');
  const [duration, setDuration] = useState('');

  // Sleep fields
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [quality, setQuality] = useState(3);

  // Shared
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setLogType(initialType);
      setMealType('breakfast');
      setFoodName('');
      setCalories('');
      setExerciseType('cardio');
      setActivityName('');
      setDuration('');
      setBedtime('');
      setWakeTime('');
      setQuality(3);
      setNotes('');
    }
  }, [visible, initialType]);

  const handleSave = () => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const loggedAt = new Date();

    if (logType === 'meal') {
      onSave({
        id,
        type: 'meal',
        mealType,
        name: foodName || 'Untitled meal',
        calories: parseInt(calories) || 0,
        notes: notes || undefined,
        loggedAt,
      });
    } else if (logType === 'exercise') {
      onSave({
        id,
        type: 'exercise',
        exerciseType,
        name: activityName || 'Untitled exercise',
        durationMinutes: parseInt(duration) || 0,
        notes: notes || undefined,
        loggedAt,
      });
    } else {
      onSave({
        id,
        type: 'sleep',
        bedtime: bedtime || '10:00 PM',
        wakeTime: wakeTime || '6:00 AM',
        quality,
        notes: notes || undefined,
        loggedAt,
      });
    }

    onClose();
  };

  const getAccentColor = () => {
    switch (logType) {
      case 'meal':
        return Colors.light.secondary;
      case 'exercise':
        return Colors.light.primary;
      case 'sleep':
        return Colors.light.charts.carbs;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{title ?? 'Log Activity'}</Text>
              <Text style={styles.headerSubtitle}>
                {subtitle ?? 'Record something not on your schedule'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Type Selector Tabs */}
          <View style={styles.typeTabs}>
            {TYPE_TABS.map((tab) => {
              const isActive = logType === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  style={[
                    styles.typeTab,
                    isActive && { backgroundColor: tab.color, borderColor: tab.color },
                  ]}
                  onPress={() => setLogType(tab.value)}
                >
                  <tab.icon size={16} color={isActive ? '#FFFFFF' : Colors.light.textMuted} />
                  <Text style={[styles.typeTabText, isActive && styles.typeTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form */}
          <ScrollView style={styles.form}>
            {logType === 'meal' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Meal Type</Text>
                  <View style={styles.chipRow}>
                    {MEAL_TYPES.map((mt) => (
                      <TouchableOpacity
                        key={mt.value}
                        style={[
                          styles.chip,
                          mealType === mt.value && {
                            backgroundColor: getAccentColor(),
                            borderColor: getAccentColor(),
                          },
                        ]}
                        onPress={() => setMealType(mt.value)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            mealType === mt.value && styles.chipTextActive,
                          ]}
                        >
                          {mt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Food Name</Text>
                  <TextInput
                    style={styles.input}
                    value={foodName}
                    onChangeText={setFoodName}
                    placeholder="e.g., Greek Yogurt Bowl"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Calories</Text>
                  <TextInput
                    style={styles.input}
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="e.g., 380"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                </View>
              </>
            )}

            {logType === 'exercise' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Exercise Type</Text>
                  <View style={styles.chipRow}>
                    {EXERCISE_TYPES.map((et) => (
                      <TouchableOpacity
                        key={et.value}
                        style={[
                          styles.chip,
                          exerciseType === et.value && {
                            backgroundColor: getAccentColor(),
                            borderColor: getAccentColor(),
                          },
                        ]}
                        onPress={() => setExerciseType(et.value)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            exerciseType === et.value && styles.chipTextActive,
                          ]}
                        >
                          {et.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Activity Name</Text>
                  <TextInput
                    style={styles.input}
                    value={activityName}
                    onChangeText={setActivityName}
                    placeholder="e.g., Morning Run"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="e.g., 30"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                </View>
              </>
            )}

            {logType === 'sleep' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Bedtime</Text>
                  <TextInput
                    style={styles.input}
                    value={bedtime}
                    onChangeText={setBedtime}
                    placeholder="e.g., 10:30 PM"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Wake Time</Text>
                  <TextInput
                    style={styles.input}
                    value={wakeTime}
                    onChangeText={setWakeTime}
                    placeholder="e.g., 6:30 AM"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Sleep Quality</Text>
                  <View style={styles.qualityRow}>
                    {[1, 2, 3, 4, 5].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[
                          styles.qualityCircle,
                          q <= quality && {
                            backgroundColor: getAccentColor(),
                            borderColor: getAccentColor(),
                          },
                        ]}
                        onPress={() => setQuality(q)}
                      >
                        <Text
                          style={[
                            styles.qualityText,
                            q <= quality && styles.qualityTextActive,
                          ]}
                        >
                          {q}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                placeholderTextColor={Colors.light.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTabs: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    paddingBottom: 4,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  typeTabTextActive: {
    color: '#FFFFFF',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesInput: {
    minHeight: 80,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  qualityCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  qualityTextActive: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
