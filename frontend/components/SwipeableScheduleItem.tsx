import { Colors } from '@/constants/theme';
import { Check, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type Props = {
  children: React.ReactNode;
  /** True when the item is in the past and hasn't been confirmed yet */
  needsConfirmation: boolean;
  isCompleted: boolean;
  onConfirmDone: () => void;
  onConfirmMissed: () => void;
};

function LeftAction() {
  return (
    <View style={styles.leftAction}>
      <Check size={24} color="#FFF" strokeWidth={3} />
      <Text style={styles.actionLabel}>Done</Text>
    </View>
  );
}

function RightAction() {
  return (
    <View style={styles.rightAction}>
      <X size={24} color="#FFF" strokeWidth={3} />
      <Text style={styles.actionLabel}>Missed</Text>
    </View>
  );
}

export function SwipeableScheduleItem({
  children,
  needsConfirmation,
  isCompleted,
  onConfirmDone,
  onConfirmMissed,
}: Props) {
  const swipeRef = useRef<Swipeable>(null);

  if (!needsConfirmation || isCompleted) {
    return <>{children}</>;
  }

  const handleOpen = (direction: 'left' | 'right') => {
    swipeRef.current?.close();
    if (direction === 'left') {
      onConfirmDone();
    } else {
      onConfirmMissed();
    }
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={() => <LeftAction />}
      renderRightActions={() => <RightAction />}
      onSwipeableOpen={handleOpen}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  leftAction: {
    backgroundColor: Colors.light.success,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    gap: 4,
  },
  rightAction: {
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    gap: 4,
  },
  actionLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
