import { Colors, Layout } from '@/constants/theme';
import type { WeeklyScheduleItem } from '@/types/schedule';
import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AlternativesModalProps = {
  visible: boolean;
  onClose: () => void;
  item: WeeklyScheduleItem | null;
  alternatives: WeeklyScheduleItem[];
  onSelect: (alternative: WeeklyScheduleItem) => void;
};

export function AlternativesModal({
  visible,
  onClose,
  item,
  alternatives,
  onSelect,
}: AlternativesModalProps) {
  if (!item) return null;

  const handleSelect = (alternative: WeeklyScheduleItem) => {
    onSelect(alternative);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Swap Item</Text>
              <Text style={styles.headerSubtitle}>Choose an alternative for {item.time}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Current Item */}
          <View style={styles.currentSection}>
            <Text style={styles.sectionTitle}>Current</Text>
            <View style={styles.currentCard}>
              <Text style={styles.currentTitle}>{item.title}</Text>
              {item.subtitle && <Text style={styles.currentSubtitle}>{item.subtitle}</Text>}
            </View>
          </View>

          {/* Alternatives */}
          <ScrollView style={styles.alternativesContainer}>
            <Text style={styles.sectionTitle}>Alternatives</Text>
            {alternatives.map((alt, index) => (
              <TouchableOpacity
                key={alt.id || index}
                style={styles.alternativeCard}
                onPress={() => handleSelect(alt)}
              >
                <View style={styles.alternativeContent}>
                  <Text style={styles.alternativeTitle}>{alt.title}</Text>
                  {alt.subtitle && <Text style={styles.alternativeSubtitle}>{alt.subtitle}</Text>}
                  <Text style={styles.alternativeDuration}>{alt.duration}</Text>
                </View>
                <View style={styles.selectButton}>
                  <Text style={styles.selectButtonText}>Select</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentSection: {
    padding: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  currentCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  currentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  currentSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  alternativesContainer: {
    paddingHorizontal: 20,
  },
  alternativeCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Layout.cardRadius,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  alternativeSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  alternativeDuration: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  selectButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
