import { Colors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface DatePickerInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  style?: StyleProp<ViewStyle>;
}

function parseValue(value: string): Date {
  if (!value) return new Date();
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatOutput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function displayDate(value: string): string {
  if (!value) return 'Select a date';
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Select a date';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function DatePickerInput({ label, value, onChange, style }: DatePickerInputProps) {
  const currentDate = parseValue(value);
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(currentDate);

  const open = () => {
    setTempDate(parseValue(value));
    setShowPicker(true);
  };

  const confirm = () => {
    setShowPicker(false);
    onChange(formatOutput(tempDate));
  };

  const cancel = () => {
    setShowPicker(false);
  };

  const clear = () => {
    onChange('');
  };

  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.input} onPress={open} activeOpacity={0.7}>
          <Text style={value ? styles.inputText : styles.inputPlaceholder}>
            {displayDate(value)}
          </Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity style={styles.clearButton} onPress={clear} activeOpacity={0.7}>
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {Platform.OS === 'ios' && showPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={cancel}>
                  <Text style={styles.pickerHeaderCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirm}>
                  <Text style={styles.pickerHeaderDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => setTempDate(date ?? tempDate)}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) onChange(formatOutput(date));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  inputPlaceholder: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: Colors.light.textMuted,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerHeaderCancel: {
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  pickerHeaderDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
});
