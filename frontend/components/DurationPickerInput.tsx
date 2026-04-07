import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DurationPickerInputProps {
  label: string;
  /** Duration string like "30 min", "1 hr 15 min", etc. */
  value: string;
  onChange: (v: string) => void;
}

/** Parse "30 min", "1 hr 15 min", "45", etc. into total minutes. */
function parseDuration(value: string): number {
  if (!value) return 30;
  const hrMatch = value.match(/(\d+)\s*hr/i);
  const minMatch = value.match(/(\d+)\s*min/i);
  const hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  if (hours || mins) return hours * 60 + mins;
  const raw = parseInt(value, 10);
  return isNaN(raw) ? 30 : raw;
}

/** Convert total minutes to display string. */
function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/**
 * For countdown mode, the DateTimePicker value represents duration.
 * We create a Date at local midnight + duration to avoid timezone issues.
 */
function durationToDate(mins: number): Date {
  const d = new Date();
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

/** Extract duration minutes from a Date, relative to local midnight. */
function dateToMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function DurationPickerInput({ label, value, onChange }: DurationPickerInputProps) {
  const totalMinutes = parseDuration(value);
  const [tempMinutes, setTempMinutes] = useState(totalMinutes);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['45%'], []);

  const open = () => {
    setTempMinutes(parseDuration(value));
    bottomSheetRef.current?.present();
  };

  const confirm = () => {
    bottomSheetRef.current?.dismiss();
    onChange(formatDuration(Math.max(5, tempMinutes)));
  };

  const cancel = () => bottomSheetRef.current?.dismiss();

  const handleCountdownChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setTempMinutes(dateToMinutes(date));
    }
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
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={open} activeOpacity={0.7}>
        <Text style={styles.inputText}>{formatDuration(totalMinutes)}</Text>
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
      >
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={cancel}>
            <Text style={styles.pickerHeaderCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Duration</Text>
          <TouchableOpacity onPress={confirm}>
            <Text style={styles.pickerHeaderDone}>Done</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={durationToDate(tempMinutes)}
            mode="countdown"
            display="spinner"
            textColor="black"
            themeVariant="light"
            minuteInterval={5}
            onChange={handleCountdownChange}
          />
        ) : (
          <View style={styles.androidOptions}>
            {[15, 20, 30, 45, 60, 90, 120].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.androidChip, tempMinutes === m && styles.androidChipActive]}
                onPress={() => setTempMinutes(m)}
              >
                <Text
                  style={[
                    styles.androidChipText,
                    tempMinutes === m && styles.androidChipTextActive,
                  ]}
                >
                  {formatDuration(m)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BottomSheetModal>
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
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
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
  androidOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  androidChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  androidChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  androidChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  androidChipTextActive: {
    color: '#FFFFFF',
  },
});
