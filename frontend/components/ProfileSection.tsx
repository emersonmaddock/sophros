import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProfileSectionProps {
  number: number;
  title: string;
  children: React.ReactNode;
  visible?: boolean;
}

export function ProfileSection({ number, title, children, visible = true }: ProfileSectionProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{number}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    gap: 12,
  },
});
