import type { Recipe } from '@/api/types.gen';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import { ArrowRight, Edit, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MealData {
  id: string;
  time: string;
  title?: string;
  subtitle?: string;
  type: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  recipe?: Recipe;
  [key: string]: unknown;
}

interface MealDetailModalProps {
  visible: boolean;
  onClose: () => void;
  meal: MealData | null;
  onModify?: (meal: MealData) => void;
  onRemove?: (meal: MealData) => void;
}

export const MealDetailModal = ({
  visible,
  onClose,
  meal,
  onModify,
  onRemove,
}: MealDetailModalProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  useEffect(() => {
    if (visible && meal) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, meal]);

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

  if (!meal) return null;

  const recipe = meal.recipe;
  const title = recipe?.title || meal.title || 'Meal';
  const nutrients = recipe?.nutrients;
  const ingredients = recipe?.ingredients || [];
  const sourceUrl = recipe?.source_url;
  const prepTime = recipe?.preparation_time_minutes;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Scheduled for {meal.time}
          {prepTime ? ` · ${prepTime} min prep` : ''}
        </Text>

        {nutrients && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionHeader}>MACRONUTRIENTS</Text>
            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{nutrients.calories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.light.primary }]}>
                  {nutrients.protein}g
                </Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.light.charts.carbs }]}>
                  {nutrients.carbohydrates}g
                </Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.light.charts.fats }]}>
                  {nutrients.fat}g
                </Text>
                <Text style={styles.macroLabel}>Fats</Text>
              </View>
            </View>
          </View>
        )}

        {ingredients.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>INGREDIENTS</Text>
            <View style={{ marginLeft: 8 }}>
              {ingredients.map((ing, i) => (
                <Text key={i} style={styles.ingredientItem}>
                  • {ing}
                </Text>
              ))}
            </View>
          </View>
        )}

        {sourceUrl && (
          <TouchableOpacity style={styles.linkCard} onPress={() => Linking.openURL(sourceUrl)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkSubtitle}>VIEW RECIPE</Text>
              <Text style={styles.linkTitle} numberOfLines={1}>
                {new URL(sourceUrl).hostname.replace('www.', '')}
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.light.background, flex: 1 }]}
            onPress={() => {
              onModify?.(meal);
              onClose();
            }}
          >
            <Edit size={20} color={Colors.light.text} />
            <Text style={[styles.actionButtonText, { color: Colors.light.text }]}>Modify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${Colors.light.error}15` }]}
            onPress={() => {
              onRemove?.(meal);
              onClose();
            }}
          >
            <Trash2 size={20} color={Colors.light.error} />
            <Text style={[styles.actionButtonText, { color: Colors.light.error }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginBottom: 20,
  },
  sectionBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  macroLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  ingredientItem: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 24,
    marginBottom: 4,
  },
  linkCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  linkTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.primary },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: { fontSize: 15, fontWeight: '600' },
});
