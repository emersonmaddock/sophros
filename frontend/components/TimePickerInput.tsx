import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { timeToMins } from '@/utils/sleep-validation';

interface TimePickerInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  format?: '24h' | '12h';
  style?: StyleProp<ViewStyle>;
  minTime?: string;
  maxTime?: string;
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
  minTime,
  maxTime,
}: TimePickerInputProps) {
  const currentDate = parseValue(value, format);
  const [showAndroid, setShowAndroid] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const open = () => {
    if (Platform.OS === 'android') {
      setShowAndroid(true);
      return;
    }
    bottomSheetRef.current?.present();
  };

  const minDate = React.useMemo(
    () => (minTime ? parseValue(minTime, format) : undefined),
    [minTime, format]
  );
  const maxDate = React.useMemo(
    () => (maxTime ? parseValue(maxTime, format) : undefined),
    [maxTime, format]
  );

  const handleChange = (_: unknown, date?: Date) => {
    if (!date) return;
    const result = formatOutput(date, format);

    if (minTime || maxTime) {
      const resultMins = timeToMins(result);
      if (minTime && resultMins < timeToMins(minTime)) {
        Alert.alert('Invalid Time', `Time must be after wake up (${minTime})`);
        return;
      }
      if (maxTime && resultMins > timeToMins(maxTime)) {
        Alert.alert('Invalid Time', `Time must be before sleep (${maxTime})`);
        return;
      }
    }

    onChange(result);
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={open} activeOpacity={0.7}>
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {value ? displayTime(currentDate) : 'Select a time'}
        </Text>
      </TouchableOpacity>

      <BottomSheetModal ref={bottomSheetRef} enableDynamicSizing backdropComponent={renderBackdrop}>
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.pickerWrapper}>
            <DateTimePicker
              value={currentDate}
              mode="time"
              display="spinner"
              textColor="black"
              themeVariant="light"
              minimumDate={minDate}
              maximumDate={maxDate}
              onChange={handleChange}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={currentDate}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(_, date) => {
            setShowAndroid(false);
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
  sheetContent: {
    paddingBottom: 30,
  },
  pickerWrapper: {
    alignItems: 'center',
  },
});
