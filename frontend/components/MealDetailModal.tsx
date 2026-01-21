import { Colors } from "@/constants/theme";
import { ArrowRight, Check, Edit, Info, X } from "lucide-react-native";
import React from "react";
import {
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/* Simple helper for colored bars */
const ProgressBar = ({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) => (
  <View
    style={{
      height: 6,
      backgroundColor: Colors.light.background,
      borderRadius: 3,
      overflow: "hidden",
    }}
  >
    <View
      style={{ width: `${percent}%`, backgroundColor: color, height: "100%" }}
    />
  </View>
);

interface MealDetailModalProps {
  visible: boolean;
  onClose: () => void;
  meal: any; // Using any for now to match template speed, but should be typed ideally
}

export const MealDetailModal = ({
  visible,
  onClose,
  meal,
}: MealDetailModalProps) => {
  if (!meal) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.modalView}>
          <View style={styles.dragHandle} />

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.title}>Greek Yogurt Bowl</Text>
            <Text style={styles.subtitle}>Scheduled for {meal.time}</Text>

            {/* Why This Meal */}
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: `${Colors.light.primary}10`,
                  borderLeftColor: Colors.light.primary,
                },
              ]}
            >
              <View style={styles.infoHeader}>
                <Info size={18} color={Colors.light.primary} />
                <Text
                  style={[styles.infoTitle, { color: Colors.light.primary }]}
                >
                  WHY THIS MEAL
                </Text>
              </View>
              <Text style={styles.infoText}>
                You asked for quick, savory breakfasts and to avoid heavy foods
                after 9 PM. This bowl gives you 28g of protein with mostly
                complex carbs.
              </Text>
            </View>

            {/* Macros */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeader}>MACRONUTRIENTS</Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>380</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text
                    style={[styles.macroValue, { color: Colors.light.primary }]}
                  >
                    28g
                  </Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text
                    style={[
                      styles.macroValue,
                      { color: Colors.light.charts.carbs },
                    ]}
                  >
                    42g
                  </Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text
                    style={[
                      styles.macroValue,
                      { color: Colors.light.charts.fats },
                    ]}
                  >
                    12g
                  </Text>
                  <Text style={styles.macroLabel}>Fats</Text>
                </View>
              </View>
            </View>

            {/* Micronutrients */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>
                KEY MICRONUTRIENTS
              </Text>
              <View style={{ gap: 10 }}>
                {[
                  {
                    name: "Vitamin D",
                    amount: "2.4 µg",
                    daily: 45,
                    color: Colors.light.secondary,
                  },
                  {
                    name: "Calcium",
                    amount: "320 mg",
                    daily: 32,
                    color: Colors.light.primary,
                  },
                  {
                    name: "Iron",
                    amount: "1.8 mg",
                    daily: 22,
                    color: Colors.light.error,
                  },
                  {
                    name: "Vitamin B12",
                    amount: "1.2 µg",
                    daily: 50,
                    color: Colors.light.charts.carbs,
                  },
                ].map((micro, i) => (
                  <View key={i}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={styles.microName}>{micro.name}</Text>
                      <Text style={styles.microValue}>
                        {micro.amount} ({micro.daily}% DV)
                      </Text>
                    </View>
                    <ProgressBar percent={micro.daily} color={micro.color} />
                  </View>
                ))}
              </View>
            </View>

            {/* Ingredients */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>
                INGREDIENTS
              </Text>
              <View style={{ marginLeft: 8 }}>
                {[
                  "Greek yogurt (200g)",
                  "Mixed berries (100g)",
                  "Granola (30g)",
                  "Honey (15g)",
                  "Chia seeds (10g)",
                ].map((ing, i) => (
                  <Text key={i} style={styles.ingredientItem}>
                    • {ing}
                  </Text>
                ))}
              </View>
            </View>

            {/* Source Link */}
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() =>
                Linking.openURL(
                  "https://www.healthyrecipes.com/greek-yogurt-bowl",
                )
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.linkSubtitle}>VIEW RECIPE</Text>
                <Text style={styles.linkTitle}>healthyrecipes.com</Text>
              </View>
              <ArrowRight size={20} color={Colors.light.primary} />
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: Colors.light.success, flex: 1 },
                ]}
              >
                <Check size={20} color="#FFF" />
                <Text style={[styles.actionButtonText, { color: "#FFF" }]}>
                  Completed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: Colors.light.background },
                ]}
              >
                <Edit size={20} color={Colors.light.text} />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: Colors.light.text },
                  ]}
                >
                  Modify
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: Colors.light.background },
                ]}
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
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
    shadowColor: "#000",
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
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginBottom: 20,
  },
  infoBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 22,
  },
  sectionBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textMuted,
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  macroItem: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
  },
  macroLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  microName: { fontSize: 13, color: Colors.light.text },
  microValue: { fontSize: 13, color: Colors.light.textMuted },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  linkTitle: { fontSize: 14, fontWeight: "600", color: Colors.light.primary },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonText: { fontSize: 15, fontWeight: "600" },
});
