import { Colors } from '@/constants/theme';
import type { ItemType, WeeklyScheduleItem } from '@/types/schedule';
import { TimePickerInput } from '@/components/TimePickerInput';
import { Dumbbell, Moon, UtensilsCrossed, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  saving?: boolean;
};

const TYPE_CONFIG = {
  meal: {
    label: 'Meal',
    subtitle: 'Nutrition & schedule',
    color: Colors.light.secondary,
    Icon: UtensilsCrossed,
  },
  workout: {
    label: 'Workout',
    subtitle: 'Exercise details',
    color: Colors.light.primary,
    Icon: Dumbbell,
  },
  sleep: {
    label: 'Sleep',
    subtitle: 'Rest & recovery',
    color: Colors.light.charts.carbs,
    Icon: Moon,
  },
} as const;

const DURATION_OPTIONS = ['15 min', '20 min', '30 min', '45 min', '60 min', '90 min'];

export function EditItemModal({
  visible,
  onClose,
  item,
  onSave,
  mode,
  itemType = 'meal',
  saving = false,
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
  const [touched, setTouched] = useState(false);

  const currentType = item?.type || itemType;
  const config = TYPE_CONFIG[currentType];

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (currentType === 'meal') {
      if (calories && (isNaN(Number(calories)) || Number(calories) < 0))
        e.calories = 'Must be 0 or more';
      if (protein && (isNaN(Number(protein)) || Number(protein) < 0))
        e.protein = 'Must be 0 or more';
      if (carbs && (isNaN(Number(carbs)) || Number(carbs) < 0)) e.carbs = 'Must be 0 or more';
      if (fat && (isNaN(Number(fat)) || Number(fat) < 0)) e.fat = 'Must be 0 or more';
    }
    if (currentType === 'sleep' && targetHours) {
      const h = parseFloat(targetHours);
      if (isNaN(h) || h < 1 || h > 24) e.targetHours = 'Must be 1–24';
    }
    return e;
  }, [title, calories, protein, carbs, fat, targetHours, currentType]);

  const isValid = Object.keys(errors).length === 0;

  const handleSave = () => {
    setTouched(true);
    if (!isValid) return;

    const cal = calories ? parseInt(calories) : undefined;
    const pro = protein ? parseInt(protein) : undefined;
    const carb = carbs ? parseInt(carbs) : undefined;
    const f = fat ? parseInt(fat) : undefined;

    const subtitleParts: string[] = [];
    if (cal) subtitleParts.push(`${cal} cal`);
    if (pro) subtitleParts.push(`${pro}g protein`);
    const autoSubtitle = subtitleParts.join(' · ') || undefined;

    const baseItem: WeeklyScheduleItem = {
      id: item?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time,
      title,
      duration,
      type: currentType,
    };

    if (currentType === 'meal') {
      baseItem.subtitle = autoSubtitle;
      baseItem.calories = cal;
      baseItem.protein = pro;
      baseItem.carbs = carb;
      baseItem.fat = f;
    } else if (currentType === 'workout') {
      baseItem.workoutType = workoutType || title;
    } else if (currentType === 'sleep') {
      baseItem.targetHours = targetHours ? parseFloat(targetHours) : 8;
    }

    onSave(baseItem);
    onClose();
  };

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
      setTouched(false);
    }
  }, [visible, item]);

  const renderError = (field: string) => {
    if (!touched || !errors[field]) return null;
    return <Text style={styles.errorText}>{errors[field]}</Text>;
  };

  const inputStyle = (field: string) => [
    styles.input,
    touched && errors[field] && styles.inputError,
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.headerStrip, { backgroundColor: config.color }]} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
                <config.Icon size={20} color={config.color} />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {mode === 'edit' ? 'Edit' : 'Add'} {config.label}
                </Text>
                <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <TimePickerInput label="Time" value={time} onChange={setTime} format="12h" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={inputStyle('title')}
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
              {renderError('title')}
            </View>

            {currentType === 'meal' && (
              <>
                <Text style={styles.sectionLabel}>Nutrition</Text>
                <View style={styles.macroRow}>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.macroLabel}>Calories</Text>
                    <TextInput
                      style={inputStyle('calories')}
                      value={calories}
                      onChangeText={setCalories}
                      placeholder="380"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                    {renderError('calories')}
                  </View>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.macroLabel}>Protein (g)</Text>
                    <TextInput
                      style={inputStyle('protein')}
                      value={protein}
                      onChangeText={setProtein}
                      placeholder="25"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                    {renderError('protein')}
                  </View>
                </View>
                <View style={styles.macroRow}>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.macroLabel}>Carbs (g)</Text>
                    <TextInput
                      style={inputStyle('carbs')}
                      value={carbs}
                      onChangeText={setCarbs}
                      placeholder="45"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                    {renderError('carbs')}
                  </View>
                  <View style={[styles.field, styles.macroField]}>
                    <Text style={styles.macroLabel}>Fat (g)</Text>
                    <TextInput
                      style={inputStyle('fat')}
                      value={fat}
                      onChangeText={setFat}
                      placeholder="15"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.light.textMuted}
                    />
                    {renderError('fat')}
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
                  style={inputStyle('targetHours')}
                  value={targetHours}
                  onChangeText={setTargetHours}
                  placeholder="e.g., 8"
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.light.textMuted}
                />
                {renderError('targetHours')}
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.durationChip, duration === opt && styles.durationChipActive]}
                    onPress={() => setDuration(opt)}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        duration === opt && styles.durationChipTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (saving || (touched && !isValid)) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
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
    overflow: 'hidden',
  },
  headerStrip: {
    height: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 1,
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    marginTop: 4,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginBottom: 6,
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
  inputError: {
    borderColor: Colors.light.error,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 12,
    marginTop: 4,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroField: {
    flex: 1,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  durationChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  durationChipTextActive: {
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
