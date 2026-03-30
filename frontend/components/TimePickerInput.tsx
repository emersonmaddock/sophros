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

interface TimePickerInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  format?: '24h' | '12h';
  style?: StyleProp<ViewStyle>;
}

function parseValue(value: string, format: '24h' | '12h'): Date {
  const base = new Date();
  base.setSeconds(0, 0);

  if (!value) return base;

  if (format === '24h') {
    const parts = value.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        base.setHours(h, m);
        return base;
      }
    }
  } else {
    // "h:mm AM/PM"
    const match = value.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridiem = match[3].toUpperCase();
      if (meridiem === 'PM' && h !== 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      base.setHours(h, m);
      return base;
    }
  }

  return base;
}

function formatOutput(date: Date, format: '24h' | '12h'): string {
  if (format === '24h') {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function displayTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function TimePickerInput({
  label,
  value,
  onChange,
  format = '24h',
  style,
}: TimePickerInputProps) {
  const currentDate = parseValue(value, format);
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(currentDate);

  const open = () => {
    setTempDate(parseValue(value, format));
    setShowPicker(true);
  };

  const confirm = () => {
    setShowPicker(false);
    onChange(formatOutput(tempDate, format));
  };

  const cancel = () => {
    setShowPicker(false);
  };

  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={open} activeOpacity={0.7}>
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {value ? displayTime(currentDate) : 'Select a time'}
        </Text>
      </TouchableOpacity>

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
                mode="time"
                display="spinner"
                textColor="black"
                themeVariant="light"
                onChange={(_, date) => setTempDate(date ?? tempDate)}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) onChange(formatOutput(date, format));
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
  input: {
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
