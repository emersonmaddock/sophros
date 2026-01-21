import { CircularProgress } from "@/components/ui/circular-progress";
import { Colors } from "@/constants/theme";
import { ChevronRight } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ProgressBar = ({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) => (
  <View style={styles.progBarBg}>
    <View
      style={[
        styles.progBarFill,
        { width: `${percent}%`, backgroundColor: color },
      ]}
    />
  </View>
);

export default function ProfilePage() {
  const macros = [
    {
      label: "Calories",
      current: 1840,
      target: 2200,
      unit: "cal",
      color: Colors.light.secondary,
    },
    {
      label: "Protein",
      current: 78,
      target: 120,
      unit: "g",
      color: Colors.light.primary,
    },
    {
      label: "Carbs",
      current: 185,
      target: 250,
      unit: "g",
      color: Colors.light.charts.carbs,
    },
    {
      label: "Fats",
      current: 52,
      target: 65,
      unit: "g",
      color: Colors.light.charts.fats,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your health data</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.profileName}>Alex Martinez</Text>
              <Text style={styles.profileEmail}>alex.martinez@email.com</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            {[
              { label: "Age", value: "28" },
              { label: "Height", value: "5'10\"" },
              { label: "Weight", value: "165 lbs" },
            ].map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Macro Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Macronutrient Goals</Text>
          <View style={styles.goalsContainer}>
            {macros.map((goal, i) => (
              <View key={i} style={styles.card}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={styles.goalLabel}>{goal.label}</Text>
                  <Text style={styles.goalValue}>
                    {goal.current} / {goal.target} {goal.unit}
                  </Text>
                </View>
                <ProgressBar
                  percent={(goal.current / goal.target) * 100}
                  color={goal.color}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Micronutrients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Micronutrients (Today)</Text>
          <View style={styles.card}>
            <View style={styles.microGridTop}>
              <CircularProgress
                percentage={45}
                size={70}
                color={Colors.light.secondary}
                label="Vitamin D"
                value="4.5 µg"
              />
              <CircularProgress
                percentage={68}
                size={70}
                color={Colors.light.error}
                label="Iron"
                value="12.2 mg"
              />
              <CircularProgress
                percentage={75}
                size={70}
                color={Colors.light.primary}
                label="Calcium"
                value="750 mg"
              />
              <CircularProgress
                percentage={91}
                size={70}
                color={Colors.light.charts.carbs}
                label="Vitamin B12"
                value="2.3 µg"
              />
            </View>

            <View style={styles.microList}>
              {[
                {
                  label: "Vitamin C",
                  value: "82%",
                  amount: "73.8 mg",
                  color: "#F59E0B",
                },
                {
                  label: "Magnesium",
                  value: "61%",
                  amount: "244 mg",
                  color: "#10B981",
                },
                {
                  label: "Zinc",
                  value: "54%",
                  amount: "5.9 mg",
                  color: "#6366F1",
                },
                {
                  label: "Potassium",
                  value: "48%",
                  amount: "1680 mg",
                  color: Colors.light.charts.fats,
                },
              ].map((item, i) => (
                <View key={i} style={{ marginBottom: i < 3 ? 12 : 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <Text style={styles.microListLabel}>{item.label}</Text>
                    <Text style={styles.microListValue}>
                      {item.amount} ({item.value})
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: Colors.light.background,
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: item.value,
                        backgroundColor: item.color,
                        height: "100%",
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Activity Level */}
        <View
          style={[
            styles.card,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            },
          ]}
        >
          <View>
            <Text style={styles.goalLabel}>Activity Level</Text>
            <Text style={styles.statValue}>Active</Text>
          </View>
          <ChevronRight size={20} color={Colors.light.textMuted} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  profileCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 16,
  },
  goalsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  goalValue: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  progBarBg: {
    height: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  progBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  microGridTop: {
    flexDirection: "row",
    justifyContent: "space-around", // Changed from grid to space-around for 4 items
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },
  microList: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.background,
    paddingTop: 16,
  },
  microListLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.light.text,
  },
  microListValue: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
});
