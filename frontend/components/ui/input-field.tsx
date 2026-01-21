import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export function InputField({ label, error, helperText, style, ...props }: InputFieldProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const defaultBorderColor = '#e0e0e0';
  const borderColor = error ? '#dc3545' : defaultBorderColor;

  return (
    <ThemedView style={styles.container}>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
      <TextInput
        style={[styles.input, { color: textColor, backgroundColor, borderColor }, style]}
        placeholderTextColor={placeholderColor}
        {...props}
      />
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      {helperText && !error && <ThemedText style={styles.helperText}>{helperText}</ThemedText>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  error: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
});
