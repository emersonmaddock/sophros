import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import type { ExerciseCategory } from '@/api/types.gen';
import type { ItemType, WeeklyScheduleItem } from '@/types/schedule';
import { DurationPickerInput } from '@/components/DurationPickerInput';
import { TimePickerInput } from '@/components/TimePickerInput';
import { Dumbbell, Moon, UtensilsCrossed } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const EXERCISE_CATEGORIES: readonly ExerciseCategory[] = ['Cardio', 'Weight Lifting'];

type EditItemModalProps = {
  visible: boolean;
  onClose: () => void;
  item: WeeklyScheduleItem | null;
  onSave: (updatedItem: WeeklyScheduleItem) => void;
  mode: 'edit' | 'add';
  itemType?: ItemType;
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
  const [exerciseCategory, setExerciseCategory] = useState<ExerciseCategory | null>(
    item?.exerciseCategory ?? null
  );
  const [targetHours, setTargetHours] = useState(item?.targetHours?.toString() || '8');
  const [touched, setTouched] = useState(false);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  const currentType = item?.type || itemType;
  const config = TYPE_CONFIG[currentType];

  // For meal+edit, the only editable thing is time. Title/nutrition are not rendered.
  const isMealEdit = currentType === 'meal' && mode === 'edit';
  const isMealAdd = currentType === 'meal' && mode === 'add';
  // Workouts expose only the fields the API actually supports: time, duration, and exercise_category.
  const isWorkout = currentType === 'workout';

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!isMealEdit && !isWorkout && !title.trim()) e.title = 'Title is required';
    if (isMealAdd) {
      const checkInt = (key: string, raw: string, label: string) => {
        if (!raw.trim()) {
          e[key] = `${label} is required`;
          return;
        }
        const n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 0) e[key] = `${label} must be a non-negative number`;
      };
      checkInt('calories', calories, 'Calories');
      checkInt('protein', protein, 'Protein');
      checkInt('carbs', carbs, 'Carbs');
      checkInt('fat', fat, 'Fat');

      const durMins = parseInt(duration, 10);
      if (!Number.isFinite(durMins) || durMins <= 0) {
        e.duration = 'Duration must be greater than 0';
      }
    }
    if (currentType === 'sleep' && targetHours) {
      const h = parseFloat(targetHours);
      if (isNaN(h) || h < 1 || h > 24) e.targetHours = 'Must be 1–24';
    }
    return e;
  }, [
    title,
    targetHours,
    currentType,
    isMealAdd,
    isMealEdit,
    isWorkout,
    calories,
    protein,
    carbs,
    fat,
    duration,
  ]);

  const isValid = Object.keys(errors).length === 0;

  useEffect(() => {
    if (visible) {
      setTime(item?.time || '7:00 AM');
      setTitle(item?.title || '');
      setDuration(item?.duration || '30 min');
      setCalories(item?.calories?.toString() || '');
      setProtein(item?.protein?.toString() || '');
      setCarbs(item?.carbs?.toString() || '');
      setFat(item?.fat?.toString() || '');
      setExerciseCategory(item?.exerciseCategory ?? null);
      setTargetHours(item?.targetHours?.toString() || '8');
      setTouched(false);
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, item]);

  const handleSave = () => {
    setTouched(true);
    if (!isValid) return;

    const baseItem: WeeklyScheduleItem = {
      id: item?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time,
      title: isMealEdit || isWorkout ? item?.title || (isWorkout ? 'Workout' : '') : title,
      duration: isMealEdit ? item?.duration || duration : duration,
      type: currentType,
    };

    if (isMealAdd) {
      baseItem.calories = parseInt(calories, 10);
      baseItem.protein = parseInt(protein, 10);
      baseItem.carbs = parseInt(carbs, 10);
      baseItem.fat = parseInt(fat, 10);
    } else if (isWorkout) {
      baseItem.exerciseCategory = exerciseCategory;
    } else if (currentType === 'sleep') {
      baseItem.targetHours = targetHours ? parseFloat(targetHours) : 8;
    }

    onSave(baseItem);
    onClose();
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const renderError = (field: string) => {
    if (!touched || !errors[field]) return null;
    return <Text style={styles.errorText}>{errors[field]}</Text>;
  };

  const inputStyle = (field: string) => [
    styles.input,
    touched && errors[field] && styles.inputError,
  ];

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View style={[styles.headerStrip, { backgroundColor: config.color }]} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
            <config.Icon size={20} color={config.color} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {mode === 'edit' ? (currentType === 'meal' ? 'Reschedule' : 'Edit') : 'Add'}{' '}
              {config.label}
            </Text>
            <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
          </View>
        </View>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.form}>
        <View style={styles.field}>
          <TimePickerInput label="Time" value={time} onChange={setTime} format="12h" />
        </View>

        {!isMealEdit && !isWorkout && (
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={inputStyle('title')}
              value={title}
              onChangeText={setTitle}
              placeholder={currentType === 'meal' ? 'e.g., Greek Yogurt Bowl' : 'Sleep'}
              placeholderTextColor={Colors.light.textMuted}
            />
            {renderError('title')}
          </View>
        )}

        {isMealAdd && (
          <>
            <Text style={styles.sectionLabel}>Nutrition</Text>
            <View style={styles.macroRow}>
              <View style={[styles.field, styles.macroField]}>
                <Text style={styles.macroLabel}>Calories</Text>
                <TextInput
                  style={inputStyle('calories')}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="Calories"
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
                  placeholder="Protein"
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
                  placeholder="Carbs"
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
                  placeholder="Fat"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.light.textMuted}
                />
                {renderError('fat')}
              </View>
            </View>
          </>
        )}

        {isWorkout && (
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.segmented}>
              {EXERCISE_CATEGORIES.map((cat) => {
                const selected = exerciseCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setExerciseCategory(cat)}
                    style={[styles.segmentedOption, selected && styles.segmentedOptionSelected]}
                  >
                    <Text
                      style={[
                        styles.segmentedOptionText,
                        selected && styles.segmentedOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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

        {!isMealEdit && (
          <View style={styles.field}>
            <DurationPickerInput label="Duration" value={duration} onChange={setDuration} />
            {renderError('duration')}
          </View>
        )}
      </BottomSheetScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, touched && !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  headerStrip: { height: 4 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  headerSubtitle: { fontSize: 13, color: Colors.light.textMuted, marginTop: 1 },
  form: { padding: 20 },
  field: { marginBottom: 16 },
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
  inputError: { borderColor: Colors.light.error },
  errorText: { color: Colors.light.error, fontSize: 12, marginTop: 4 },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroField: { flex: 1 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  segmentedOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  segmentedOptionTextSelected: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
