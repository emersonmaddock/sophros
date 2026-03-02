import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function ChipSelect({ options, selected, onToggle }: ChipSelectProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onToggle(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: Colors.light.surface,
  },
  chipSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}12`,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textMuted,
  },
  chipTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
});
