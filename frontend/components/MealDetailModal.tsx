import type { Recipe } from '@/api/types.gen';
import { Colors } from '@/constants/theme';
import { ArrowRight, Check, Edit, X } from 'lucide-react-native';
import React from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MealData {
  time: string;
  title?: string;
  subtitle?: string;
  type: string;
  recipe?: Recipe;
  [key: string]: unknown;
}

interface MealDetailModalProps {
  visible: boolean;
  onClose: () => void;
  meal: MealData | null;
}

export const MealDetailModal = ({ visible, onClose, meal }: MealDetailModalProps) => {
  if (!meal) return null;

  const recipe = meal.recipe;
  const title = recipe?.title || meal.title || 'Meal';
  const nutrients = recipe?.nutrients;
  const ingredients = recipe?.ingredients || [];
  const sourceUrl = recipe?.source_url;
  const prepTime = recipe?.preparation_time_minutes;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.modalView}>
          <View style={styles.dragHandle} />

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Scheduled for {meal.time}
              {prepTime ? ` · ${prepTime} min prep` : ''}
            </Text>

            {/* Macros */}
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

            {/* Ingredients */}
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

            {/* Source Link */}
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

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.light.success, flex: 1 }]}
              >
                <Check size={20} color="#FFF" />
                <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.light.background }]}
              >
                <Edit size={20} color={Colors.light.text} />
                <Text style={[styles.actionButtonText, { color: Colors.light.text }]}>Modify</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.light.background }]}
                onPress={onClose}
              >
                <X size={20} color={Colors.light.error} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.light.background,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
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
