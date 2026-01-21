import { MacroNutrients } from "@/components/MacroNutrients";
import { Colors, Layout, Shadows } from "@/constants/theme";
import { Award, Users } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgressPage() {
  const achievements = [
    { icon: "🎯", name: "Week Warrior", unlocked: true },
    { icon: "💪", name: "Strong Start", unlocked: true },
    { icon: "🥗", name: "Meal Master", unlocked: true },
    { icon: "🏃", name: "Cardio King", unlocked: false },
    { icon: "🌙", name: "Sleep Scholar", unlocked: false },
    { icon: "⭐", name: "Perfect Week", unlocked: false },
  ];

  const leaderboard = [
    { rank: 1, name: "Sarah Chen", streak: 45, you: false },
    { rank: 2, name: "Mike Johnson", streak: 28, you: false },
    { rank: 3, name: "You (Alex)", streak: 12, you: true },
    { rank: 4, name: "Emma Davis", streak: 9, you: false },
    { rank: 5, name: "Ryan Smith", streak: 7, you: false },
  ];

  const weeklyMacros = {
    calories: { value: "Avg 1,950", percentage: 88, label: "Calories" },
    protein: { value: "Avg 86g", percentage: 72, label: "Protein" },
    carbs: { value: "Avg 203g", percentage: 81, label: "Carbs" },
    fats: { value: "Avg 65g", percentage: 75, label: "Fats" }, // Estimated fat based on previous data
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSubtitle}>Track your health journey</Text>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <View style={styles.streakIconBox}>
              <Award size={32} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakValue}>12 Days</Text>
            </View>
          </View>
          <Text style={styles.streakFooter}>Keep it up! You're on fire 🔥</Text>
        </View>

        {/* Weekly Nutrition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week's Nutrition</Text>
          <View style={styles.card}>
            <View style={styles.nutritionCircles}>
              <MacroNutrients data={weeklyMacros} size={70} />
            </View>
            <View style={styles.nutritionGrid}>
              {[
                {
                  label: "Vitamin D",
                  value: "82%",
                  color: Colors.light.secondary,
                },
                { label: "Iron", value: "68%", color: Colors.light.error },
                { label: "Calcium", value: "75%", color: Colors.light.primary },
                {
                  label: "B12",
                  value: "91%",
                  color: Colors.light.charts.carbs,
                },
              ].map((item, i) => (
                <View key={i} style={styles.nutritionRow}>
                  <Text style={styles.nutriLabel}>{item.label}</Text>
                  <Text style={[styles.nutriValue, { color: item.color }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((badge, i) => (
              <View
                key={i}
                style={[
                  styles.achievementCard,
                  { opacity: badge.unlocked ? 1 : 0.4 },
                ]}
              >
                <Text style={{ fontSize: 32 }}>{badge.icon}</Text>
                <Text style={styles.achievementName}>{badge.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              Leaderboard
            </Text>
            <Users size={20} color={Colors.light.textMuted} />
          </View>

          <View style={styles.card}>
            {leaderboard.map((user, i) => (
              <View
                key={i}
                style={[
                  styles.leaderboardRow,
                  user.you && {
                    backgroundColor: `${Colors.light.primary}10`,
                    borderRadius: 12,
                  },
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    user.rank <= 3
                      ? { backgroundColor: Colors.light.secondary }
                      : { backgroundColor: Colors.light.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      user.rank <= 3
                        ? { color: "#FFF" }
                        : { color: Colors.light.text },
                    ]}
                  >
                    {user.rank}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.userName, user.you && { fontWeight: "700" }]}
                  >
                    {user.name}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Award size={16} color={Colors.light.secondary} />
                  <Text style={styles.userStreak}>{user.streak}</Text>
                </View>
              </View>
            ))}
          </View>
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
    paddingBottom: 120,
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
  streakCard: {
    backgroundColor: Colors.light.success,
    borderRadius: Layout.cardRadius,
    padding: 24,
    marginBottom: 24,
    ...Shadows.card,
  },
  streakIconBox: {
    width: 56,
    height: 56,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  streakLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 36,
  },
  streakFooter: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
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
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 20,
    paddingVertical: 16, // Matching template padding
    ...Shadows.card,
  },
  nutritionCircles: {
    marginBottom: 20,
  },
  nutritionGrid: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.background,
    paddingTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "48%",
  },
  nutriLabel: { fontSize: 13, color: Colors.light.textMuted },
  nutriValue: { fontSize: 14, fontWeight: "600" },

  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: "31%", // roughly 1/3 minus gap
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Shadows.card,
  },
  achievementName: {
    fontSize: 11,
    textAlign: "center",
    color: Colors.light.text,
    fontWeight: "500",
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "700",
  },
  userName: {
    fontSize: 14,
    color: Colors.light.text,
  },
  userStreak: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
});
