import { CircularProgress } from "@/components/ui/circular-progress";
import { Colors } from "@/constants/theme";
import React from "react";
import { StyleSheet, View } from "react-native";

interface MacroData {
    calories: { value: number | string; percentage: number; label?: string };
    protein: { value: number | string; percentage: number; label?: string };
    carbs: { value: number | string; percentage: number; label?: string };
    fats: { value: number | string; percentage: number; label?: string };
}

interface MacroNutrientsProps {
    data: MacroData;
    size?: number;
}

export function MacroNutrients({ data, size = 70 }: MacroNutrientsProps) {
    return (
        <View style={styles.container}>
            <View style={styles.item}>
                <CircularProgress
                    percentage={data.calories.percentage}
                    color={Colors.light.secondary}
                    label={data.calories.label || "Calories"}
                    value={data.calories.value.toString()}
                    size={size}
                />
            </View>
            <View style={styles.item}>
                <CircularProgress
                    percentage={data.protein.percentage}
                    color={Colors.light.primary}
                    label={data.protein.label || "Protein"}
                    value={data.protein.value.toString()}
                    size={size}
                />
            </View>
            <View style={styles.item}>
                <CircularProgress
                    percentage={data.carbs.percentage}
                    color={Colors.light.charts.carbs}
                    label={data.carbs.label || "Carbs"}
                    value={data.carbs.value.toString()}
                    size={size}
                />
            </View>
            <View style={styles.item}>
                <CircularProgress
                    percentage={data.fats.percentage}
                    color={Colors.light.charts.fats}
                    label={data.fats.label || "Fats"}
                    value={data.fats.value.toString()}
                    size={size}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        width: "100%",
    },
    item: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});
