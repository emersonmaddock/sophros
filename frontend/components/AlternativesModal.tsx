import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors, Layout } from '@/constants/theme';
import type { MealRead } from '@/api/types.gen';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AlternativesModalProps = {
  visible: boolean;
  onClose: () => void;
  currentMealTitle: string | null;
  alternatives: MealRead[];
  onSelect: (mealId: number) => void;
  /** If set, the item being inspected is a leftover of this source's meal title. */
  leftoverSourceTitle?: string | null;
};

export function AlternativesModal({
  visible,
  onClose,
  currentMealTitle,
  alternatives,
  onSelect,
  leftoverSourceTitle,
}: AlternativesModalProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%'], []);
  const isLeftover = leftoverSourceTitle != null;

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
        {isLeftover ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>
              This is a leftover of &quot;{leftoverSourceTitle}&quot;
            </Text>
            <Text style={styles.noticeBody}>
              Leftovers follow their source meal. To change what you&apos;re eating, open the source
              meal and swap or edit it there.
            </Text>
          </View>
        ) : (
          <>
            {currentMealTitle && <Text style={styles.current}>Current: {currentMealTitle}</Text>}
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
                    {meal.calories} cal · {meal.protein}g protein · {meal.carbohydrates}g carbs ·{' '}
                    {meal.fat}g fat
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </>
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
  noticeBox: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    gap: 6,
  },
  noticeTitle: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  noticeBody: { fontSize: 13, color: Colors.light.textMuted, lineHeight: 18 },
});
