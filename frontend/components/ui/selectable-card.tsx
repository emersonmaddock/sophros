import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface SelectableCardProps {
  title: string;
  description?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function SelectableCard({
  title,
  description,
  icon,
  selected,
  onPress,
  style,
}: SelectableCardProps) {
  const primaryColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');
  const borderColor = selected ? primaryColor : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor, borderColor, borderWidth: 2 },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ThemedView style={styles.content}>
        {icon && (
          <ThemedText style={styles.icon}>{icon}</ThemedText>
        )}
        <ThemedView style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {description && (
            <ThemedText style={styles.description}>{description}</ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
  },
});
