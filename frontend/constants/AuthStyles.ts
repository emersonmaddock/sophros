import { StyleSheet } from 'react-native';
import { Colors, Layout, Shadows } from './theme';

export const styles = StyleSheet.create({
  formContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 24,
    ...Shadows.card,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: Colors.light.background,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    ...Shadows.card,
  },
  buttonText: {
    color: Colors.light.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 8,
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  error: {
    color: Colors.light.error,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
