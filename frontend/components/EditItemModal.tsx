import { Colors } from '@/constants/theme';
import type { ItemType, WeeklyScheduleItem } from '@/types/schedule';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
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

type EditItemModalProps = {
  visible: boolean;
  onClose: () => void;
  item: WeeklyScheduleItem | null;
  onSave: (updatedItem: WeeklyScheduleItem) => void;
  mode: 'edit' | 'add';
  itemType?: ItemType;
};

export function EditItemModal({
  visible,
  onClose,
  item,
  onSave,
  mode,
  itemType = 'meal',
}: EditItemModalProps) {
  const [time, setTime] = useState(item?.time || '7:00 AM');
  const [title, setTitle] = useState(item?.title || '');
  const [subtitle, setSubtitle] = useState(item?.subtitle || '');
  const [duration, setDuration] = useState(item?.duration || '30 min');
  const [calories, setCalories] = useState(item?.calories?.toString() || '');
  const [workoutType, setWorkoutType] = useState(item?.workoutType || '');
  const [targetHours, setTargetHours] = useState(item?.targetHours?.toString() || '8');

  const currentType = item?.type || itemType;

  const handleSave = () => {
    const baseItem = {
      id: item?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time,
      title,
      subtitle: subtitle || undefined,
      duration,
      type: currentType,
    };

    let updatedItem: WeeklyScheduleItem = baseItem;

    if (currentType === 'meal') {
      updatedItem = {
        ...baseItem,
        calories: calories ? parseInt(calories) : undefined,
      };
    } else if (currentType === 'workout') {
      updatedItem = {
        ...baseItem,
        workoutType: workoutType || title,
      };
    } else if (currentType === 'sleep') {
      updatedItem = {
        ...baseItem,
        targetHours: targetHours ? parseFloat(targetHours) : 8,
      };
    }

    onSave(updatedItem);
    onClose();
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setTime(item?.time || '7:00 AM');
      setTitle(item?.title || '');
      setSubtitle(item?.subtitle || '');
      setDuration(item?.duration || '30 min');
      setCalories(item?.calories?.toString() || '');
      setWorkoutType(item?.workoutType || '');
      setTargetHours(item?.targetHours?.toString() || '8');
    }
  }, [visible, item]);

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
              <Text style={styles.headerTitle}>{mode === 'edit' ? 'Edit Item' : 'Add Item'}</Text>
              <Text style={styles.headerSubtitle}>
                {currentType === 'meal'
                  ? 'Meal details'
                  : currentType === 'workout'
                    ? 'Workout details'
                    : 'Sleep details'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="e.g., 7:00 AM"
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={
                  currentType === 'meal'
                    ? 'e.g., Greek Yogurt Bowl'
                    : currentType === 'workout'
                      ? 'e.g., HIIT Training'
                      : 'Sleep'
                }
                placeholderTextColor={Colors.light.textMuted}
              />
            </View>

            {currentType === 'meal' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={subtitle}
                    onChangeText={setSubtitle}
                    placeholder="e.g., with berries and granola"
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

            {currentType === 'workout' && (
              <View style={styles.field}>
                <Text style={styles.label}>Workout Type</Text>
                <TextInput
                  style={styles.input}
                  value={workoutType}
                  onChangeText={setWorkoutType}
                  placeholder="e.g., HIIT, Strength, Yoga"
                  placeholderTextColor={Colors.light.textMuted}
                />
              </View>
            )}

            {currentType === 'sleep' && (
              <View style={styles.field}>
                <Text style={styles.label}>Target Hours</Text>
                <TextInput
                  style={styles.input}
                  value={targetHours}
                  onChangeText={setTargetHours}
                  placeholder="e.g., 8"
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.light.textMuted}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Duration</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g., 30 min"
                placeholderTextColor={Colors.light.textMuted}
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
