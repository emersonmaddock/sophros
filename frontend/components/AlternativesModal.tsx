import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors, Layout } from '@/constants/theme';
import type { MealRead } from '@/api/types.gen';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

type AlternativesModalProps = {
  visible: boolean;
  onClose: () => void;
  currentMealTitle: string | null;
  alternatives: MealRead[];
  onSelect: (mealId: number) => void;
};

export function AlternativesModal({
  visible,
  onClose,
  currentMealTitle,
  alternatives,
  onSelect,
}: AlternativesModalProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['80%'], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

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

  const handleSelect = (meal: MealRead) => {
    onSelect(meal.id);
    onClose();
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
    >
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Swap Meal</Text>
        {currentMealTitle && (
          <Text style={styles.current}>Current: {currentMealTitle}</Text>
        )}
        {alternatives.length === 0 ? (
          <Text style={styles.empty}>No alternatives available</Text>
        ) : (
          alternatives.map((meal) => (
            <TouchableOpacity
              key={meal.id}
              style={styles.option}
              onPress={() => handleSelect(meal)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionTitle}>{meal.title}</Text>
              <Text style={styles.optionMacros}>
                {meal.calories} cal · {meal.protein}g protein · {meal.carbohydrates}g carbs · {meal.fat}g fat
              </Text>
            </TouchableOpacity>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  current: { fontSize: 13, color: Colors.light.textMuted, marginBottom: 8 },
  empty: { fontSize: 14, color: Colors.light.textMuted, textAlign: 'center', marginTop: 20 },
  option: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    gap: 4,
  },
  optionTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  optionMacros: { fontSize: 13, color: Colors.light.textMuted },
});
