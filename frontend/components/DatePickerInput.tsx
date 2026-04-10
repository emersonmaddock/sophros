import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useRef, useState } from 'react';
import {
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
  minimumDate?: Date;
  error?: string;
}

function parseValue(value: string | null | undefined): Date {
  if (!value || value.trim() === '') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatOutput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(value: string): string {
  if (!value) return 'Select a date';
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Select a date';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function DatePickerInput({
  label,
  value,
  onChange,
  style,
  minimumDate,
  error,
}: DatePickerInputProps) {
  const currentDate = parseValue(value);
  const [showAndroid, setShowAndroid] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const open = () => {
    if (Platform.OS === 'android') {
      setShowAndroid(true);
      return;
    }
    bottomSheetRef.current?.present();
  };

  const clear = () => {
    onChange('');
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
      {error && <Text style={styles.errorText}>{error}</Text>}

      <BottomSheetModal ref={bottomSheetRef} enableDynamicSizing backdropComponent={renderBackdrop}>
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.pickerWrapper}>
            <DateTimePicker
              value={currentDate}
              mode="date"
              display="spinner"
              textColor="black"
              themeVariant="light"
              minimumDate={minimumDate}
              onChange={(_, date) => {
                if (date) onChange(formatOutput(date));
              }}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={(_, date) => {
            setShowAndroid(false);
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
  sheetContent: {
    paddingBottom: 30,
  },
  pickerWrapper: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.error,
    marginTop: 4,
  },
});
