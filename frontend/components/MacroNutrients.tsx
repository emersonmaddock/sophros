import { CircularProgress } from '@/components/ui/circular-progress';
import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MacroItem {
  value: number | string;
  percentage: number;
  label?: string;
  subtitle?: string;
}

interface MacroData {
  calories: MacroItem;
  protein: MacroItem;
  carbs: MacroItem;
  fats: MacroItem;
}

interface MacroNutrientsProps {
  data: MacroData;
  size?: number;
}

export function MacroNutrients({ data, size = 70 }: MacroNutrientsProps) {
  const hasSubtitles = !!(
    data.calories.subtitle ||
    data.protein.subtitle ||
    data.carbs.subtitle ||
    data.fats.subtitle
  );

  return (
    <View style={styles.container}>
      {[
        { macro: data.calories, color: Colors.light.secondary, name: 'Calories' },
        { macro: data.protein, color: Colors.light.primary, name: 'Protein' },
        { macro: data.carbs, color: Colors.light.charts.carbs, name: 'Carbs' },
        { macro: data.fats, color: Colors.light.charts.fats, name: 'Fat' },
      ].map(({ macro, color, name }) => (
        <View key={name} style={styles.item}>
          <CircularProgress
            percentage={macro.percentage}
            color={color}
            label={macro.label || name}
            value={macro.value.toString()}
            subtitle={macro.subtitle}
            showValueInRing={hasSubtitles}
            size={size}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
