import { useThemeColor } from '@/hooks/use-theme-color';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface ProgressIndicatorProps {
  totalSteps: number;
  currentStep: number;
  style?: ViewStyle;
}

export function ProgressIndicator({ totalSteps, currentStep, style }: ProgressIndicatorProps) {
  const primaryColor = useThemeColor({}, 'tint');
  const inactiveColor = useThemeColor({ light: '#e0e0e0', dark: '#333333' }, 'background');

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index < currentStep ? primaryColor : inactiveColor,
              transform: [{ scale: index === currentStep - 1 ? 1.2 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
