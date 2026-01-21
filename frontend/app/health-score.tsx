import { Colors, Layout, Shadows } from "@/constants/theme";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Info } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircularProgress } from "../components/ui/circular-progress";

export default function HealthScorePage() {
    const router = useRouter();

    const scoreComponents = [
        {
            label: "Nutrition",
            score: 92,
            weight: "40%",
            color: Colors.light.secondary,
            description: "Based on calorie and macro adherence",
            status: "Excellent",
        },
        {
            label: "Exercise",
            score: 85,
            weight: "30%",
            color: Colors.light.primary,
            description: "Workout frequency and intensity",
            status: "Good",
        },
        {
            label: "Sleep",
            score: 84,
            weight: "30%",
            color: Colors.light.charts.carbs,
            description: "Duration and quality of sleep",
            status: "Good",
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Health Score</Text>
                    <TouchableOpacity>
                        <Info size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                </View>

                {/* Main Score */}
                <View style={styles.heroCard}>
                    <View style={styles.heroContent}>
                        <CircularProgress
                            percentage={87}
                            size={160}
                            color={Colors.light.primary}
                            label="Total Score"
                            value="87"
                        // Assuming CircularProgress can take larger size and custom styling
                        />
                    </View>
                    <Text style={styles.heroDescription}>
                        You're in the top 15% of users this week! Keep up the great work.
                    </Text>
                </View>

                {/* Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Score Breakdown</Text>
                    <View style={styles.breakdownContainer}>
                        {scoreComponents.map((item, i) => (
                            <View key={i} style={styles.scoreRow}>
                                <View style={[styles.scoreIcon, { backgroundColor: `${item.color}15` }]}>
                                    <Text style={[styles.scoreIconText, { color: item.color }]}>
                                        {item.label[0]}
                                    </Text>
                                </View>
                                <View style={styles.scoreInfo}>
                                    <View style={styles.scoreHeader}>
                                        <Text style={styles.scoreLabel}>{item.label}</Text>
                                        <Text style={[styles.scoreStatus, { color: item.color }]}>{item.status}</Text>
                                    </View>
                                    <Text style={styles.scoreDesc}>{item.description}</Text>
                                    <View style={styles.scoreMeta}>
                                        <Text style={styles.scoreWeight}>Weight: {item.weight}</Text>
                                        <Text style={styles.scoreValue}>{item.score}/100</Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${item.score}%`, backgroundColor: item.color }]} />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Info size={20} color={Colors.light.textMuted} />
                    <Text style={styles.infoText}>
                        Your health score is calculated daily based on your activity, nutrition, and sleep data.
                    </Text>
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: Colors.light.text,
    },
    heroCard: {
        alignItems: "center",
        marginBottom: 32,
    },
    heroContent: {
        marginBottom: 16,
    },
    heroDescription: {
        fontSize: 16,
        color: Colors.light.textMuted,
        textAlign: "center",
        paddingHorizontal: 32,
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
    breakdownContainer: {
        backgroundColor: Colors.light.surface,
        borderRadius: Layout.cardRadius,
        padding: 20,
        ...Shadows.card,
        gap: 24,
    },
    scoreRow: {
        flexDirection: "row",
        gap: 16,
    },
    scoreIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    scoreIconText: {
        fontSize: 20,
        fontWeight: "700",
    },
    scoreInfo: {
        flex: 1,
        gap: 4,
    },
    scoreHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    scoreLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.text,
    },
    scoreStatus: {
        fontSize: 12,
        fontWeight: "600",
    },
    scoreDesc: {
        fontSize: 13,
        color: Colors.light.textMuted,
        marginBottom: 4,
    },
    scoreMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    scoreWeight: {
        fontSize: 11,
        color: Colors.light.textMuted,
    },
    scoreValue: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.light.text,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: Colors.light.background,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 3,
    },
    infoBox: {
        flexDirection: "row",
        gap: 12,
        padding: 16,
        backgroundColor: `${Colors.light.primary}10`,
        borderRadius: Layout.cardRadius,
        alignItems: "center",
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.light.text,
        lineHeight: 20,
    },
});
