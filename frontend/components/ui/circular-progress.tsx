import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  value?: string;
  subtitle?: string;
  showValueInRing?: boolean;
}

export const CircularProgress = ({
  percentage,
  size = 60,
  strokeWidth = 6,
  color = Colors.light.primary,
  trackColor,
  label,
  value,
  subtitle,
  showValueInRing = false,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.container}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor ?? Colors.light.background}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.percentageContainer}>
          {showValueInRing && value ? (
            <Text
              style={[styles.ringValueText, { fontSize: size * 0.28 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {value}
            </Text>
          ) : (
            <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
          )}
        </View>
      </View>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{label}</Text>
          {subtitle ? (
            <Text style={styles.subtitleText}>{subtitle}</Text>
          ) : (
            value && !showValueInRing && <Text style={styles.valueText}>{value}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  percentageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  ringValueText: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  labelContainer: {
    alignItems: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 1,
  },
  subtitleText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
});
