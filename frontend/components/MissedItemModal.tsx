import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

type Props = {
  visible: boolean;
  itemTitle: string;
  itemType: 'meal' | 'workout' | 'sleep';
  onSave: (actual: string | null) => void;
  onClose: () => void;
};

export function MissedItemModal({ visible, itemTitle, itemType, onSave, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%'], []);
  const [text, setText] = useState('');
  const [nothingSelected, setNothingSelected] = useState(false);

  useEffect(() => {
    if (visible) {
      setText('');
      setNothingSelected(false);
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

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

  const handleNothingToggle = () => {
    setNothingSelected((prev) => !prev);
    if (!nothingSelected) setText('');
  };

  const handleSave = () => {
    if (nothingSelected) {
      onSave(null);
    } else {
      onSave(text.trim() || null);
    }
    onClose();
  };

  const typeLabel = itemType === 'meal' ? 'meal' : itemType === 'workout' ? 'workout' : 'sleep';
  const placeholder =
    itemType === 'meal'
      ? 'e.g., Had a salad instead'
      : itemType === 'workout'
        ? 'e.g., Went for a walk instead'
        : 'e.g., Only slept 5 hours';

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Missed {typeLabel}?</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {itemTitle}
          </Text>
        </View>

        <Text style={styles.question}>What did you do instead?</Text>

        <TouchableOpacity
          style={[styles.nothingChip, nothingSelected && styles.nothingChipSelected]}
          onPress={handleNothingToggle}
          activeOpacity={0.7}
        >
          <Text style={[styles.nothingText, nothingSelected && styles.nothingTextSelected]}>
            Nothing — I skipped it
          </Text>
        </TouchableOpacity>

        {!nothingSelected && (
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  nothingChip: {
    borderWidth: 1.5,
    borderColor: Colors.light.textMuted,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  nothingChipSelected: {
    borderColor: Colors.light.error,
    backgroundColor: `${Colors.light.error}18`,
  },
  nothingText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontWeight: '500',
  },
  nothingTextSelected: {
    color: Colors.light.error,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
