import { Colors } from '@/constants/theme';
import { ChevronDown, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  validWindow?: { start: string; end: string };
  minTime?: string;
  maxTime?: string;
};

type TimeOption = {
  label: string;
  value: string;
};

const TIME_OPTIONS: TimeOption[] = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const isPM = h >= 12;
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = isPM ? 'PM' : 'AM';

  const valueH = h.toString().padStart(2, '0');

  return {
    label: `${displayH}:${m} ${ampm}`,
    value: `${valueH}:${m}`,
  };
});

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  validWindow,
  minTime,
  maxTime,
}: TimePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const filteredOptions = TIME_OPTIONS.filter((opt) => {
    if (validWindow && validWindow.start && validWindow.end) {
      if (validWindow.start <= validWindow.end) {
        if (opt.value < validWindow.start || opt.value > validWindow.end) return false;
      } else {
        if (opt.value < validWindow.start && opt.value > validWindow.end) return false;
      }
    }
    if (minTime && opt.value < minTime) return false;
    if (maxTime && opt.value > maxTime) return false;
    return true;
  });

  // If the value matches our 24h stored format, display the friendly AM/PM version
  const selectedOption =
    TIME_OPTIONS.find((o) => o.value === value) || TIME_OPTIONS.find((o) => o.label === value);
  const displayText = selectedOption ? selectedOption.label : value || placeholder;

  return (
    <>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, !value && styles.placeholder]}>{displayText}</Text>
        <ChevronDown size={20} color={Colors.light.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { paddingBottom: insets.bottom || 24, paddingTop: 10 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={Colors.light.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
              {filteredOptions.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 20, color: Colors.light.textMuted }}>
                  No valid times available
                </Text>
              ) : (
                filteredOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.timeOption, value === opt.value && styles.timeOptionSelected]}
                    onPress={() => {
                      onChange(opt.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        value === opt.value && styles.timeOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: Colors.light.text,
  },
  placeholder: {
    color: Colors.light.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    paddingHorizontal: 16,
  },
  timeOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeOptionSelected: {
    backgroundColor: Colors.light.primary + '15',
    borderRadius: 8,
    borderBottomWidth: 0,
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  timeOptionText: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    fontWeight: '600',
    color: Colors.light.primary,
  },
});
