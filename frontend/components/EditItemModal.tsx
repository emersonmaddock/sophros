import { Colors } from '@/constants/theme';
import type { ItemType, WeeklyScheduleItem } from '@/types/schedule';
import { TimePickerInput } from '@/components/TimePickerInput';
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
  const [duration, setDuration] = useState(item?.duration || '30 min');
  const [calories, setCalories] = useState(item?.calories?.toString() || '');
  const [protein, setProtein] = useState(item?.protein?.toString() || '');
  const [carbs, setCarbs] = useState(item?.carbs?.toString() || '');
  const [fat, setFat] = useState(item?.fat?.toString() || '');
  const [workoutType, setWorkoutType] = useState(item?.workoutType || '');
  const [targetHours, setTargetHours] = useState(item?.targetHours?.toString() || '8');

  const currentType = item?.type || itemType;

  const handleSave = () => {
    const cal = calories ? parseInt(calories) : undefined;
    const pro = protein ? parseInt(protein) : undefined;
    const carb = carbs ? parseInt(carbs) : undefined;
    const f = fat ? parseInt(fat) : undefined;

    // Auto-generate subtitle from macros
    const subtitleParts: string[] = [];
    if (cal) subtitleParts.push(`${cal} cal`);
    if (pro) subtitleParts.push(`${pro}g protein`);
    const autoSubtitle = subtitleParts.join(' · ') || undefined;

    const baseItem = {
      id: item?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time,
      title,
      duration,
      type: currentType,
    };

    let updatedItem: WeeklyScheduleItem = baseItem;

    if (currentType === 'meal') {
      updatedItem = {
        ...baseItem,
        subtitle: autoSubtitle,
        calories: cal,
        protein: pro,
        carbs: carb,
        fat: f,
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
      setDuration(item?.duration || '30 min');
      setCalories(item?.calories?.toString() || '');
      setProtein(item?.protein?.toString() || '');
      setCarbs(item?.carbs?.toString() || '');
      setFat(item?.fat?.toString() || '');
      setWorkoutType(item?.workoutType || '');
      setTargetHours(item?.targetHours?.toString() || '8');
    }
  }, [visible, item]);

  const typeColor =
    currentType === 'meal'
      ? Colors.light.secondary
      : currentType === 'workout'
        ? Colors.light.primary
        : Colors.light.charts.carbs;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: typeColor }]}>
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
              <TimePickerInput label="Time" value={time} onChange={setTime} format="12h" />
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
                <View style={styles.macroRow}>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.label}>Calories</Text>
                    <TextInput
                      style={styles.input}
                      value={calories}
                      onChangeText={setCalories}
                      placeholder="380"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                  </View>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.label}>Protein (g)</Text>
                    <TextInput
                      style={styles.input}
                      value={protein}
                      onChangeText={setProtein}
                      placeholder="25"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.macroRow}>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.label}>Carbs (g)</Text>
                    <TextInput
                      style={styles.input}
                      value={carbs}
                      onChangeText={setCarbs}
                      placeholder="45"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                  </View>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.label}>Fat (g)</Text>
                    <TextInput
                      style={styles.input}
                      value={fat}
                      onChangeText={setFat}
                      placeholder="15"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                  </View>
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
    borderBottomWidth: 2,
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
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroField: {
    flex: 1,
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
